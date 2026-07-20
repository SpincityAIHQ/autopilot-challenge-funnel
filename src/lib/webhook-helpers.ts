/**
 * Server-only helpers for the disabled-by-default Commas webhook.
 * Kept in a client-safe module path so the route can import them, but
 * anything that needs Node crypto MUST run inside the handler.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify HMAC-SHA256 signature over the EXACT raw body.
 * Accepts the header value with or without a "sha256=" prefix.
 * Uses a constant-time compare and never throws for malformed input.
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

  // Only hex chars, sane length
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

/** Commas webhook envelope shape. Extra fields are allowed and ignored. */
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
      typeof parsed.type === "string" &&
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

export function isSupportedEvent(t: string): t is SupportedEvent {
  return t === "payment.succeeded" || t === "product.purchased";
}

export interface ExtractedPayment {
  paymentId: string;
  productId: string | null;
  amountCents: number | null;
  currency: string;
  buyer: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
}

/**
 * Best-effort extraction from Commas payloads.
 * Returns null when the required identifiers aren't present.
 */
export function extractPayment(env: CommasEnvelope): ExtractedPayment | null {
  const d = env.data as Record<string, unknown>;
  const paymentId = typeof d.payment_id === "string" ? d.payment_id : null;
  if (!paymentId) return null;

  const item = (d.item ?? {}) as Record<string, unknown>;
  const product = (d.product ?? {}) as Record<string, unknown>;
  const buyer = (d.buyer ?? {}) as Record<string, unknown>;

  const productId =
    (typeof item.id === "string" && item.id) ||
    (typeof item.product_id === "string" && item.product_id) ||
    (typeof product.id === "string" && product.id) ||
    (typeof d.product_id === "string" && d.product_id) ||
    null;

  const rawAmount =
    (typeof d.amount === "number" && d.amount) ||
    (typeof d.product_price === "number" && d.product_price) ||
    (typeof item.amount === "number" && item.amount) ||
    null;
  const amountCents = typeof rawAmount === "number" ? Math.round(rawAmount) : null;

  const currency =
    (typeof d.currency === "string" && d.currency) ||
    (typeof item.currency === "string" && (item.currency as string)) ||
    "USD";

  return {
    paymentId,
    productId,
    amountCents,
    currency,
    buyer: {
      fullName:
        (typeof buyer.full_name === "string" && buyer.full_name) ||
        (typeof buyer.name === "string" && buyer.name) ||
        null,
      email: typeof buyer.email === "string" ? buyer.email : null,
      phone: typeof buyer.phone === "string" ? buyer.phone : null,
    },
  };
}

/** Env-driven product-id → tier mapping. Unknown ids grant nothing. */
export function resolveTierFromProduct(
  productId: string | null,
  env: Record<string, string | undefined>,
): { tier: "ga" | "vip" | "bundle" | "founder"; bump: boolean } | null {
  if (!productId) return null;
  if (productId === env.COMMAS_PRODUCT_ID_GA) return { tier: "ga", bump: false };
  if (productId === env.COMMAS_PRODUCT_ID_GA_BUMP) return { tier: "ga", bump: true };
  if (productId === env.COMMAS_PRODUCT_ID_VIP) return { tier: "vip", bump: false };
  if (productId === env.COMMAS_PRODUCT_ID_BUNDLE) return { tier: "bundle", bump: false };
  if (productId === env.COMMAS_PRODUCT_ID_FOUNDER) return { tier: "founder", bump: false };
  return null;
}
