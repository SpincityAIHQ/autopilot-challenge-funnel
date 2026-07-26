import type { ProductId } from "./tiers";

/**
 * Canonical email segmentation for the AI AutoPilot 2-Day Summit.
 *
 * The database entitlements remain the source of truth. These labels are the
 * exact values an email provider (Mailchimp, Brevo, etc.) should receive after
 * a verified payment webhook. Purchase tags are cumulative; only one
 * CURRENT-level tag is active at a time.
 */
export type SummitBuyerLevel = "ga" | "vip" | "vault" | "intensive";
export type SummitFunnelProductId = Exclude<ProductId, "mentorship">;

export const SUMMIT_EMAIL_TAGS = {
  buyer: "AAS26 · BUYER",
  ga: "AAS26 · PURCHASED · GA",
  vip: "AAS26 · PURCHASED · VIP",
  vault: "AAS26 · PURCHASED · VAULT",
  intensive: "AAS26 · PURCHASED · INTENSIVE",
  currentGa: "AAS26 · CURRENT · GA",
  currentVip: "AAS26 · CURRENT · VIP",
  currentVault: "AAS26 · CURRENT · VAULT",
  currentIntensive: "AAS26 · CURRENT · INTENSIVE",
} as const;

const CURRENT_TAGS = [
  SUMMIT_EMAIL_TAGS.currentGa,
  SUMMIT_EMAIL_TAGS.currentVip,
  SUMMIT_EMAIL_TAGS.currentVault,
  SUMMIT_EMAIL_TAGS.currentIntensive,
] as const;

export interface SummitEmailSegmentUpdate {
  highestLevel: SummitBuyerLevel;
  mergeFields: {
    SUMMITLVL: "GA" | "VIP" | "VAULT" | "INTENSIVE";
  };
  activateTags: string[];
  deactivateTags: string[];
}

export function buyerLevelForProduct(
  product: SummitFunnelProductId,
): SummitBuyerLevel {
  switch (product) {
    case "ga":
      return "ga";
    case "vip":
    case "vip_upgrade":
      return "vip";
    case "vault":
      return "vault";
    case "intensive":
      return "intensive";
  }
}

/**
 * Returns the provider-side tag delta after a verified purchase.
 *
 * Example: a Vault purchase keeps GA + VIP + Vault history tags, activates
 * CURRENT · VAULT, and removes the other CURRENT-level tags. This lets email
 * journeys stop selling anything already owned while preserving purchase
 * history for support and reporting.
 */
export function emailSegmentUpdateForProduct(
  product: SummitFunnelProductId,
): SummitEmailSegmentUpdate {
  const level = buyerLevelForProduct(product);
  const purchasedTags = [SUMMIT_EMAIL_TAGS.buyer, SUMMIT_EMAIL_TAGS.ga];

  if (level === "vip" || level === "vault" || level === "intensive") {
    purchasedTags.push(SUMMIT_EMAIL_TAGS.vip);
  }
  if (level === "vault" || level === "intensive") {
    purchasedTags.push(SUMMIT_EMAIL_TAGS.vault);
  }
  if (level === "intensive") {
    purchasedTags.push(SUMMIT_EMAIL_TAGS.intensive);
  }

  const currentTag = {
    ga: SUMMIT_EMAIL_TAGS.currentGa,
    vip: SUMMIT_EMAIL_TAGS.currentVip,
    vault: SUMMIT_EMAIL_TAGS.currentVault,
    intensive: SUMMIT_EMAIL_TAGS.currentIntensive,
  }[level];

  return {
    highestLevel: level,
    mergeFields: {
      SUMMITLVL: level.toUpperCase() as
        | "GA"
        | "VIP"
        | "VAULT"
        | "INTENSIVE",
    },
    activateTags: [...purchasedTags, currentTag],
    deactivateTags: CURRENT_TAGS.filter((tag) => tag !== currentTag),
  };
}
