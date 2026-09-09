import { academyDb } from "./academy.server";
import { composeAccessCodeMessage } from "./academy-messages";
import { accessCode, codeHash, accessCodeReady } from "./academy-access.server";
export async function deliverAccessCodes() {
  const secret = process.env.ACADEMY_ACCESS_CODE_SECRET;
  const endpoint = process.env.ACADEMY_GHL_ACCESS_WEBHOOK_URL || process.env.ACADEMY_GHL_WEBHOOK_URL;
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
    claimed = await db.rpc("academy_claim_access_deliveries", { p_limit: 10 });
  if (claimed.error) throw new Error("ACCESS_QUEUE_UNAVAILABLE");
  let accepted = 0,
    unknown = 0;
  for (const row of claimed.data ?? []) {
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
          db.from("academy_orders").select("needs_review,financial_status").eq("order_id", c.order_id).maybeSingle(),
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
          const profile = await db.from("academy_profiles").select("user_id,email,phone,sms_consent,marketing_consent,timezone").eq("email", c.email).maybeSingle();
          if (profile.error) throw new Error("CUSTOMER_PREFERENCES_UNAVAILABLE");
          // A distinct outbox event and idempotency key keep SMS retries independent
          // from this purchase email. The sender rechecks consent and purchase state.
          if (profile.data?.sms_consent && profile.data.phone) {
            const sms = await db.from("academy_outbox").upsert({
              dedup_key: `purchase-access-sms:${c.id}:${c.generation}`,
              user_id: profile.data.user_id, name: "purchase_access_sms",
              payload: { codeId: c.id, generation: c.generation, purpose: "transactional", channel: "sms" },
            }, { onConflict: "dedup_key", ignoreDuplicates: true });
            if (sms.error) throw new Error("PURCHASE_SMS_NOT_QUEUED");
          }
          const message = composeAccessCodeMessage(c.tier, value, c.expires_at);
          attempted = true;
          const r = await fetch(endpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id, "Idempotency-Key": row.id },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              event_id: row.id,
              event_name: "purchase_access_code",
              purpose: "transactional", intent: "purchase_access_code", suppress_sales: true,
              channel: "email", send_email: true, send_sms: false, send_voice: false, voice_call_allowed: false,
              purchase_verified: true, financial_status: o.data.financial_status,
              order_id: c.order_id, line_id: c.line_id, customer_lifecycle: "customer",
              user_id: profile.data?.user_id ?? null,
              marketing_consent: Boolean(profile.data?.marketing_consent), sms_consent: Boolean(profile.data?.sms_consent),
              timezone: profile.data?.timezone ?? null,
              ...message,
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
          status = r.ok ? "accepted" : "unknown";
        }
      }
    } catch {
      status = attempted ? "unknown" : row.attempts >= 5 ? "failed" : "pending";
    }
    const saved = await db
      .from("academy_access_deliveries")
      .update({
        status,
        completed_at: status === "pending" ? null : new Date().toISOString(),
        due_at: new Date(Date.now() + Math.min(2 ** row.attempts, 60) * 60000).toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "processing");
    if (saved.error) throw new Error("ACCESS_RECEIPT_NOT_SAVED");
    if (status === "accepted") accepted++;
    if (status === "unknown") unknown++;
  }
  return { accessEmail: "enabled", accepted, unknown };
}

