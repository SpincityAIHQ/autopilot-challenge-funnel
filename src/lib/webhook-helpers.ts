/**
 * Server-only helpers for the Commas webhook — Summit product graph.
 *
 * Envelope: { id, type, data: { ... } }
 * Monetary values are DECIMAL DOLLARS — convert with Math.round(v * 100).
 * Canonical fulfillment event: `payment.succeeded` (data.status === "succeeded").
 * `product.purchased` is audit-only — NEVER fulfills.
 * Refund/failure events reverse via reverse_summit_payment RPC.
 *
 * Product ids (env-driven, unknown → grants nothing):
 *   COMMAS_PRODUCT_ID_GA           → 'ga'          ($22)
 *   COMMAS_PRODUCT_ID_VIP          → 'vip'         ($77)
 *   COMMAS_PRODUCT_ID_VIP_UPGRADE  → 'vip_upgrade' ($77 — post-GA VIP Implementation Experience)
 *   COMMAS_PRODUCT_ID_VAULT        → 'vault'       ($199, OTO)
 *   COMMAS_PRODUCT_ID_INTENSIVE    → 'intensive'   ($1,000, cap 10)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { expectedTotalCents, type ProductId } from "./tiers";

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
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
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

export type SupportedEvent =
  | "payment.succeeded"
  | "product.purchased"
  | "payment.refunded"
  | "payment.failed"
  | "payment.disputed";

export const CANONICAL_FULFILLMENT_EVENT: SupportedEvent = "payment.succeeded";

export function isSupportedEvent(t: string): t is SupportedEvent {
  return (
    t === "payment.succeeded" ||
    t === "product.purchased" ||
    t === "payment.refunded" ||
    t === "payment.failed" ||
    t === "payment.disputed"
  );
}

export function isReversalEvent(t: string): boolean {
  return t === "payment.refunded" || t === "payment.failed" || t === "payment.disputed";
}

export function dollarsToCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return null;
  return Math.round(value * 100);
}

export interface ExtractedPayment {
  paymentId: string;
  status: string;
  baseItemId: string;
  amountCents: number;
  currency: string;
  buyer: {
    fullName: string;
    email: string;
    phone: string | null;
    providerId: string | null;
  };
}

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
  const rawCurrency = typeof d.currency === "string" ? d.currency.trim() : "";
  if (!rawCurrency) return null;
  const currency = rawCurrency.toUpperCase();
  const buyer = (d.buyer ?? {}) as Record<string, unknown>;
  const email = typeof buyer.email === "string" ? buyer.email.trim() : "";
  const fullName =
    (typeof buyer.name === "string" && buyer.name.trim()) ||
    (typeof buyer.full_name === "string" &&
      (buyer.full_name as string).trim()) ||
    "";
  if (!email || !fullName) return null;
  const phone =
    typeof buyer.phone === "string" && buyer.phone ? buyer.phone : null;
  const providerId =
    typeof buyer.id === "string" && buyer.id ? buyer.id : null;
  return {
    paymentId,
    status,
    baseItemId,
    amountCents,
    currency,
    buyer: { fullName, email, phone, providerId },
  };
}

export function extractPaymentIdForReversal(env: CommasEnvelope): string | null {
  const d = env.data as Record<string, unknown>;
  const pid = typeof d.payment_id === "string" ? d.payment_id : "";
  return pid || null;
}

export function resolveProductFromItem(
  itemId: string | null,
  env: Record<string, string | undefined>,
): ProductId | null {
  if (!itemId) return null;
  if (itemId === env.COMMAS_PRODUCT_ID_GA) return "ga";
  if (itemId === env.COMMAS_PRODUCT_ID_VIP) return "vip";
  if (itemId === env.COMMAS_PRODUCT_ID_VIP_UPGRADE) return "vip_upgrade";
  if (itemId === env.COMMAS_PRODUCT_ID_VAULT) return "vault";
  if (itemId === env.COMMAS_PRODUCT_ID_INTENSIVE) return "intensive";
  return null;
}

export { expectedTotalCents };

export interface WebhookConfigResult {
  ok: boolean;
  reason?: string;
}

/**
 * Webhook activation gate. Requires enabled flag, secret, and the five
 * core product IDs (GA, VIP, VIP_UPGRADE, Vault, Intensive), pairwise distinct.
 */
export function validateWebhookConfig(
  env: Record<string, string | undefined>,
): WebhookConfigResult {
  if (env.COMMAS_WEBHOOKS_ENABLED !== "true")
    return { ok: false, reason: "disabled" };
  const secret = env.COMMAS_WEBHOOK_SECRET;
  if (!secret || secret.trim() === "")
    return { ok: false, reason: "no secret" };
  const ids = [
    env.COMMAS_PRODUCT_ID_GA,
    env.COMMAS_PRODUCT_ID_VIP,
    env.COMMAS_PRODUCT_ID_VIP_UPGRADE,
    env.COMMAS_PRODUCT_ID_VAULT,
    env.COMMAS_PRODUCT_ID_INTENSIVE,
  ];
  for (const id of ids) {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return { ok: false, reason: "missing product id" };
    }
  }
  const set = new Set(ids.map((s) => (s as string).trim()));
  if (set.size !== ids.length)
    return { ok: false, reason: "duplicate product id" };
  return { ok: true };
}

/** Redacted audit payload. Excludes buyer name, email, phone, address, metadata. */
export function redactEventPayload(
  env: CommasEnvelope,
): Record<string, unknown> {
  const d = (env.data ?? {}) as Record<string, unknown>;
  const item = (d.item ?? {}) as Record<string, unknown>;
  const buyer = (d.buyer ?? {}) as Record<string, unknown>;
  return {
    event_id: env.id,
    event_type: env.type,
    payment_id: typeof d.payment_id === "string" ? d.payment_id : null,
    status: typeof d.status === "string" ? d.status : null,
    amount: typeof d.amount === "number" ? d.amount : null,
    currency: typeof d.currency === "string" ? d.currency : null,
    base_item_id: typeof item.id === "string" ? item.id : null,
    base_item_title: typeof item.title === "string" ? item.title : null,
    buyer_provider_id: typeof buyer.id === "string" ? buyer.id : null,
  };
}
