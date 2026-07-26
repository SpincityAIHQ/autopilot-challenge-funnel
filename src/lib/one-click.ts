/**
 * Saved-card one-click upgrades — shared, browser-safe definitions.
 *
 * This module is imported by client components. It must NEVER contain an API
 * key, a Commas customer id, a payment-method id, or any endpoint path. The
 * only card information that is allowed to cross to the browser is the brand
 * and the last four digits, which is what `SavedCardDisplay` carries.
 *
 * Scope decision (deliberate, do not widen without an explicit decision):
 * one-click charging is limited to the $77 VIP upgrade and the $199 Vault.
 * The $1,000 Intensive always goes through a full Commas checkout because it
 * holds real seat inventory, is a materially larger charge, and carries a
 * higher dispute risk. One-clicking $1,000 would trade trust and chargeback
 * protection for a small amount of friction.
 */

import { formatUsd } from "./tiers";

export const ONE_CLICK_PRODUCTS = ["vip_upgrade", "vault"] as const;

export type OneClickProduct = (typeof ONE_CLICK_PRODUCTS)[number];

export function isOneClickProduct(value: unknown): value is OneClickProduct {
  return typeof value === "string" && (ONE_CLICK_PRODUCTS as readonly string[]).includes(value);
}

/** The only card fields the server is ever allowed to send to the browser. */
export interface SavedCardDisplay {
  brand: string;
  last4: string;
}

/** Human offer name used in button labels. Kept short for mobile. */
export const ONE_CLICK_OFFER_LABEL: Record<OneClickProduct, string> = {
  vip_upgrade: "Add VIP",
  vault: "Add the Vault",
};

/** Where the buyer continues after a confirmed one-click charge. */
export const ONE_CLICK_NEXT_PATH: Record<OneClickProduct, string> = {
  vip_upgrade: "/offer/implementation-vault",
  vault: "/strategy-intensive",
};

/**
 * Renders `Add VIP · $77 with Visa •••• 4242`.
 * Falls back to the plain offer label when no saved card is known.
 */
export function oneClickButtonLabel(
  product: OneClickProduct,
  priceCents: number,
  card: SavedCardDisplay | null,
): string {
  const base = `${ONE_CLICK_OFFER_LABEL[product]} · ${formatUsd(priceCents)}`;
  if (!card) return base;
  return `${base} with ${card.brand} •••• ${card.last4}`;
}

/** Renders `Continue to Secure Checkout · $77` for the fallback path. */
export function secureCheckoutLabel(priceCents: number): string {
  return `Continue to Secure Checkout · ${formatUsd(priceCents)}`;
}

/**
 * The disclosure shown directly under a one-click button. States the exact
 * amount, the exact card, that the charge happens once, and that nothing
 * recurring is created.
 */
export function oneClickDisclosure(priceCents: number, card: SavedCardDisplay): string {
  return `One click authorizes a one-time ${formatUsd(priceCents)} charge to ${card.brand} •••• ${card.last4}. No subscription.`;
}

/**
 * Shown after an ambiguous or delayed charge result. The buyer must not click
 * again — the server has already recorded an attempt that may have taken the
 * money, and a second attempt could double-charge.
 */
export const ONE_CLICK_DO_NOT_RETRY_MESSAGE =
  "We are confirming this charge with the payment processor. Do not click again. Your access opens automatically as soon as it clears, and your receipt will arrive by email. If nothing arrives within an hour, email Info@NuAmenti.com.";

/**
 * Sequential-funnel eligibility, computed from live entitlement scopes.
 *
 * Fails closed in both directions: a buyer who has not reached the previous
 * rung is not eligible, and a buyer who already owns the offer is not eligible
 * either (so a stale page cannot charge twice for the same thing).
 *
 * This is the UX affordance. The security boundary is `begin_one_click_charge`
 * in the database, which re-checks the same rules before any money moves.
 */
export function isEligibleForOneClick(product: OneClickProduct, scopes: string[]): boolean {
  const owned = new Set(scopes);
  const hasVip = owned.has("vip") || owned.has("vip_upgrade");
  if (product === "vip_upgrade") {
    return owned.has("ga") && !hasVip;
  }
  return hasVip && !owned.has("vault");
}

/** Shape returned by GET /api/public/one-click-upgrade. */
export interface OneClickAvailability {
  /** True only when a saved card was found AND the buyer is eligible. */
  oneClickAvailable: boolean;
  card: SavedCardDisplay | null;
  priceCents: number;
  /** True once a charge for this product already exists for the buyer. */
  alreadyOwned: boolean;
  /** True when an earlier attempt is pending or ambiguous. */
  awaitingConfirmation: boolean;
}
