import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGhlClient, GhlTransportError } from "../lib/academy-ghl-client.server";
import { evaluateGhlOrder, createGhlPaymentReader, ghlPaymentAuthorized, ghlPaymentConfiguration } from "../lib/academy-ghl-payments.server";
import { academyCheckoutUrl } from "../lib/academy-checkout.server";

// Synthetic fixtures only: these identifiers do not configure live products or customers.
const location = "testLocation0001", product = "testProduct00001", price = "testPrice000001", orderId = "testOrder000001", txId = "testTransaction001";
const prices = [{ productId: product, priceId: price, tier: "ga", amount: 22, currency: "USD" }];
const config = { locationId: location, accountId: "acct_testFixture", prices };
const env = {
  ACADEMY_GHL_PAYMENTS_ENABLED: "true", ACADEMY_GHL_PRIVATE_TOKEN: "synthetic-token",
  ACADEMY_GHL_LOCATION_ID: location, ACADEMY_GHL_STRIPE_ACCOUNT_ID: config.accountId,
  ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET: "synthetic-secret-longer-than-32-characters",
  ACADEMY_GHL_TICKET_PRICES_JSON: JSON.stringify(prices),
};
function fixtures() {
  return {
    order: { _id: orderId, altId: location, altType: "location", contactId: "testContact0001", contactSnapshot: { email: "learner@example.com" },
      amount: 22, currency: "USD", status: "completed", liveMode: true, markAsTest: false, updatedAt: "2026-09-10T10:00:00Z",
      items: [{ qty: 1, product: { _id: product }, price: { _id: price, type: "one_time", currency: "USD", amount: 22 } }] },
    tx: { _id: txId, altId: location, altType: "location", contactId: "testContact0001", entityType: "order", entityId: orderId,
      amount: 22, amountRefunded: 0, currency: "USD", status: "succeeded", liveMode: true, markAsTest: false, updatedAt: "2026-09-10T10:00:01Z",
      paymentProvider: { type: "stripe", connectedAccount: { accountId: config.accountId } } },
  };
}
describe("verified GHL payment eligibility", () => {
  it("grants one allowlisted fully paid live Stripe ticket with namespaced identities", () => {
    const { order, tx } = fixtures(), result = evaluateGhlOrder(order, [tx], config);
    assert.equal(result.status, "PAID"); assert.equal(result.needsReview, false); assert.equal(result.lines[0].active, true);
    assert.equal(result.id, `ghl:${location}:${orderId}`); assert.equal(result.updatedAt, "2026-09-10T10:00:01.000Z");
  });
  for (const [label, change] of Object.entries({
    "test order": (o: any): any => o.liveMode = false,
    "string live flag": (o: any): any => o.liveMode = "true",
    "unpaid order": (o: any): any => o.status = "pending",
    "cancelled order": (o: any): any => o.status = "cancelled",
    "missing buyer email": (o: any): any => o.contactSnapshot = {},
    "missing contact identity": (o: any): any => delete o.contactId,
    "contradictory contact snapshot": (o: any): any => o.contactSnapshot.id = "differentContact001",
    "unapproved product": (o: any): any => o.items[0].product._id = "differentProduct01",
    "unapproved price": (o: any): any => o.items[0].price._id = "differentPrice001",
    "recurring price": (o: any): any => o.items[0].price.type = "recurring",
    "multi-seat order": (o: any): any => { o.items[0].qty = 2; o.amount = 44; },
    "duplicate line": (o: any): any => o.items.push(structuredClone(o.items[0])),
    "coupon under configured minimum": (o: any): any => o.amount = 1,
  })) it(`holds ${label}`, () => {
    const { order, tx } = fixtures(); change(order);
    const r = evaluateGhlOrder(order, [tx], config); assert.equal(r.needsReview, true); assert.ok(r.lines.every((x) => !x.active));
  });
  for (const [label, change] of Object.entries({
    "unknown status": (t: any): any => t.status = "processing",
    "test transaction": (t: any): any => t.liveMode = false,
    "aggregate parent transaction": (t: any): any => t.isParent = true,
    "subscription payment": (t: any): any => t.subscriptionId = "sub_fixture",
    "manually recorded payment": (t: any): any => t.paymentProvider.type = "manual",
    "wrong Stripe account": (t: any): any => t.paymentProvider.connectedAccount.accountId = "acct_another",
    "wrong currency": (t: any): any => t.currency = "EUR",
    "different contact": (t: any): any => t.contactId = "otherContact0001",
    "missing refund state": (t: any): any => delete t.amountRefunded,
    "underpayment": (t: any): any => t.amount = 1,
    "charge status object": (t: any): any => t.status = { status: "succeeded" },
    "disputed charge snapshot": (t: any): any => t.chargeSnapshot = { disputed: true },
    "contradictory refunded snapshot": (t: any): any => t.chargeSnapshot = { refunded: true },
    "uncaptured charge snapshot": (t: any): any => t.chargeSnapshot = { captured: false },
    "failed charge snapshot": (t: any): any => t.chargeSnapshot = { object: "charge", status: "failed" },
    "uncaptured PaymentIntent snapshot": (t: any): any => t.chargeSnapshot = { object: "payment_intent", status: "requires_capture" },
    "unpaid invoice snapshot": (t: any): any => t.chargeSnapshot = { object: "invoice", status: "open" },
    "wrong charge snapshot ID": (t: any): any => { t.chargeId = "ch_expected"; t.chargeSnapshot = { id: "ch_different" }; },
  })) it(`never grants ${label}`, () => {
    const { order, tx } = fixtures(); change(tx);
    assert.ok(evaluateGhlOrder(order, [tx], config).lines.every((x) => !x.active));
  });
  it("revokes a full refund using authoritative transaction refund amount", () => {
    const { order, tx } = fixtures(); tx.amountRefunded = 22;
    const r = evaluateGhlOrder(order, [tx], config); assert.equal(r.status, "REFUNDED"); assert.equal(r.lines[0].active, false);
  });
  it("accepts a consistent invoice snapshot without confusing invoice paid with charge succeeded", () => {
    const { order, tx } = fixtures();
    assert.equal(evaluateGhlOrder(order, [{ ...tx, chargeId: "in_test", chargeSnapshot: { id: "in_test", object: "invoice", status: "paid", paid: true } }], config).lines[0].active, true);
  });
  it("holds partial refunds without guessing which lesson was refunded", () => {
    const { order, tx } = fixtures(); tx.amountRefunded = 1;
    const r = evaluateGhlOrder(order, [tx], config); assert.equal(r.status, "PARTIALLY_REFUNDED"); assert.equal(r.needsReview, true); assert.equal(r.lines[0].active, false);
  });
  it("rejects wrong-location and wrong-order API responses", () => {
    const { order, tx } = fixtures();
    assert.throws(() => evaluateGhlOrder({ ...order, altId: "otherLocation001" }, [tx], config), /WRONG_LOCATION/);
    assert.throws(() => evaluateGhlOrder(order, [{ ...tx, entityId: "anotherOrder001" }], config), /WRONG_ORDER/);
  });
  it("failed retries never count toward paid amount", () => {
    const { order, tx } = fixtures();
    assert.equal(evaluateGhlOrder(order, [{ ...tx, status: "failed" }], config).lines[0].active, false);
    assert.equal(evaluateGhlOrder(order, [tx, { ...tx, _id: "testFailed000001", status: "failed" }], config).lines[0].active, true);
  });
  it("holds multiple successful transactions; rejects duplicates", () => {
    const { order, tx } = fixtures();
    assert.equal(evaluateGhlOrder(order, [tx, { ...tx, _id: "testOtherTx0001" }], config).lines[0].active, false);
    assert.throws(() => evaluateGhlOrder(order, [tx, tx], config), /DUPLICATE_TRANSACTION/);
  });
});

describe("GHL payment readback and transport", () => {
  it("reads every transaction by ID, checks location, and pins HighLevel host and version", async () => {
    const { order, tx } = fixtures(); const calls: string[] = [];
    const fetcher = (async (input: any, init: any) => {
      const url = new URL(String(input)); calls.push(url.pathname);
      assert.equal(url.origin, "https://services.leadconnectorhq.com"); assert.equal(url.searchParams.get("altId"), location);
      assert.equal(init.headers.Version, "v3"); assert.equal(init.redirect, "error");
      return Response.json(url.pathname.endsWith(`/${orderId}`) ? order : url.pathname.endsWith(`/${txId}`) ? tx : { data: [{ _id: txId }], totalCount: 1 });
    }) as typeof fetch;
    const r = await createGhlPaymentReader(env, fetcher).order(orderId);
    assert.equal(r.lines[0].active, true); assert.equal(calls.length, 4);
  });
  it("refuses incomplete transaction pages", async () => {
    const { order } = fixtures();
    const fetcher = (async (input: any) => Response.json(String(input).includes("/orders/") ? order : { data: [], totalCount: 101 })) as typeof fetch;
    await assert.rejects(() => createGhlPaymentReader(env, fetcher).order(orderId), /PAGINATION/);
  });
  it("rejects order changes during readback", async () => {
    const { order, tx } = fixtures(); let count = 0;
    const fetcher = (async (input: any) => {
      const path = new URL(String(input)).pathname;
      return Response.json(path.includes("/orders/") ? { ...order, status: count++ === 0 ? "completed" : "cancelled" } : path.endsWith(txId) ? tx : { data: [{ _id: txId }], totalCount: 1 });
    }) as typeof fetch;
    await assert.rejects(() => createGhlPaymentReader(env, fetcher).order(orderId), /ORDER_CHANGED/);
  });
  it("sanitizes ambiguous transport failures and rejects arbitrary endpoints", async () => {
    const c = createGhlClient(env, (async () => { throw new Error("private token and PII"); }) as typeof fetch);
    await assert.rejects(() => c.request("/payments/orders"), GhlTransportError);
    await assert.rejects(() => c.request("https://evil.example/"), /INVALID_API_PATH/);
    await assert.rejects(() => c.request("//evil.example/"), /INVALID_API_PATH/);
  });
  it("authenticates only the private bearer handoff and requires complete payment config", () => {
    assert.equal(ghlPaymentAuthorized(`Bearer ${env.ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET}`, env.ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET), true);
    assert.equal(ghlPaymentAuthorized("Bearer wrong", env.ACADEMY_GHL_PAYMENT_WEBHOOK_SECRET), false);
    assert.throws(() => ghlPaymentConfiguration({ ...env, ACADEMY_GHL_PAYMENTS_ENABLED: "false" }));
    assert.throws(() => ghlPaymentConfiguration({ ...env, ACADEMY_GHL_TICKET_PRICES_JSON: "[]" }));
  });
  it("keeps Shopify default; GHL checkout requires the explicit flag, actual link, and allowed host", () => {
    assert.match(academyCheckoutUrl("ga", {})!, /^https:\/\/spincityhq.com\//);
    assert.equal(academyCheckoutUrl("unknown", {}), null);
    const ready = { ...env, ACADEMY_CHECKOUT_PROVIDER: "ghl", ACADEMY_GHL_CHECKOUT_HOSTS: "checkout.example.com", ACADEMY_GHL_CHECKOUT_LINKS_JSON: JSON.stringify({ ga: "https://checkout.example.com/actual-link" }) };
    assert.equal(academyCheckoutUrl("ga", ready), "https://checkout.example.com/actual-link");
    assert.equal(academyCheckoutUrl("vip", ready), null);
    assert.equal(academyCheckoutUrl("ga", { ...ready, ACADEMY_GHL_CHECKOUT_HOSTS: "other.example.com" }), null);
    assert.equal(academyCheckoutUrl("ga", { ...ready, ACADEMY_GHL_PAYMENTS_ENABLED: "false" }), null);
  });
});
