import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  isReversalEvent,
  extractPayment,
  extractPaymentIdForReversal,
  resolveProductFromItem,
  validateWebhookConfig,
  redactEventPayload,
  dollarsToCents,
  CANONICAL_FULFILLMENT_EVENT,
} from "@/lib/webhook-helpers";

const secret = "s3cr3t-summit-webhook-key";
function sig(body: string, s = secret): string {
  return createHmac("sha256", s).update(body, "utf8").digest("hex");
}

describe("verifyCommasSignature", () => {
  it("accepts the correct HMAC-SHA256 hex", () => {
    const body = '{"id":"e1","type":"payment.succeeded","data":{}}';
    expect(verifyCommasSignature(body, sig(body), secret)).toBe(true);
  });
  it("accepts sha256= prefixed signatures", () => {
    const body = '{"a":1}';
    expect(verifyCommasSignature(body, "sha256=" + sig(body), secret)).toBe(true);
  });
  it("rejects wrong signatures, missing headers, non-hex, and wrong secret", () => {
    const body = '{"a":1}';
    expect(verifyCommasSignature(body, sig(body, "other"), secret)).toBe(false);
    expect(verifyCommasSignature(body, null, secret)).toBe(false);
    expect(verifyCommasSignature(body, "not-hex-value", secret)).toBe(false);
    expect(verifyCommasSignature(body, sig(body), "")).toBe(false);
  });
  it("is length-sensitive (guards timingSafeEqual)", () => {
    const body = "hi";
    expect(verifyCommasSignature(body, sig(body).slice(0, 63), secret)).toBe(false);
  });
});

describe("parseCommasEnvelope", () => {
  it("parses valid envelopes", () => {
    const e = parseCommasEnvelope('{"id":"x","type":"payment.succeeded","data":{"a":1}}');
    expect(e?.id).toBe("x");
  });
  it("rejects missing fields and malformed JSON", () => {
    expect(parseCommasEnvelope("{}")).toBeNull();
    expect(parseCommasEnvelope('{"id":"","type":"payment.succeeded","data":{}}')).toBeNull();
    expect(parseCommasEnvelope("not-json")).toBeNull();
    expect(parseCommasEnvelope('{"id":"x","type":"payment.succeeded"}')).toBeNull();
  });
});

describe("event classification", () => {
  it("classifies canonical fulfillment", () => {
    expect(CANONICAL_FULFILLMENT_EVENT).toBe("payment.succeeded");
    expect(isSupportedEvent("payment.succeeded")).toBe(true);
    expect(isSupportedEvent("product.purchased")).toBe(true);
    expect(isSupportedEvent("payment.refunded")).toBe(true);
    expect(isSupportedEvent("payment.failed")).toBe(true);
    expect(isSupportedEvent("payment.disputed")).toBe(true);
    expect(isSupportedEvent("random.event")).toBe(false);
  });
  it("identifies reversal events", () => {
    expect(isReversalEvent("payment.refunded")).toBe(true);
    expect(isReversalEvent("payment.failed")).toBe(true);
    expect(isReversalEvent("payment.disputed")).toBe(true);
    expect(isReversalEvent("payment.succeeded")).toBe(false);
    expect(isReversalEvent("product.purchased")).toBe(false);
  });
});

describe("dollarsToCents", () => {
  it("rounds to cents", () => {
    expect(dollarsToCents(22)).toBe(2200);
    expect(dollarsToCents(77.5)).toBe(7750);
    expect(dollarsToCents(199)).toBe(19900);
  });
  it("rejects invalid values", () => {
    expect(dollarsToCents(-1)).toBeNull();
    expect(dollarsToCents(Number.NaN)).toBeNull();
    expect(dollarsToCents("22" as unknown)).toBeNull();
  });
});

describe("extractPayment", () => {
  const good = {
    id: "evt-1",
    type: "payment.succeeded",
    data: {
      payment_id: "pay_abc",
      status: "succeeded",
      amount: 22,
      currency: "usd",
      item: { id: "prod_ga" },
      buyer: { name: "A Family", email: "family@example.com", phone: "+15551234567", id: "buy_1" },
    },
  };
  it("extracts payment for succeeded status and normalizes currency", () => {
    const p = extractPayment(good as never);
    expect(p?.paymentId).toBe("pay_abc");
    expect(p?.amountCents).toBe(2200);
    expect(p?.currency).toBe("USD");
    expect(p?.baseItemId).toBe("prod_ga");
    expect(p?.buyer.email).toBe("family@example.com");
  });
  it("rejects non-succeeded status", () => {
    const bad = { ...good, data: { ...good.data, status: "pending" } };
    expect(extractPayment(bad as never)).toBeNull();
  });
  it("rejects negative or missing amounts", () => {
    const bad = { ...good, data: { ...good.data, amount: -1 } };
    expect(extractPayment(bad as never)).toBeNull();
  });
  it("rejects missing item id, currency, buyer fields", () => {
    for (const patch of [
      { item: {} },
      { currency: "" },
      { buyer: { email: "", name: "A" } },
      { buyer: { email: "a@b.co", name: "" } },
    ]) {
      const bad = { ...good, data: { ...good.data, ...patch } };
      expect(extractPayment(bad as never)).toBeNull();
    }
  });
});

describe("extractPaymentIdForReversal", () => {
  it("returns the payment id from data", () => {
    expect(
      extractPaymentIdForReversal({ id: "e", type: "payment.refunded", data: { payment_id: "p1" } } as never),
    ).toBe("p1");
  });
  it("returns null when missing", () => {
    expect(
      extractPaymentIdForReversal({ id: "e", type: "payment.refunded", data: {} } as never),
    ).toBeNull();
  });
});

describe("resolveProductFromItem", () => {
  const env = {
    COMMAS_PRODUCT_ID_GA: "prod_ga",
    COMMAS_PRODUCT_ID_VIP_UPGRADE: "prod_vipup",
    COMMAS_PRODUCT_ID_VAULT: "prod_vault",
    COMMAS_PRODUCT_ID_INTENSIVE: "prod_int",
  };
  it("maps every current sale product id", () => {
    expect(resolveProductFromItem("prod_ga", env)).toBe("ga");
    expect(resolveProductFromItem("prod_vipup", env)).toBe("vip_upgrade");
    expect(resolveProductFromItem("prod_vault", env)).toBe("vault");
    expect(resolveProductFromItem("prod_int", env)).toBe("intensive");
  });
  it("does NOT resolve legacy direct-VIP product for fulfillment", () => {
    // Even if a stale env var were still set, direct-VIP admission is not
    // a current sale product — payment.succeeded on it grants nothing.
    const legacy = { ...env, COMMAS_PRODUCT_ID_VIP: "prod_vip_legacy" };
    expect(resolveProductFromItem("prod_vip_legacy", legacy)).toBeNull();
  });
  it("returns null for unknown or missing", () => {
    expect(resolveProductFromItem("prod_other", env)).toBeNull();
    expect(resolveProductFromItem(null, env)).toBeNull();
    expect(resolveProductFromItem("prod_ga", {})).toBeNull();
  });
});

describe("validateWebhookConfig", () => {
  const full = {
    COMMAS_WEBHOOKS_ENABLED: "true",
    COMMAS_WEBHOOK_SECRET: "x",
    COMMAS_PRODUCT_ID_GA: "a",
    COMMAS_PRODUCT_ID_VIP_UPGRADE: "c",
    COMMAS_PRODUCT_ID_VAULT: "d",
    COMMAS_PRODUCT_ID_INTENSIVE: "e",
  };
  it("requires all 4 current-sale product ids, secret, and enabled=true", () => {
    expect(validateWebhookConfig(full).ok).toBe(true);
    expect(validateWebhookConfig({ ...full, COMMAS_WEBHOOKS_ENABLED: "false" }).ok).toBe(false);
    expect(validateWebhookConfig({ ...full, COMMAS_WEBHOOK_SECRET: "" }).ok).toBe(false);
    expect(validateWebhookConfig({ ...full, COMMAS_PRODUCT_ID_INTENSIVE: "" }).ok).toBe(false);
  });
  it("rejects duplicate product ids", () => {
    expect(validateWebhookConfig({ ...full, COMMAS_PRODUCT_ID_VIP_UPGRADE: "a" }).ok).toBe(false);
  });
  it("does not require the legacy direct-VIP product id", () => {
    // No COMMAS_PRODUCT_ID_VIP in `full` — activation is still ok.
    expect(validateWebhookConfig(full).ok).toBe(true);
  });
});

describe("redactEventPayload", () => {
  it("omits buyer PII", () => {
    const env = {
      id: "evt",
      type: "payment.succeeded",
      data: {
        payment_id: "p",
        status: "succeeded",
        amount: 22,
        currency: "USD",
        item: { id: "prod_ga", title: "GA" },
        buyer: {
          id: "buy",
          name: "Real Name",
          email: "secret@example.com",
          phone: "+15551234567",
          address: { street: "1 Main" },
        },
      },
    };
    const p = redactEventPayload(env as never);
    const s = JSON.stringify(p);
    expect(s).not.toContain("secret@example.com");
    expect(s).not.toContain("Real Name");
    expect(s).not.toContain("+15551234567");
    expect(s).not.toContain("1 Main");
    expect(p.buyer_provider_id).toBe("buy");
    expect(p.base_item_id).toBe("prod_ga");
  });
});
