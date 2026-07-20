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

describe("currency is required + normalized", () => {
  const base = {
    id: "evt_c",
    type: "payment.succeeded",
    data: {
      status: "succeeded",
      payment_id: "pay_c",
      amount: 77.0,
      item: { id: "prod_ga" },
      buyer: { name: "A B", email: "ab@example.com" },
    } as Record<string, unknown>,
  };
  it("rejects missing/empty currency (never defaults to USD)", () => {
    expect(extractPayment(base as never)).toBeNull();
    expect(extractPayment({ ...base, data: { ...base.data, currency: "" } } as never)).toBeNull();
    expect(extractPayment({ ...base, data: { ...base.data, currency: "   " } } as never)).toBeNull();
  });
  it("normalizes currency to uppercase (non-USD retained for downstream reject)", () => {
    const usd = extractPayment({ ...base, data: { ...base.data, currency: "usd" } } as never);
    expect(usd?.currency).toBe("USD");
    const eur = extractPayment({ ...base, data: { ...base.data, currency: "eur" } } as never);
    expect(eur?.currency).toBe("EUR");
  });
});

describe("expectedTotalCents — server-side price of truth", () => {
  it("matches the tier source of truth including 111100 Founder", () => {
    expect(expectedTotalCents("ga", false)).toBe(7700);
    expect(expectedTotalCents("ga", true)).toBe(9900);
    expect(expectedTotalCents("vip", false)).toBe(17700);
    expect(expectedTotalCents("bundle", false)).toBe(33300);
    expect(expectedTotalCents("founder", false)).toBe(111100);
  });
  it("rejects the retired 88800 Founder price", () => {
    expect(expectedTotalCents("founder", false)).not.toBe(88800);
  });
  it("rejects $1 (100) and other under-price attempts vs any tier", () => {
    for (const t of ["ga", "vip", "bundle", "founder"] as const) {
      expect(expectedTotalCents(t, false)).not.toBe(100);
    }
  });
  it("VIP/Bundle/Founder ignore bump flag", () => {
    expect(expectedTotalCents("vip", true)).toBe(17700);
    expect(expectedTotalCents("bundle", true)).toBe(33300);
    expect(expectedTotalCents("founder", true)).toBe(111100);
  });
});

describe("validateWebhookConfig — activation gate", () => {
  const full = {
    COMMAS_WEBHOOKS_ENABLED: "true",
    COMMAS_WEBHOOK_SECRET: "s",
    COMMAS_PRODUCT_ID_GA: "prod_ga",
    COMMAS_PRODUCT_ID_GA_BUMP: "prod_ga_bump",
    COMMAS_PRODUCT_ID_VIP: "prod_vip",
    COMMAS_PRODUCT_ID_BUNDLE: "prod_bundle",
    COMMAS_PRODUCT_ID_FOUNDER: "prod_founder",
  };
  it("ok when enabled + secret + 5 distinct product ids", () => {
    expect(validateWebhookConfig(full).ok).toBe(true);
  });
  it("fails when disabled", () => {
    expect(validateWebhookConfig({ ...full, COMMAS_WEBHOOKS_ENABLED: "false" }).ok).toBe(false);
  });
  it("fails when secret missing", () => {
    expect(validateWebhookConfig({ ...full, COMMAS_WEBHOOK_SECRET: "" }).ok).toBe(false);
  });
  it("fails when any product id is missing", () => {
    expect(validateWebhookConfig({ ...full, COMMAS_PRODUCT_ID_VIP: "" }).ok).toBe(false);
    expect(validateWebhookConfig({ ...full, COMMAS_PRODUCT_ID_FOUNDER: undefined }).ok).toBe(false);
  });
  it("fails when product ids are not pairwise distinct", () => {
    expect(
      validateWebhookConfig({ ...full, COMMAS_PRODUCT_ID_VIP: "prod_ga" }).ok,
    ).toBe(false);
  });
});
