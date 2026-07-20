/**
 * Server-only helpers for the Commas webhook.
 *
 * Contract (current Commas):
 *   Envelope: { id: string, type: string, data: { ... } }
 *   Monetary fields are DECIMAL DOLLARS. Convert to cents with
 *   Math.round(value * 100). Never assume cents on the wire.
 *
 *   Canonical fulfillment event: `payment.succeeded` (data.status === "succeeded").
 *   `product.purchased` fires in addition and is audit-only — NEVER fulfills.
 *
 *   Base product id:  data.item.id
 *   Order bumps:      data.order_bumps[].item.id
 *   Buyer identity:   data.buyer.{name,email,phone,id}
 *   Amount:           data.amount  (dollars)
 *   Currency:         data.currency
 *   Payment id:       data.payment_id
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify HMAC-SHA256 signature over the EXACT raw body.
 * Accepts the header value with or without a "sha256=" prefix.
 * Constant-time compare; never throws for malformed input.
 */
export function verifyCommasSignature(
  rawBody: string,
  headerSignature: string | null | undefined,
  secret: string,
): boolean {
  if (!headerSignature || !secret) return false;
  const provided = headerSignature.startsWith("sha256=")
    ? headerSignature.slice("sha256=".length)
    : headerSignature;

  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided.toLowerCase(), "utf8");
  const b = Buffer.from(expected.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface CommasEnvelope {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export function parseCommasEnvelope(rawBody: string): CommasEnvelope | null {
  try {
    const parsed = JSON.parse(rawBody);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.id === "string" &&
      parsed.id.length > 0 &&
      typeof parsed.type === "string" &&
      parsed.type.length > 0 &&
      parsed.data &&
      typeof parsed.data === "object"
    ) {
      return parsed as CommasEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

export type SupportedEvent = "payment.succeeded" | "product.purchased";
export const CANONICAL_FULFILLMENT_EVENT: SupportedEvent = "payment.succeeded";

export function isSupportedEvent(t: string): t is SupportedEvent {
  return t === "payment.succeeded" || t === "product.purchased";
}

/**
 * Convert Commas decimal-DOLLAR amounts to integer cents.
 * Returns null for anything not a finite positive number.
 */
export function dollarsToCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export interface ExtractedPayment {
  paymentId: string;
  status: string;
  baseItemId: string;
  bumpItemIds: string[];
  amountCents: number;
  currency: string;
  buyer: {
    fullName: string;
    email: string;
    phone: string | null;
    providerId: string | null;
  };
}

/**
 * Strict extraction for `payment.succeeded`. Returns null unless every
 * required field is present with the right shape. Never fabricates data.
 */
export function extractPayment(env: CommasEnvelope): ExtractedPayment | null {
  const d = env.data as Record<string, unknown>;

  const status = typeof d.status === "string" ? d.status : "";
  if (status !== "succeeded") return null;

  const paymentId = typeof d.payment_id === "string" ? d.payment_id : "";
  if (!paymentId) return null;

  const item = (d.item ?? {}) as Record<string, unknown>;
  const baseItemId = typeof item.id === "string" ? item.id : "";
  if (!baseItemId) return null;

  const amountCents = dollarsToCents(d.amount);
  if (amountCents === null || amountCents <= 0) return null;

  const currency = typeof d.currency === "string" && d.currency ? d.currency : "USD";

  const buyer = (d.buyer ?? {}) as Record<string, unknown>;
  const email = typeof buyer.email === "string" ? buyer.email.trim() : "";
  const fullName =
    (typeof buyer.name === "string" && buyer.name.trim()) ||
    (typeof buyer.full_name === "string" && (buyer.full_name as string).trim()) ||
    "";
  if (!email || !fullName) return null;

  const phone = typeof buyer.phone === "string" && buyer.phone ? buyer.phone : null;
  const providerId = typeof buyer.id === "string" && buyer.id ? buyer.id : null;

  const bumps = Array.isArray(d.order_bumps) ? (d.order_bumps as unknown[]) : [];
  const bumpItemIds: string[] = [];
  for (const b of bumps) {
    if (b && typeof b === "object") {
      const bi = (b as Record<string, unknown>).item as Record<string, unknown> | undefined;
      const id = bi && typeof bi.id === "string" ? bi.id : null;
      if (id) bumpItemIds.push(id);
    }
  }

  return {
    paymentId,
    status,
    baseItemId,
    bumpItemIds,
    amountCents,
    currency,
    buyer: { fullName, email, phone, providerId },
  };
}

/** Env-driven product-id → tier mapping. Unknown ids grant nothing. */
export function resolveTierFromProduct(
  productId: string | null,
  env: Record<string, string | undefined>,
): { tier: "ga" | "vip" | "bundle" | "founder" } | null {
  if (!productId) return null;
  if (productId === env.COMMAS_PRODUCT_ID_GA) return { tier: "ga" };
  if (productId === env.COMMAS_PRODUCT_ID_VIP) return { tier: "vip" };
  if (productId === env.COMMAS_PRODUCT_ID_BUNDLE) return { tier: "bundle" };
  if (productId === env.COMMAS_PRODUCT_ID_FOUNDER) return { tier: "founder" };
  return null;
}

/**
 * True iff the GA recordings bump product id appears in order_bumps.
 * Non-GA tiers cannot bump; callers must enforce that separately.
 */
export function detectGaBump(
  bumpItemIds: string[],
  env: Record<string, string | undefined>,
): boolean {
  const bumpId = env.COMMAS_PRODUCT_ID_GA_BUMP;
  if (!bumpId) return false;
  return bumpItemIds.includes(bumpId);
}

/**
 * Redacted audit payload for challenge_payment_events. Excludes buyer PII
 * (name, email, phone, address, arbitrary metadata). Buyer provider id is
 * kept because it is a non-PII correlation handle.
 */
export function redactEventPayload(env: CommasEnvelope): Record<string, unknown> {
  const d = (env.data ?? {}) as Record<string, unknown>;
  const item = (d.item ?? {}) as Record<string, unknown>;
  const buyer = (d.buyer ?? {}) as Record<string, unknown>;
  const bumps = Array.isArray(d.order_bumps) ? (d.order_bumps as unknown[]) : [];
  const bumpIds: string[] = [];
  for (const b of bumps) {
    if (b && typeof b === "object") {
      const bi = (b as Record<string, unknown>).item as Record<string, unknown> | undefined;
      const id = bi && typeof bi.id === "string" ? bi.id : null;
      if (id) bumpIds.push(id);
    }
  }
  return {
    event_id: env.id,
    event_type: env.type,
    payment_id: typeof d.payment_id === "string" ? d.payment_id : null,
    status: typeof d.status === "string" ? d.status : null,
    amount: typeof d.amount === "number" ? d.amount : null,
    currency: typeof d.currency === "string" ? d.currency : null,
    base_item_id: typeof item.id === "string" ? item.id : null,
    base_item_title: typeof item.title === "string" ? item.title : null,
    bump_item_ids: bumpIds,
    buyer_provider_id: typeof buyer.id === "string" ? buyer.id : null,
  };
}
