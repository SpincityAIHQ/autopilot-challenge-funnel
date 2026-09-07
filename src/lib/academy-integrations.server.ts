import { timingSafeEqual } from "node:crypto";
import { academyDb } from "./academy.server";
import { reconcileShopifyOrder } from "./academy-commerce.server";
import { LESSONS, formatTime, tierAllows, watchSummary, type Interval } from "./academy";
import { redeemedGrants } from "./academy-access.server";
import type { User } from "@supabase/supabase-js";
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
  const db = academyDb();
  let orders = 0,
    delivered = 0,
    unknown = 0;
  const receipts = await db
    .from("academy_commerce_receipts")
    .select("event_id,order_id")
    .eq("status", "pending")
    .order("received_at")
    .limit(20);
  if (receipts.error) throw new Error("DATABASE_UNAVAILABLE");
  for (const orderId of new Set((receipts.data ?? []).map((x) => x.order_id))) {
    try {
      await reconcileShopifyOrder(orderId);
      const ids = receipts.data!.filter((x) => x.order_id === orderId).map((x) => x.event_id);
      const saved = await db
        .from("academy_commerce_receipts")
        .update({ status: "reconciled", processed_at: new Date().toISOString() })
        .in("event_id", ids);
      if (saved.error) throw saved.error;
      orders++;
    } catch {
      /* Durable receipt remains pending. Owner sees it in the integration queue. */
    }
  }
  const { deliverAccessCodes } = await import("./academy-delivery.server");
  const accessDelivery = await deliverAccessCodes();
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
  const claimed = await db.rpc("academy_claim_outbox", { p_limit: 10 });
  if (claimed.error) throw new Error("QUEUE_UNAVAILABLE");
  for (const row of claimed.data ?? []) {
    let status = "unknown";
    try {
      const profile = await db
        .from("academy_profiles")
        .select("email,timezone,marketing_consent,phone,sms_consent")
        .eq("user_id", row.user_id)
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
            .eq("user_id", row.user_id)
            .eq("lesson_id", "free-webinar")
            .maybeSingle(),
        ]);
        if (purchases.error || progress.error) throw new Error("ELIGIBILITY_UNAVAILABLE");
        let learningPayload: Record<string, unknown> = {};
        let learningAllowed = true;
        if (row.name.startsWith("learning_")) {
          const lessonId = String(row.payload?.lessonId ?? "");
          const p = await db
            .from("academy_progress")
            .select(
              "lesson_id,workbook_status,quiz_score,quiz_total,updated_at,content_version,media_version,intervals,duration,position",
            )
            .eq("user_id", row.user_id)
            .eq("lesson_id", lessonId)
            .maybeSingle();
          if (p.error) throw p.error;
          const lesson = LESSONS.find((l) => l.id === lessonId);
          const grants = await redeemedGrants({
            id: row.user_id,
            email: profile.data.email,
          } as User);
          // A replaced recording or revised lesson cancels the reminder queued against the old version.
          const versionMatches =
            row.name === "learning_dropoff"
              ? p.data?.media_version === row.payload?.mediaVersion
              : p.data?.content_version === row.payload?.contentVersion;
          learningAllowed =
            process.env.ACADEMY_LEARNING_NUDGES_ENABLED === "true" &&
            Boolean(lesson && tierAllows(grants, lesson.tier)) &&
            versionMatches &&
            learningDeliveryEligible(row.name, p.data as DeliveryProgress | null);
          const watch = p.data?.duration
            ? watchSummary({
                intervals: (p.data.intervals ?? []) as Interval[],
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
        else if (
          row.name === "webinar_not_started" &&
          ((progress.data?.intervals ?? []).length > 0 || (purchases.data ?? []).length > 0)
        )
          status = "cancelled";
        else {
          const response = await fetch(endpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id },
            body: JSON.stringify({
              event_id: row.id,
              event_name: row.name,
              user_id: row.user_id,
              email: profile.data.email,
              timezone: profile.data.timezone,
              marketing_consent: true,
              consent_version: "academy-marketing-2026-09-06",
              occurred_at: row.created_at,
              source: "ai-autopilot-academy",
              ...learningPayload,
            }),
            signal: AbortSignal.timeout(8000),
          });
          status = response.ok ? "delivered" : "unknown";
        }
      }
    } catch {
      /* Delivery may have happened: reconcile instead of blindly retrying. */
    }
    const saved = await db
      .from("academy_outbox")
      .update({ status, completed_at: new Date().toISOString() })
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
