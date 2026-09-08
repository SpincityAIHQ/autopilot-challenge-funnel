import { academyDb } from "./academy.server";
import { accessCode, codeHash, accessCodeReady } from "./academy-access.server";
export function accessDeliveryResponseStatus(
  response: Pick<Response, "ok" | "status">,
  attempts: number,
) {
  if (response.ok) return "accepted";
  if ((response.status === 429 || response.status >= 500) && attempts < 5) return "retry";
  return "unknown";
}
export function accessDeliveryFailureStatus(
  attempted: boolean,
  previouslyAttempted: boolean,
  attempts: number,
) {
  if (attempted) return "unknown";
  if (attempts < 5) return "retry";
  return previouslyAttempted ? "unknown" : "failed";
}
export async function deliverAccessCodes() {
  const secret = process.env.ACADEMY_ACCESS_CODE_SECRET;
  const endpoint = process.env.ACADEMY_GHL_ACCESS_WEBHOOK_URL;
  let allowed = false;
  try {
    const u = new URL(endpoint ?? "");
    allowed =
      u.protocol === "https:" &&
      u.hostname === "services.leadconnectorhq.com" &&
      u.pathname.startsWith("/hooks/");
  } catch {}
  if (
    !accessCodeReady() ||
    process.env.ACADEMY_ACCESS_EMAIL_ENABLED !== "true" ||
    !secret ||
    secret.length < 32 ||
    !allowed
  )
    return { accessEmail: "not_enabled", accepted: 0, unknown: 0 };
  const db = academyDb(),
    claimed = await db.rpc("academy_claim_access_deliveries", { p_limit: 1 });
  if (claimed.error) throw new Error("ACCESS_QUEUE_UNAVAILABLE");
  let accepted = 0,
    unknown = 0;
  for (const row of claimed.data ?? []) {
    const lease = row.locked_at;
    if (!lease) throw new Error("ACCESS_QUEUE_LEASE_MISSING");
    let status = "unknown";
    let attempted = false;
    try {
      const code = await db
        .from("academy_access_codes")
        .select("*")
        .eq("id", row.code_id)
        .maybeSingle();
      if (code.error) throw code.error;
      const c = code.data;
      if (
        !c ||
        c.generation !== row.generation ||
        c.redeemed_at ||
        Date.parse(c.expires_at) <= Date.now()
      )
        status = "cancelled";
      else {
        const { reconcileShopifyOrder } = await import("./academy-commerce.server");
        await reconcileShopifyOrder(c.order_id);
        const [g, o, fresh] = await Promise.all([
          db
            .from("academy_grants")
            .select("active,email,tier")
            .eq("order_id", c.order_id)
            .eq("line_id", c.line_id)
            .maybeSingle(),
          db.from("academy_orders").select("needs_review").eq("order_id", c.order_id).maybeSingle(),
          db
            .from("academy_access_codes")
            .select("generation,code_hash,email,redeemed_at,expires_at")
            .eq("id", c.id)
            .maybeSingle(),
        ]);
        if (g.error || o.error || fresh.error) throw new Error("PURCHASE_CHECK_UNAVAILABLE");
        if (
          !g.data?.active ||
          g.data.email !== c.email ||
          g.data.tier !== c.tier ||
          !o.data ||
          o.data.needs_review ||
          !fresh.data ||
          fresh.data.generation !== row.generation ||
          fresh.data.code_hash !== c.code_hash ||
          fresh.data.email !== c.email ||
          fresh.data.redeemed_at ||
          Date.parse(fresh.data.expires_at) <= Date.now()
        )
          status = "cancelled";
        else {
          const value = accessCode(c.id, c.generation, secret);
          if (codeHash(value) !== c.code_hash) throw new Error("ACCESS_KEY_MISMATCH");
          attempted = true;
          const r = await fetch(endpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({
              event_id: row.id,
              event_name: "purchase_access_code",
              purpose: "transactional",
              email: c.email,
              tier: c.tier,
              access_code: value,
              code_expires_at: c.expires_at,
              access_hours: c.access_hours,
              access_starts: "redemption",
              terms_version: c.terms_version,
              redeem_url: "https://aiautopilotsummit.com/redeem",
            }),
          });
          status = accessDeliveryResponseStatus(r, row.attempts);
        }
      }
    } catch {
      status = accessDeliveryFailureStatus(attempted, Boolean(row.send_attempted_at), row.attempts);
    }
    const retrying = status === "pending" || status === "retry";
    const sendAttemptedAt = row.send_attempted_at ?? (attempted ? new Date().toISOString() : null);
    const saved = await db
      .from("academy_access_deliveries")
      .update({
        status,
        send_attempted_at: sendAttemptedAt,
        completed_at: retrying ? null : new Date().toISOString(),
        due_at: new Date(Date.now() + Math.min(2 ** row.attempts, 60) * 60000).toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "processing")
      .eq("locked_at", lease)
      .select("id");
    if (saved.error || saved.data.length !== 1) throw new Error("ACCESS_RECEIPT_NOT_SAVED");
    if (status === "accepted") accepted++;
    if (status === "unknown") unknown++;
  }
  return { accessEmail: "enabled", accepted, unknown };
}
