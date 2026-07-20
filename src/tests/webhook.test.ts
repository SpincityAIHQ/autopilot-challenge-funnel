import { describe, it, expect } from "bun:test";
import { createHmac } from "node:crypto";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  extractPayment,
  resolveTierFromProduct,
  isSupportedEvent,
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

  it("returns null for garbage", () => {
    expect(parseCommasEnvelope("not-json")).toBeNull();
    expect(parseCommasEnvelope('{"id":"x"}')).toBeNull();
  });
});

describe("supported events", () => {
  it("only allow-lists two", () => {
    expect(isSupportedEvent("payment.succeeded")).toBe(true);
    expect(isSupportedEvent("product.purchased")).toBe(true);
    expect(isSupportedEvent("payment.refunded")).toBe(false);
  });
});

describe("product mapping", () => {
  const env = {
    COMMAS_PRODUCT_ID_GA: "prod_ga",
    COMMAS_PRODUCT_ID_GA_BUMP: "prod_ga_bump",
    COMMAS_PRODUCT_ID_VIP: "prod_vip",
    COMMAS_PRODUCT_ID_BUNDLE: "prod_bundle",
    COMMAS_PRODUCT_ID_FOUNDER: "prod_founder",
  };

  it("maps known products", () => {
    expect(resolveTierFromProduct("prod_ga", env)).toEqual({ tier: "ga", bump: false });
    expect(resolveTierFromProduct("prod_ga_bump", env)).toEqual({ tier: "ga", bump: true });
    expect(resolveTierFromProduct("prod_founder", env)).toEqual({ tier: "founder", bump: false });
  });

  it("returns null for unknown products (grants nothing)", () => {
    expect(resolveTierFromProduct("prod_unknown", env)).toBeNull();
    expect(resolveTierFromProduct(null, env)).toBeNull();
  });
});

describe("payment extraction", () => {
  it("pulls fields from a payment.succeeded envelope", () => {
    const env = {
      id: "evt_1",
      type: "payment.succeeded",
      data: {
        payment_id: "pay_1",
        amount: 7700,
        currency: "USD",
        item: { id: "prod_ga" },
        buyer: { full_name: "Ada Lovelace", email: "ada@example.com" },
      },
    };
    const p = extractPayment(env);
    expect(p?.paymentId).toBe("pay_1");
    expect(p?.productId).toBe("prod_ga");
    expect(p?.amountCents).toBe(7700);
    expect(p?.buyer.email).toBe("ada@example.com");
  });
});
