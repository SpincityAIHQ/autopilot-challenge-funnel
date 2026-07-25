/**
 * AI AutoPilot Summit — product catalog.
 *
 * Admission tickets: GA ($22), VIP ($77).
 * VIP Upgrade ($55) is an OTO offered ONLY to GA buyers on /confirmed.
 * Vault ($199) is a post-registration add-on requiring GA or VIP.
 * Strategy Intensive ($1,000) is capped atomically at 10 and requires
 * Summit registration OR operator-created eligibility.
 * Mentorship ($8,000) is application-based, separate from the Intensive.
 *
 * All money in cents. Payment collection lives on Commas; this app never
 * handles card data and never fulfills from URL query strings.
 */

export type AdmissionTierId = "ga" | "vip";
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
  vip_upgrade: {
    id: "vip_upgrade",
    name: "GA → VIP Upgrade",
    priceCents: 5500,
    summary:
      "Upgrade your GA registration to VIP for the same price difference. Adds 30-day recordings, the VIP Implementation Lab, priority Q&A, and the outreach vault.",
    bullets: [
      "Upgrade a verified GA seat only",
      "30-day session recordings",
      "One live VIP Implementation Lab",
      "Priority Q&A + VIP Resource Vault",
    ],
  },
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

/** Expected total for a Summit product. */
export function expectedTotalCents(product: ProductId): number {
  switch (product) {
    case "ga":
    case "vip":
      return TIER_MAP[product].priceCents;
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
