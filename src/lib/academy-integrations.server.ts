import { timingSafeEqual } from "node:crypto";
import { academyDb } from "./academy.server";
import { reconcileShopifyOrder } from "./academy-commerce.server";
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
      { orders, delivered, ghl: "not_enabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  const claimed = await db.rpc("academy_claim_outbox", { p_limit: 10 });
  if (claimed.error) throw new Error("QUEUE_UNAVAILABLE");
  for (const row of claimed.data ?? []) {
    let status = "unknown";
    try {
      const profile = await db
        .from("academy_profiles")
        .select("email,timezone,marketing_consent")
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
        if (
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
    { orders, delivered, unknown },
    { headers: { "Cache-Control": "no-store" } },
  );
}
