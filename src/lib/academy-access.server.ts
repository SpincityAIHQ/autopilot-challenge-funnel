import { createHash, createHmac, randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { academyDb, AcademyError } from "./academy.server";
import { isStaffEmail, STAFF_TIERS } from "./academy-staff.server";
import { importedTicketGrants } from "./academy-imported-tickets.server";

export function accessCode(id: string, generation: string, secret: string) {
  if (secret.length < 32) throw new Error("ACCESS_SECRET_REQUIRED");
  const value = createHmac("sha256", secret)
    .update(`academy-access:v1:${id}:${generation}`)
    .digest("hex")
    .slice(0, 32)
    .toUpperCase();
  return `SPIN-${value.match(/.{8}/g)!.join("-")}`;
}
export function codeHash(value: string) {
  const normal = value.toUpperCase().replace(/[\s-]/g, "");
  if (!/^SPIN[A-F0-9]{32}$/.test(normal))
    throw new AcademyError("Check the code and use the email from your Shopify order.");
  return createHash("sha256").update(normal).digest("hex");
}
export function accessCodeReady() {
  return (
    process.env.ACADEMY_ACCESS_CODES_ENABLED === "true" &&
    process.env.ACADEMY_PAID_ACCESS_ENABLED === "true" &&
    (process.env.ACADEMY_ACCESS_CODE_SECRET?.length ?? 0) >= 32
  );
}
function termsFor(tier: string): { hours: number; version: string } | null {
  try {
    const t = JSON.parse(process.env.ACADEMY_ACCESS_TERMS_JSON || "{}")[tier];
    if (
      t?.starts !== "redemption" ||
      !Number.isInteger(t.hours) ||
      t.hours < 1 ||
      t.hours > 87600 ||
      typeof t.version !== "string" ||
      !t.version.trim()
    )
      return null;
    return { hours: t.hours, version: t.version.slice(0, 100) };
  } catch {
    return null;
  }
}
export async function ensureOrderCodes(orderId: string) {
  if (!accessCodeReady()) return;
  const db = academyDb();
  const { data: grants, error } = await db
    .from("academy_grants")
    .select("line_id,tier")
    .eq("order_id", orderId)
    .eq("active", true);
  if (error) throw new Error("CODE_ISSUANCE_UNAVAILABLE");
  for (const grant of grants ?? []) {
    const terms = termsFor(grant.tier);
    if (!terms) continue;
    const prior = await db
      .from("academy_access_codes")
      .select("id")
      .eq("order_id", orderId)
      .eq("line_id", grant.line_id)
      .maybeSingle();
    if (prior.error) throw new Error("CODE_ISSUANCE_UNAVAILABLE");
    const id = prior.data?.id ?? randomUUID(),
      generation = randomUUID();
    const hash = codeHash(accessCode(id, generation, process.env.ACADEMY_ACCESS_CODE_SECRET!));
    const r = await db.rpc("academy_issue_access_code", {
      p_id: id,
      p_generation: generation,
      p_order: orderId,
      p_line: grant.line_id,
      p_hash: hash,
      p_hours: terms.hours,
      p_terms: terms.version,
    });
    if (r.error) throw new Error("CODE_ISSUANCE_UNAVAILABLE");
  }
}
export async function redeemAccess(user: User, value: string) {
  if (!accessCodeReady())
    throw new AcademyError(
      "Code activation is being connected. Your Shopify order remains with the team.",
      503,
    );
  const hash = codeHash(value),
    db = academyDb();
  const c = await db
    .from("academy_access_codes")
    .select("order_id,email")
    .eq("code_hash", hash)
    .maybeSingle();
  if (c.error) throw new AcademyError("Access could not be checked. Try again shortly.", 503);
  const email = user.email!.trim().toLowerCase();
  if (!c.data || c.data.email !== email)
    throw new AcademyError("Check the code and use the email from your Shopify order.");
  const { reconcileShopifyOrder } = await import("./academy-commerce.server");
  await reconcileShopifyOrder(c.data.order_id);
  const r = await db.rpc("academy_redeem_access_code", {
    p_user: user.id,
    p_email: email,
    p_hash: hash,
  });
  if (r.error) throw new AcademyError("Access could not be saved. Try the same code again.", 503);
  if (!r.data)
    throw new AcademyError("This code is unavailable. Check your order email or contact the team.");
  return r.data as { tier: string; accessUntil: string };
}
export async function requestAccessCode(user: User) {
  if (!accessCodeReady())
    throw new AcademyError(
      "Access-code delivery is being connected. Contact the team with your order number.",
      503,
    );
  const db = academyDb();
  const rows = await db
    .from("academy_grants")
    .select("order_id")
    .eq("email", user.email!.toLowerCase())
    .eq("active", true)
    .limit(20);
  if (rows.error) throw new AcademyError("Please try again shortly.", 503);
  const { reconcileShopifyOrder } = await import("./academy-commerce.server");
  for (const id of [...new Set((rows.data ?? []).map((r) => r.order_id))].slice(0, 5))
    await reconcileShopifyOrder(id);
  return {
    ok: true,
    message:
      "Eligible purchases are checked for an access email. Check your inbox and spam folder. Contact the team if it has not arrived; repeated requests do not create extra access.",
  };
}
export async function redeemedGrants(user: User, forceRefresh = false) {
  // Owner review access: server-only allowlist, verified user email, no purchase.
  if (isStaffEmail(user.email)) return [...STAFF_TIERS];
  const imported = await importedTicketGrants(user.id);
  if (process.env.ACADEMY_PAID_ACCESS_ENABLED !== "true") return imported;
  const db = academyDb(),
    now = new Date().toISOString();
  const codes = await db
    .from("academy_access_codes")
    .select("order_id,line_id,tier,email")
    .eq("redeemed_by", user.id)
    .gt("access_until", now);
  if (codes.error) throw new AcademyError("Course access could not be verified.", 503);
  if (!codes.data?.length) return imported;
  const ids = [...new Set(codes.data.map((c) => c.order_id))];
  const orders = await db
    .from("academy_orders")
    .select("order_id,updated_at,needs_review")
    .in("order_id", ids);
  if (orders.error) throw new AcademyError("Course access could not be verified.", 503);
  const stale = (orders.data ?? []).filter(
    (o) => forceRefresh || Date.now() - Date.parse(o.updated_at) > 300000,
  );
  if (stale.length) {
    const { reconcileShopifyOrder } = await import("./academy-commerce.server");
    for (const o of stale) await reconcileShopifyOrder(o.order_id);
  }
  const [grants, states] = await Promise.all([
    db.from("academy_grants").select("order_id,line_id,tier,email,active").in("order_id", ids),
    db.from("academy_orders").select("order_id,needs_review").in("order_id", ids),
  ]);
  if (grants.error || states.error)
    throw new AcademyError("Course access could not be verified.", 503);
  const redeemed = codes.data
    .filter(
      (c) =>
        states.data?.some((o) => o.order_id === c.order_id && !o.needs_review) &&
        grants.data?.some(
          (g) =>
            g.order_id === c.order_id &&
            g.line_id === c.line_id &&
            g.active &&
            g.email === c.email &&
            g.tier === c.tier,
        ),
    )
    .map((c) => c.tier);
  return [...new Set([...imported, ...redeemed])];
}

