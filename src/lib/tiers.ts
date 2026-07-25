/**
 * AI AutoPilot Summit — product catalog.
 *
 * Public admission has TWO tiers only: GA ($22) and VIP ($77).
 * The $199 Implementation Vault is a post-purchase OTO/add-on, NOT
 * a third admission ticket. The $1,000 Strategy & Build Intensive and
 * the $8,000 Mentorship are separate post-Summit offers.
 *
 * All money in cents. Payment collection lives on Commas; this app
 * never handles card data and never fulfills from URL query strings.
 */

export type AdmissionTierId = "ga" | "vip";
export type ProductId = "ga" | "vip" | "vault" | "intensive" | "mentorship";

// Backwards-compat name for older imports still in the tree.
export type TierId = AdmissionTierId;

export interface Tier {
  id: AdmissionTierId;
  name: string;
  shortName: string;
  priceCents: number;
  headline: string;
  bullets: string[];
}

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
  {
    id: "vip",
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
  return value === "ga" || value === "vip";
}

/** Post-purchase and post-Summit products (not admission tickets). */
export interface UpsellProduct {
  id: Exclude<ProductId, "ga" | "vip">;
  name: string;
  priceCents: number;
  summary: string;
  bullets: string[];
  hardCap?: number;
}

export const UPSELLS: Record<UpsellProduct["id"], UpsellProduct> = {
  vault: {
    id: "vault",
    name: "AI AutoPilot Implementation Vault",
    priceCents: 19900,
    summary:
      "The full implementation stack: prompts, blueprints, calendar, and proposal builder. Post-purchase add-on — admission is purchased separately.",
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
      "A two-hour private session. Only 10 total, exclusively for NuAmenti and Summit attendees.",
    bullets: [
      "Two-hour private strategy + build session",
      "10 total slots · atomic inventory",
      "For NuAmenti and Summit attendees only",
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

/** Expected total for a Summit product. Bumps do not exist in the new model. */
export function expectedTotalCents(product: ProductId): number {
  switch (product) {
    case "ga":
    case "vip":
      return TIER_MAP[product].priceCents;
    case "vault":
      return UPSELLS.vault.priceCents;
    case "intensive":
      return UPSELLS.intensive.priceCents;
    case "mentorship":
      return UPSELLS.mentorship.priceCents;
  }
}

export const INTENSIVE_HARD_CAP = UPSELLS.intensive.hardCap!;
