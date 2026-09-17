import { createHash, timingSafeEqual } from "node:crypto";
import { createGhlClient } from "./academy-ghl-client.server";
import { readLimitedBody } from "./academy-http.server";

type Json = Record<string, unknown>;
const identifier = /^[a-zA-Z0-9_-]{10,100}$/;
const tiers = new Set(["ga", "vip", "vault", "accelerator"]);
export type GhlTicketPrice = { productId: string; priceId: string; tier: string; amount: number; currency: string };
export type GhlOrderSnapshot = {
  id: string; email: string; updatedAt: string; status: string; needsReview: boolean;
  lines: { id: string; variantId: string; tier: string; quantity: number; active: boolean }[];
};
function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("GHL_RESPONSE_REQUIRES_REVIEW");
  return value as Json;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !identifier.test(value)) throw new Error("GHL_INVALID_IDENTIFIER");
  return value;
}
function stamp(value: unknown): number {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("GHL_INVALID_UPDATE_TIME");
  return Date.parse(value);
}
function money(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000000) return null;
  const cents = Math.round(value * 100);
  return Math.abs(value * 100 - cents) < 0.00001 ? cents : null;
}
export function ghlPaymentConfiguration(env: Record<string, string | undefined> = process.env) {
  if (env.ACADEMY_GHL_PAYMENTS_ENABLED !== "true") throw new Error("GHL_PAYMENTS_NOT_ENABLED");
  const client = createGhlClient(env);
  const accountId = env.ACADEMY_GHL_STRIPE_ACCOUNT_ID?.trim();
  const secret = env.ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET;
  if (!accountId || !/^acct_[a-zA-Z0-9]+$/.test(accountId) || !secret || secret.length < 32)
    throw new Error("GHL_PAYMENTS_NOT_CONFIGURED");
  let raw: unknown;
  try { raw = JSON.parse(env.ACADEMY_GHL_TICKET_PRICES_JSON ?? ""); }
  catch { throw new Error("GHL_TICKET_PRICES_NOT_CONFIGURED"); }
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 20) throw new Error("GHL_TICKET_PRICES_NOT_CONFIGURED");
  const prices = raw.map((entry) => {
    const p = object(entry);
    if (!tiers.has(String(p.tier)) || p.currency !== "USD" || money(p.amount) === null || Number(p.amount) <= 0)
      throw new Error("GHL_TICKET_PRICES_NOT_CONFIGURED");
    return { productId: id(p.productId), priceId: id(p.priceId), tier: String(p.tier), amount: Number(p.amount), currency: "USD" };
  });
  if (new Set(prices.map((p) => `${p.productId}:${p.priceId}`)).size !== prices.length)
    throw new Error("GHL_DUPLICATE_TICKET_PRICE");
  return { client, accountId, secret, prices };
}
export function ghlPaymentAuthorized(header: string | null, secret: string) {
  if (!header || secret.length < 32 || !header.startsWith("Bearer ")) return false;
  const expected = createHash("sha256").update(secret).digest();
  const received = createHash("sha256").update(header.slice(7)).digest();
  return timingSafeEqual(expected, received);
}
function verifyScope(record: Json, locationId: string) {
  if (record.altId !== locationId || record.altType !== "location") throw new Error("GHL_PAYMENT_WRONG_LOCATION");
}
function contradictoryChargeSnapshot(tx: Json, amount: number, refund: number) {
  if (tx.chargeSnapshot === undefined || tx.chargeSnapshot === null) return false;
  let snapshot: Json;
  try { snapshot = object(tx.chargeSnapshot); } catch { return true; }
  return (snapshot.id !== undefined && tx.chargeId !== undefined && snapshot.id !== tx.chargeId) ||
    snapshot.livemode === false || snapshot.disputed === true || snapshot.paid === false || snapshot.captured === false ||
    (snapshot.refunded === true && refund !== amount) ||
    (typeof snapshot.amount_refunded === "number" && snapshot.amount_refunded > 0 && refund === 0) ||
    (["charge", "payment_intent"].includes(String(snapshot.object)) && snapshot.status !== undefined && snapshot.status !== "succeeded") ||
    (snapshot.object === "invoice" && snapshot.status !== undefined && snapshot.status !== "paid");
}
/** Only API readback enters this function; webhook/browser claims never enter the grant decision. */
export function evaluateGhlOrder(orderValue: unknown, transactionValues: unknown[], config: {
  locationId: string; accountId: string; prices: GhlTicketPrice[];
}): GhlOrderSnapshot {
  const order = object(orderValue), orderId = id(order._id);
  verifyScope(order, config.locationId);
  const updated = [stamp(order.updatedAt)];
  const contact = object(order.contactSnapshot);
  const email = typeof contact.email === "string" ? contact.email.trim().toLowerCase() : "";
  let review = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254;
  review ||= typeof order.contactId !== "string" || !identifier.test(order.contactId) ||
    (contact.id !== undefined && contact.id !== order.contactId);
  const orderAmount = money(order.amount);
  const live = order.liveMode === true && order.markAsTest !== true;
  review ||= !live || order.currency !== "USD" || orderAmount === null || orderAmount <= 0;
  const items = Array.isArray(order.items) ? order.items : [];
  review ||= !items.length || items.length > 20;
  let total = 0;
  const seen = new Set<string>();
  const lines: GhlOrderSnapshot["lines"] = [];
  for (const value of items.slice(0, 20)) {
    const item = object(value), product = object(item.product), price = object(item.price);
    const productId = id(product._id), priceId = id(price._id), key = `${productId}:${priceId}`;
    const allowed = config.prices.find((p) => p.productId === productId && p.priceId === priceId);
    if (!allowed) { review = true; continue; }
    if (seen.has(key)) { review = true; continue; }
    seen.add(key);
    const quantity = typeof item.qty === "number" && Number.isInteger(item.qty) && item.qty >= 0 && item.qty <= 1000 ? item.qty : 0;
    review ||= quantity !== 1 || price.type !== "one_time" || price.currency !== allowed.currency || money(price.amount) !== money(allowed.amount);
    total += money(allowed.amount)! * quantity;
    lines.push({ id: `ghl:${key}`, variantId: `ghl:${priceId}`, tier: allowed.tier, quantity, active: false });
  }
  review ||= orderAmount === null || total <= 0 || orderAmount < total;
  let paid = 0, refunded = 0, successful = 0, unknown = false;
  const transactionIds = new Set<string>();
  for (const value of transactionValues) {
    const tx = object(value), txId = id(tx._id);
    if (transactionIds.has(txId)) throw new Error("GHL_DUPLICATE_TRANSACTION");
    transactionIds.add(txId);
    verifyScope(tx, config.locationId);
    if (tx.entityType !== "order" || tx.entityId !== orderId) throw new Error("GHL_PAYMENT_WRONG_ORDER");
    updated.push(stamp(tx.updatedAt));
    // Failed attempts are not money and must never make an unpaid order eligible.
    if (["failed", "canceled", "cancelled"].includes(String(tx.status))) continue;
    const provider = object(tx.paymentProvider), account = object(provider.connectedAccount);
    const amount = money(tx.amount), refund = money(tx.amountRefunded);
    if (tx.liveMode !== true || tx.markAsTest === true || tx.isParent === true || Boolean(tx.subscriptionId) || provider.type !== "stripe" || account.accountId !== config.accountId ||
        tx.currency !== order.currency || amount === null || amount <= 0 || refund === null || refund > amount ||
        tx.contactId !== order.contactId || !["succeeded", "refunded"].includes(String(tx.status))) {
      unknown = true; continue;
    }
    if (contradictoryChargeSnapshot(tx, amount, refund)) { unknown = true; continue; }
    successful++;
    paid += amount;
    refunded += refund;
    if (tx.status === "refunded" && refund !== amount) unknown = true;
  }
  const fullRefund = successful > 0 && paid > 0 && refunded === paid;
  const partialRefund = refunded > 0 && refunded < paid;
  review ||= unknown || successful !== 1 || partialRefund;
  let status = "UNVERIFIED";
  if (fullRefund && !unknown) status = "REFUNDED";
  else if (partialRefund) status = "PARTIALLY_REFUNDED";
  else if (order.status === "completed" && successful === 1 && !unknown && orderAmount !== null && paid === orderAmount) status = "PAID";
  review ||= status === "UNVERIFIED";
  for (const line of lines) line.active = status === "PAID" && !review;
  return { id: `ghl:${config.locationId}:${orderId}`, email, updatedAt: new Date(Math.max(...updated)).toISOString(), status, needsReview: review, lines };
}

export function createGhlPaymentReader(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = globalThis.fetch) {
  const configured = ghlPaymentConfiguration(env);
  const client = createGhlClient(env, fetchImpl);
  const query = { altId: client.locationId, altType: "location", locationId: client.locationId };
  async function json(path: string, extra: Record<string, string> = {}) {
    const response = await client.request(path, { query: { ...query, ...extra } });
    if (!response.ok) throw new Error("GHL_PAYMENT_READBACK_UNAVAILABLE");
    // Provider responses remain server-only; errors never echo response bodies or credentials.
    const raw = await readLimitedBody(new Request("https://internal.invalid", { method: "POST", body: response.body, duplex: "half" } as RequestInit), 1000000);
    try { return object(JSON.parse(raw)); } catch { throw new Error("GHL_PAYMENT_RESPONSE_INVALID"); }
  }
  async function transaction(transactionId: string) {
    const value = await json(`/payments/transactions/${id(transactionId)}`);
    if (value._id !== transactionId) throw new Error("GHL_PAYMENT_WRONG_TRANSACTION");
    verifyScope(value, client.locationId);
    return value;
  }
  return {
    locationId: client.locationId, secret: configured.secret,
    transaction,
    async order(orderId: string) {
      id(orderId);
      const first = await json(`/payments/orders/${orderId}`);
      if (first._id !== orderId) throw new Error("GHL_PAYMENT_WRONG_ORDER");
      const list = await json("/payments/transactions", { entityId: orderId, limit: "100", offset: "0" });
      if (!Array.isArray(list.data) || !Number.isInteger(list.totalCount) || list.totalCount !== list.data.length || list.data.length > 100)
        throw new Error("GHL_TRANSACTION_PAGINATION_REQUIRES_REVIEW");
      const transactions: Json[] = [];
      // Bound request time and fail closed on complex/multi-payment orders instead of guessing.
      if (list.data.length > 10) throw new Error("GHL_TRANSACTION_COUNT_REQUIRES_REVIEW");
      for (const value of list.data) transactions.push(await transaction(id(object(value)._id)));
      const last = await json(`/payments/orders/${orderId}`);
      if (last._id !== orderId || JSON.stringify(first) !== JSON.stringify(last)) throw new Error("GHL_ORDER_CHANGED_RETRY");
      return evaluateGhlOrder(last, transactions, { locationId: client.locationId, accountId: configured.accountId, prices: configured.prices });
    },
  };
}

export async function reconcileGhlOrder(namespacedId: string) {
  const reader = createGhlPaymentReader();
  const parts = namespacedId.split(":");
  if (parts.length !== 3 || parts[0] !== "ghl" || parts[1] !== reader.locationId) throw new Error("GHL_INVALID_ORDER_NAMESPACE");
  const snapshot = await reader.order(parts[2]);
  const { academyDb } = await import("./academy.server");
  const result = await academyDb().rpc("academy_reconcile_order", {
    p_order: snapshot.id, p_email: snapshot.email, p_updated: snapshot.updatedAt,
    p_status: snapshot.status, p_review: snapshot.needsReview, p_lines: snapshot.lines,
  });
  if (result.error) throw new Error("RECONCILIATION_NOT_SAVED");
  if (result.data === true) {
    const { ensureOrderCodes } = await import("./academy-access.server");
    await ensureOrderCodes(snapshot.id);
    const { syncEmailTickets, queuePurchaseConfirmations } = await import("./academy-email-tickets.server");
    await syncEmailTickets(snapshot.id);
    await queuePurchaseConfirmations(snapshot.id);
  }
  return { ok: true, needsReview: snapshot.needsReview };
}

export async function handleGhlPaymentWebhook(request: Request) {
  let reader: ReturnType<typeof createGhlPaymentReader>;
  try { reader = createGhlPaymentReader(); } catch { return new Response("Not configured", { status: 503 }); }
  if (!ghlPaymentAuthorized(request.headers.get("authorization"), reader.secret)) return new Response("Unauthorized", { status: 401 });
  let body: Json;
  try { body = object(JSON.parse(await readLimitedBody(request, 4096))); } catch { return new Response("Invalid body", { status: 400 }); }
  if (body.location_id !== reader.locationId || typeof body.transaction_id !== "string" || !identifier.test(body.transaction_id))
    return new Response("Invalid payment reference", { status: 400 });
  try {
    const tx = await reader.transaction(body.transaction_id);
    if (tx.entityType !== "order") return new Response("Order payment required", { status: 422 });
    const orderId = `ghl:${reader.locationId}:${id(tx.entityId)}`;
    stamp(tx.updatedAt);
    const eventId = `ghl:${createHash("sha256").update(JSON.stringify([tx._id, tx.updatedAt, tx.status, tx.amountRefunded])).digest("hex")}`;
    const { academyDb } = await import("./academy.server");
    const saved = await academyDb().from("academy_commerce_receipts").upsert(
      { event_id: eventId, order_id: orderId, topic: "ghl/payment-readback" },
      { onConflict: "event_id", ignoreDuplicates: true },
    );
    if (saved.error) return new Response("Unable to persist", { status: 503 });
    return new Response("Recorded", { status: 200 });
  } catch { return new Response("Payment verification unavailable", { status: 503 }); }
}
