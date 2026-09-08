import { timingSafeEqual } from "node:crypto";
import { academyDb } from "./academy.server";
import { reconcileShopifyOrder } from "./academy-commerce.server";
import { LESSONS, formatTime, tierAllows, watchSummary, type Interval } from "./academy";
import { redeemedGrants } from "./academy-access.server";
import type { User } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
export type DeliveryProgress = {
  workbook_status: string;
  quiz_score: number | null;
  quiz_total: number | null;
  updated_at: string;
  intervals?: Interval[];
  duration?: number;
  position?: number;
  lesson_id?: string;
};
type ClaimedCommerceReceipt = {
  event_id: string;
  order_id: string;
  attempts: number;
  locked_at: string | null;
};
type IntegrationLane = "commerce" | "access" | "ghl";
function jsonObject(value: Json): { [key: string]: Json | undefined } | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function validatedIntervals(value: Json): { valid: boolean; intervals: Interval[] } {
  if (!Array.isArray(value)) return { valid: false, intervals: [] };
  const intervals = value.filter(
    (part): part is [number, number] =>
      Array.isArray(part) &&
      part.length === 2 &&
      typeof part[0] === "number" &&
      Number.isFinite(part[0]) &&
      typeof part[1] === "number" &&
      Number.isFinite(part[1]) &&
      part[0] >= 0 &&
      part[1] >= part[0],
  );
  return { valid: intervals.length === value.length, intervals };
}
async function integrationLane(request: Request): Promise<IntegrationLane | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const lane = (body as { lane?: unknown }).lane;
  return ["commerce", "access", "ghl"].includes(String(lane)) ? (lane as IntegrationLane) : null;
}
/**
 * Re-checked at delivery time so a learner who improved never receives a stale
 * nudge. Session replays only qualify for the drop-off reminder.
 */
export function learningDeliveryEligible(name: string, p: DeliveryProgress | null) {
  if (!p) return false;
  const isSession = LESSONS.find((l) => l.id === p.lesson_id)?.kind === "session";
  if (name === "learning_dropoff") {
    if (!p.duration) return false;
    const w = watchSummary({
      intervals: p.intervals ?? [],
      duration: p.duration,
      position: p.position ?? 0,
    });
    return w.coverage >= 5 && w.coverage < 90 && Date.now() - Date.parse(p.updated_at) >= 86400000;
  }
  if (isSession) return false;
  if (name === "learning_feedback") return p.workbook_status === "needs_revision";
  if (name === "learning_approved") return p.workbook_status === "approved";
  if (name === "learning_practice")
    return p.quiz_score !== null && Boolean(p.quiz_total) && p.quiz_score / p.quiz_total! < 0.8;
  if (name === "learning_stalled")
    return p.workbook_status === "draft" && Date.now() - Date.parse(p.updated_at) >= 3 * 86400000;
  return false;
}
export function ghlDeliveryStatus(response: Pick<Response, "ok" | "status">, attempts: number) {
  if (response.ok) return "delivered";
  if ((response.status === 429 || response.status >= 500) && attempts < 3) return "retry";
  return "unknown";
}
function authorized(request: Request) {
  const expected = process.env.ACADEMY_SCHEDULER_SECRET;
  const value = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(expected),
    b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function processAcademyIntegrations(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const lane = await integrationLane(request);
  if (!lane) return new Response("Invalid integration lane", { status: 400 });
  const db = academyDb();
  let orders = 0,
    delivered = 0,
    unknown = 0;
  if (lane === "commerce") {
    // One order leaves room inside the 20-second cron request for its bounded
    // Shopify call, database writes, lease finalization, and response.
    const receipts = await db.rpc("academy_claim_commerce_receipts", { p_limit: 1 });
    if (receipts.error) throw new Error("DATABASE_UNAVAILABLE");
    const receiptRows = (receipts.data ?? []) as ClaimedCommerceReceipt[];
    for (const orderId of new Set(receiptRows.map((row) => row.order_id))) {
      const rows = receiptRows.filter((row) => row.order_id === orderId);
      const ids = rows.map((x) => x.event_id);
      const lease = rows[0]?.locked_at;
      if (!lease) continue;
      try {
        await reconcileShopifyOrder(orderId);
        // The Admin API snapshot is current as of this fetch, so it subsumes
        // older queued webhooks for the same order. Never sweep a receipt that
        // arrived after this worker acquired its lease.
        const coalesced = await db
          .from("academy_commerce_receipts")
          .update({
            status: "reconciled",
            processed_at: new Date().toISOString(),
            locked_at: null,
            last_error: null,
          })
          .eq("order_id", orderId)
          .in("status", ["pending", "retry"])
          .lte("received_at", lease);
        if (coalesced.error) throw new Error("COMMERCE_RECEIPT_COALESCE_FAILED");
        const saved = await db
          .from("academy_commerce_receipts")
          .update({
            status: "reconciled",
            processed_at: new Date().toISOString(),
            locked_at: null,
            last_error: null,
          })
          .in("event_id", ids)
          .eq("status", "processing")
          .eq("locked_at", lease)
          .select("event_id");
        if (saved.error || saved.data.length !== ids.length)
          throw new Error("COMMERCE_RECEIPT_LEASE_LOST");
        orders++;
      } catch {
        // Each webhook keeps its own retry budget. A fifth-attempt historical
        // event must never dead-letter a fresh refund/cancellation receipt.
        for (const row of rows) {
          if (!row.locked_at) continue;
          const terminal = row.attempts >= 5;
          const saved = await db
            .from("academy_commerce_receipts")
            .update({
              status: terminal ? "failed" : "retry",
              due_at: new Date(
                Date.now() + Math.min(2 ** Math.max(row.attempts, 1), 60) * 60000,
              ).toISOString(),
              locked_at: null,
              processed_at: terminal ? new Date().toISOString() : null,
              last_error: "reconciliation_failed",
            })
            .eq("event_id", row.event_id)
            .eq("status", "processing")
            .eq("locked_at", row.locked_at)
            .select("event_id");
          if (saved.error) throw new Error("COMMERCE_RECEIPT_NOT_SAVED");
        }
      }
    }
    return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  }
  if (lane === "access") {
    const { deliverAccessCodes } = await import("./academy-delivery.server");
    const accessDelivery = await deliverAccessCodes();
    return Response.json({ accessDelivery }, { headers: { "Cache-Control": "no-store" } });
  }
  const accessDelivery = { accessEmail: "skipped", accepted: 0, unknown: 0 };
  if (process.env.ACADEMY_LEARNING_NUDGES_ENABLED === "true") {
    const queued = await db.rpc("academy_queue_learning_nudges");
    if (queued.error) throw new Error("LEARNING_QUEUE_UNAVAILABLE");
  }
  const endpoint = process.env.ACADEMY_GHL_WEBHOOK_URL;
  let allowed = false;
  try {
    const url = new URL(endpoint ?? "");
    allowed =
      url.protocol === "https:" &&
      url.hostname === "services.leadconnectorhq.com" &&
      url.pathname.startsWith("/hooks/");
  } catch {
    /* Not configured. */
  }
  if (process.env.ACADEMY_GHL_ENABLED !== "true" || !allowed)
    return Response.json(
      { orders, delivered, accessDelivery, ghl: "not_enabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  // One delivery leaves room for eligibility reads and finalization after a
  // bounded five-second GHL request.
  const claimed = await db.rpc("academy_claim_outbox", { p_limit: 1 });
  if (claimed.error) throw new Error("QUEUE_UNAVAILABLE");
  for (const row of claimed.data ?? []) {
    let status = "unknown";
    const payload = jsonObject(row.payload);
    try {
      if (row.name === "training_waitlist_joined") {
        const email = typeof payload?.email === "string" ? payload.email : "";
        const fullName = typeof payload?.fullName === "string" ? payload.fullName : "";
        if (!email || !email.includes("@")) status = "cancelled";
        else {
          const response = await fetch(endpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id },
            body: JSON.stringify({
              event_id: row.id,
              event_name: row.name,
              purpose: "training_access_request",
              email,
              full_name: fullName,
              phone: null,
              sms_consent: false,
              marketing_consent: payload?.marketingConsent === true,
              occurred_at: row.created_at,
              source: "ai-autopilot-academy",
              attribution: payload?.attribution ?? {},
            }),
            signal: AbortSignal.timeout(5000),
          });
          status = ghlDeliveryStatus(response, row.attempts);
        }
      } else if (!row.user_id) status = "cancelled";
      else {
        const userId = row.user_id;
        const profile = await db
          .from("academy_profiles")
          .select("email,timezone,marketing_consent,phone,sms_consent")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile.error) throw profile.error;
        if (!profile.data?.marketing_consent) status = "cancelled";
        else {
          const [purchases, progress] = await Promise.all([
            db
              .from("academy_grants")
              .select("tier")
              .eq("email", profile.data.email)
              .eq("active", true),
            db
              .from("academy_progress")
              .select("intervals")
              .eq("user_id", userId)
              .eq("lesson_id", "free-webinar")
              .maybeSingle(),
          ]);
          if (purchases.error || progress.error) throw new Error("ELIGIBILITY_UNAVAILABLE");
          const webinarIntervals = progress.data
            ? validatedIntervals(progress.data.intervals)
            : { valid: true, intervals: [] };
          let learningPayload: Record<string, unknown> = {};
          let learningAllowed = true;
          if (row.name.startsWith("learning_")) {
            const lessonId = typeof payload?.lessonId === "string" ? payload.lessonId : "";
            const p = await db
              .from("academy_progress")
              .select(
                "lesson_id,workbook_status,quiz_score,quiz_total,updated_at,content_version,media_version,intervals,duration,position",
              )
              .eq("user_id", userId)
              .eq("lesson_id", lessonId)
              .maybeSingle();
            if (p.error) throw p.error;
            const lesson = LESSONS.find((l) => l.id === lessonId);
            const grants = await redeemedGrants({
              id: userId,
              email: profile.data.email,
            } as User);
            // A replaced recording or revised lesson cancels the reminder queued against the old version.
            const versionMatches =
              row.name === "learning_dropoff"
                ? p.data?.media_version === payload?.mediaVersion
                : p.data?.content_version === payload?.contentVersion;
            const parsedIntervals = p.data
              ? validatedIntervals(p.data.intervals)
              : { valid: true, intervals: [] };
            const deliveryProgress: DeliveryProgress | null =
              p.data && parsedIntervals.valid
                ? { ...p.data, intervals: parsedIntervals.intervals }
                : null;
            learningAllowed =
              process.env.ACADEMY_LEARNING_NUDGES_ENABLED === "true" &&
              Boolean(lesson && tierAllows(grants, lesson.tier)) &&
              versionMatches &&
              learningDeliveryEligible(row.name, deliveryProgress);
            const watch = p.data?.duration
              ? watchSummary({
                  intervals: parsedIntervals.intervals,
                  duration: p.data.duration,
                  position: p.data.position ?? 0,
                })
              : null;
            learningPayload = {
              assistant: grants.includes("accelerator") ? "AI Spin" : "Thoth",
              lesson_id: lessonId,
              lesson_title: lesson?.title,
              lesson_stage: lesson?.stage,
              quiz_score: p.data?.quiz_score,
              quiz_total: p.data?.quiz_total,
              workbook_status: p.data?.workbook_status,
              watched_percent: watch?.coverage ?? 0,
              stopped_at: watch?.dropOffAt === null || !watch ? null : formatTime(watch.dropOffAt),
              resume_seconds: watch?.dropOffAt ?? null,
              lesson_url: `https://aiautopilotsummit.com${lessonId === "free-webinar" ? "/class" : `/lesson/${encodeURIComponent(lessonId)}`}`,
            };
          }
          if (!learningAllowed) status = "cancelled";
          else if (row.name === "webinar_not_started" && !webinarIntervals.valid)
            throw new Error("INVALID_PROGRESS_INTERVALS");
          else if (
            row.name === "webinar_not_started" &&
            (webinarIntervals.intervals.length > 0 || (purchases.data ?? []).length > 0)
          )
            status = "cancelled";
          else {
            const response = await fetch(endpoint!, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id },
              body: JSON.stringify({
                event_id: row.id,
                event_name: row.name,
                user_id: userId,
                email: profile.data.email,
                phone: profile.data.sms_consent ? profile.data.phone : null,
                // The workflow must only text a contact when this is true.
                sms_consent: Boolean(profile.data.sms_consent),
                timezone: profile.data.timezone,
                marketing_consent: true,
                consent_version: "academy-marketing-2026-09-06",

                occurred_at: row.created_at,
                source: "ai-autopilot-academy",
                ...learningPayload,
              }),
              signal: AbortSignal.timeout(5000),
            });
            status = ghlDeliveryStatus(response, row.attempts);
          }
        }
      }
    } catch {
      /* Delivery may have happened: reconcile instead of blindly retrying. */
    }
    const retrying = status === "retry";
    const saved = await db
      .from("academy_outbox")
      .update({
        status,
        completed_at: retrying ? null : new Date().toISOString(),
        ...(retrying
          ? {
              due_at: new Date(
                Date.now() + Math.min(2 ** Math.max(row.attempts, 1), 30) * 60000,
              ).toISOString(),
            }
          : {}),
      })
      .eq("id", row.id)
      .eq("status", "processing");
    if (saved.error) throw new Error("QUEUE_RECEIPT_NOT_SAVED");
    if (status === "delivered") delivered++;
    if (status === "unknown") unknown++;
  }
  return Response.json(
    { orders, delivered, unknown, accessDelivery },
    { headers: { "Cache-Control": "no-store" } },
  );
}
