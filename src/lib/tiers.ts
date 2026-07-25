/**
 * AI AutoPilot Summit — product catalog (SEQUENTIAL ASCENSION FUNNEL).
 *
 * Public price visibility rule:
 *   $22 GA        — visible ONLY on /checkout (first funnel offer page).
 *   $77 VIP        — visible ONLY on the post-GA offer page (/offer/vip-upgrade).
 *   $199 Vault    — visible ONLY on /offer/implementation-vault (noindex).
 *   $1,000 Intensive — visible ONLY on /strategy-intensive (noindex).
 * The public landing page (/) shows NO prices and NO later-offer links.
 *
 * Legacy note:
 *   `vip_upgrade` was previously priced at the "price difference".
 *   In the sequential funnel it is the FULL $77 VIP Implementation
 *   Experience offered after verified GA purchase — no "difference" math,
 *   no direct VIP admission offered from the public site.
 *
 * All money in cents. Payment collection lives on Commas/FanBasis; this
 * app never handles card data and never fulfills from URL query strings.
 */

export type AdmissionTierId = "ga";
export type ProductId =
  | "ga"
  | "vip"
  | "vip_upgrade"
  | "vault"
  | "intensive"
  | "mentorship";

export type TierId = AdmissionTierId;

export interface Tier {
  id: AdmissionTierId;
  name: string;
  shortName: string;
  priceCents: number;
  headline: string;
  bullets: string[];
}

/**
 * Public tier catalog. Only General Admission is a public purchase — every
 * later offer is post-verification, gated to its own private funnel page.
 */
export const TIERS: readonly Tier[] = [
  {
    id: "ga",
    name: "General Admission",
    shortName: "GA Ticket",
    priceCents: 2200,
    headline:
      "Live online access to both Summit days plus the core implementation toolkit.",
    bullets: [
      "Live online access · Aug 24 + Aug 25, 2026",
      "Digital Summit Action Guide",
      "AI Readiness Scorecard",
      "Buyer + Offer Canvas",
      "Live prompt drops and implementation notes",
      "GA does not include session recordings",
    ],
  },
] as const;

export const TIER_MAP: Record<AdmissionTierId, Tier> = TIERS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<AdmissionTierId, Tier>,
);

export function isTierId(value: unknown): value is AdmissionTierId {
  return value === "ga";
}

/**
 * VIP admission spec — kept as a catalog entry (not a public tier) so the
 * webhook, entitlements, and the $77 VIP Implementation Experience page can
 * reference the same benefit set. Not offered as a direct public purchase.
 */
export const VIP_SPEC = {
  name: "VIP Experience",
  shortName: "VIP Ticket",
  priceCents: 7700,
  headline:
    "Everything in GA plus recordings, a VIP Implementation Lab, priority Q&A, and the outreach vault.",
  bullets: [
    "Everything in GA",
    "30-day session recordings",
    "One live VIP Implementation Lab",
    "Priority Q&A submission",
    "VIP Proposal + Outreach Kit",
    "VIP Resource Vault",
  ],
} as const;

/** Post-purchase and post-Summit products (not admission tickets). */
export interface UpsellProduct {
  id: Exclude<ProductId, "ga">;
  name: string;
  priceCents: number;
  summary: string;
  bullets: string[];
  hardCap?: number;
}

export const UPSELLS: Record<UpsellProduct["id"], UpsellProduct> = {
  vip: {
    id: "vip",
    name: VIP_SPEC.name,
    priceCents: VIP_SPEC.priceCents,
    summary: VIP_SPEC.headline,
    bullets: [...VIP_SPEC.bullets],
  },
  vip_upgrade: {
    id: "vip_upgrade",
    name: "VIP Implementation Experience",
    // Sequential funnel: full $77 VIP price for GA holders — NOT a difference.
    priceCents: 7700,
    summary:
      "The full VIP Implementation Experience for verified GA registrants. Adds 30-day session recordings, one live VIP Implementation Lab, priority Q&A, the VIP Proposal + Outreach Kit, and the VIP Resource Vault.",
    bullets: [
      "Requires a verified GA registration on the same email",
      "30-day session recordings",
      "One live VIP Implementation Lab",
      "Priority Q&A + VIP Resource Vault",
      "VIP Proposal + Outreach Kit",
    ],
  },
  vault: {
    id: "vault",
    name: "AI AutoPilot Implementation Vault",
    priceCents: 19900,
    summary:
      "The full implementation stack: prompts, blueprints, calendar, and proposal builder. Post-VIP add-on — admission and recordings are purchased separately.",
    bullets: [
      "Company Brain Starter Kit",
      "AI sales and follow-up agent prompt stack",
      "Lovable funnel and site blueprint",
      "30-day campaign calendar",
      "Corporate proposal builder",
      "Autonomy Map and SOP templates",
      "Curated tool-stack and affiliate directory with clear disclosures",
    ],
  },
  intensive: {
    id: "intensive",
    name: "Strategy & Build Intensive",
    priceCents: 100000,
    summary:
      "A two-hour private 1-on-1 session. Only 10 total, exclusively for verified Vault holders and operator-approved attendees.",
    bullets: [
      "Two-hour private 1-on-1 strategy + build session",
      "10 total slots · atomic inventory",
      "For verified Vault holders and operator-approved attendees",
    ],
    hardCap: 10,
  },
  mentorship: {
    id: "mentorship",
    name: "8-Week Mentorship & Work-Along",
    priceCents: 800000,
    summary:
      "Application-based. Eight weeks of guided implementation alongside the NuAmenti team.",
    bullets: [
      "Eight-week guided implementation",
      "Application-based; separate from the 10 intensive slots",
    ],
  },
};

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Expected total for a Summit product. */
export function expectedTotalCents(product: ProductId): number {
  switch (product) {
    case "ga":
      return TIER_MAP.ga.priceCents;
    case "vip":
      return UPSELLS.vip.priceCents;
    case "vip_upgrade":
      return UPSELLS.vip_upgrade.priceCents;
    case "vault":
      return UPSELLS.vault.priceCents;
    case "intensive":
      return UPSELLS.intensive.priceCents;
    case "mentorship":
      return UPSELLS.mentorship.priceCents;
  }
}

export const INTENSIVE_HARD_CAP = UPSELLS.intensive.hardCap!;
