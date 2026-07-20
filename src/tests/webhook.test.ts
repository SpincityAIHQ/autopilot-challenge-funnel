import { describe, it, expect } from "bun:test";
import { createHmac } from "node:crypto";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  extractPayment,
  resolveTierFromProduct,
  detectGaBump,
  redactEventPayload,
  dollarsToCents,
  isSupportedEvent,
  expectedTotalCents,
  validateWebhookConfig,
  CANONICAL_FULFILLMENT_EVENT,
} from "../lib/webhook-helpers";

const SECRET = "test_secret_value";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

describe("webhook signature", () => {
  it("accepts a valid signature over exact raw body", () => {
    const body = '{"id":"evt_1","type":"payment.succeeded","data":{"payment_id":"pay_1"}}';
    expect(verifyCommasSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyCommasSignature(body, `sha256=${sign(body)}`, SECRET)).toBe(true);
  });

  it("rejects tampered body", () => {
    const body = '{"id":"evt_1","type":"payment.succeeded","data":{"payment_id":"pay_1"}}';
    const tampered = body.replace("pay_1", "pay_2");
    expect(verifyCommasSignature(tampered, sign(body), SECRET)).toBe(false);
  });

  it("rejects missing / malformed signatures", () => {
    expect(verifyCommasSignature("{}", null, SECRET)).toBe(false);
    expect(verifyCommasSignature("{}", "", SECRET)).toBe(false);
    expect(verifyCommasSignature("{}", "not-hex", SECRET)).toBe(false);
  });

  it("rejects when secret missing", () => {
    expect(verifyCommasSignature("{}", sign("{}"), "")).toBe(false);
  });
});

describe("envelope parsing", () => {
  it("parses a good envelope", () => {
    const env = parseCommasEnvelope(
      '{"id":"evt","type":"payment.succeeded","data":{"payment_id":"p"}}',
    );
    expect(env?.id).toBe("evt");
    expect(env?.type).toBe("payment.succeeded");
  });

  it("returns null for garbage or missing fields", () => {
    expect(parseCommasEnvelope("not-json")).toBeNull();
    expect(parseCommasEnvelope('{"id":"x"}')).toBeNull();
    expect(parseCommasEnvelope('{"id":"","type":"payment.succeeded","data":{}}')).toBeNull();
  });
});

describe("supported events", () => {
  it("allow-lists exactly two", () => {
    expect(isSupportedEvent("payment.succeeded")).toBe(true);
    expect(isSupportedEvent("product.purchased")).toBe(true);
    expect(isSupportedEvent("payment.refunded")).toBe(false);
  });
  it("names the canonical fulfillment event", () => {
    expect(CANONICAL_FULFILLMENT_EVENT).toBe("payment.succeeded");
  });
});

describe("dollars → cents", () => {
  it("converts common values correctly", () => {
    expect(dollarsToCents(77)).toBe(7700);
    expect(dollarsToCents(77.0)).toBe(7700);
    expect(dollarsToCents(49.99)).toBe(4999);
    expect(dollarsToCents(0.01)).toBe(1);
  });
  it("returns null for invalid inputs", () => {
    expect(dollarsToCents("77")).toBeNull();
    expect(dollarsToCents(-1)).toBeNull();
    expect(dollarsToCents(Number.NaN)).toBeNull();
    expect(dollarsToCents(undefined)).toBeNull();
  });
});

describe("product mapping (no ga_bump base tier)", () => {
  const env = {
    COMMAS_PRODUCT_ID_GA: "prod_ga",
    COMMAS_PRODUCT_ID_GA_BUMP: "prod_ga_bump",
    COMMAS_PRODUCT_ID_VIP: "prod_vip",
    COMMAS_PRODUCT_ID_BUNDLE: "prod_bundle",
    COMMAS_PRODUCT_ID_FOUNDER: "prod_founder",
  };

  it("maps known base products (bump is NOT a base tier)", () => {
    expect(resolveTierFromProduct("prod_ga", env)).toEqual({ tier: "ga" });
    expect(resolveTierFromProduct("prod_ga_bump", env)).toBeNull();
    expect(resolveTierFromProduct("prod_founder", env)).toEqual({ tier: "founder" });
  });

  it("returns null for unknown / null products", () => {
    expect(resolveTierFromProduct("prod_unknown", env)).toBeNull();
    expect(resolveTierFromProduct(null, env)).toBeNull();
  });

  it("detects GA bump via order_bumps only", () => {
    expect(detectGaBump(["prod_ga_bump"], env)).toBe(true);
    expect(detectGaBump([], env)).toBe(false);
    expect(detectGaBump(["prod_other"], env)).toBe(false);
  });
});

describe("payment extraction (strict, dollars → cents)", () => {
  const good = {
    id: "evt_1",
    type: "payment.succeeded",
    data: {
      status: "succeeded",
      payment_id: "pay_1",
      amount: 77.0,
      currency: "USD",
      item: { id: "prod_ga", title: "GA Ticket" },
      order_bumps: [{ item: { id: "prod_ga_bump", title: "Recordings" } }],
      buyer: { id: "bx_1", name: "Ada Lovelace", email: "ada@example.com", phone: "+15551112222" },
    },
  };

  it("pulls fields and converts dollars to cents", () => {
    const p = extractPayment(good);
    expect(p?.paymentId).toBe("pay_1");
    expect(p?.baseItemId).toBe("prod_ga");
    expect(p?.bumpItemIds).toEqual(["prod_ga_bump"]);
    expect(p?.amountCents).toBe(7700);
    expect(p?.currency).toBe("USD");
    expect(p?.buyer.email).toBe("ada@example.com");
    expect(p?.buyer.fullName).toBe("Ada Lovelace");
    expect(p?.buyer.providerId).toBe("bx_1");
  });

  it("returns null when status is not 'succeeded'", () => {
    expect(extractPayment({ ...good, data: { ...good.data, status: "pending" } })).toBeNull();
  });

  it("returns null on missing/invalid required fields — never fabricates", () => {
    expect(extractPayment({ ...good, data: { ...good.data, payment_id: "" } })).toBeNull();
    expect(extractPayment({ ...good, data: { ...good.data, item: {} } })).toBeNull();
    expect(extractPayment({ ...good, data: { ...good.data, amount: 0 } })).toBeNull();
    expect(extractPayment({ ...good, data: { ...good.data, amount: -1 } })).toBeNull();
    expect(
      extractPayment({ ...good, data: { ...good.data, buyer: { name: "", email: "" } } }),
    ).toBeNull();
  });
});

describe("event payload redaction — no buyer PII", () => {
  it("keeps ids/amount/status/bumps and drops buyer PII", () => {
    const env = {
      id: "evt_1",
      type: "payment.succeeded",
      data: {
        status: "succeeded",
        payment_id: "pay_1",
        amount: 49.99,
        currency: "USD",
        item: { id: "prod_ga", title: "GA Ticket" },
        order_bumps: [{ item: { id: "prod_ga_bump", title: "Recordings" } }],
        buyer: {
          id: "bx_1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+15551112222",
          address: { line1: "1 Real St" },
        },
        metadata: { secret: "s3cr3t" },
      },
    };
    const r = redactEventPayload(env);
    expect(r.event_id).toBe("evt_1");
    expect(r.payment_id).toBe("pay_1");
    expect(r.amount).toBe(49.99);
    expect(r.base_item_id).toBe("prod_ga");
    expect(r.bump_item_ids).toEqual(["prod_ga_bump"]);
    expect(r.buyer_provider_id).toBe("bx_1");
    // Explicitly does NOT include PII / metadata
    const s = JSON.stringify(r);
    expect(s.includes("Ada Lovelace")).toBe(false);
    expect(s.includes("ada@example.com")).toBe(false);
    expect(s.includes("+15551112222")).toBe(false);
    expect(s.includes("1 Real St")).toBe(false);
    expect(s.includes("s3cr3t")).toBe(false);
  });
});
