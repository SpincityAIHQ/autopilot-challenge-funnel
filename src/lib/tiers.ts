/**
 * AI AutoPilot 2-Day Summit — product catalog.
 *
 * Public price visibility rule:
 *   $22 GA        — visible only on /checkout.
 *   $77 VIP       — visible only after verified GA.
 *   $199 Vault    — visible only after verified VIP.
 *   $1,000 Intensive — visible only after verified Vault access.
 *
 * All money is stored in cents. Payment collection lives on Commas/FanBasis;
 * this app never handles card data and never fulfills from URL query strings.
 */

export type AdmissionTierId = "ga";
export type ProductId = "ga" | "vip" | "vip_upgrade" | "vault" | "intensive" | "mentorship";

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
      "Join both live working days and build the operating foundation for your AI-powered business.",
    bullets: [
      "Live online · Sat Aug 29 + Sun Aug 30 · 11:00 AM–4:00 PM Eastern",
      "Room opens at 10:45 AM Eastern both days",
      "Energy + Operator Mindset Session",
      "AI-for-Business Literacy + LLM Setup",
      "Niche + Offer Map",
      "Business Infrastructure Map",
      "AI Agent Team Chart",
      "First Measurable Workflow + Loop Builder",
      "GA does not include session recordings",
    ],
  },
] as const;

export const TIER_MAP: Record<AdmissionTierId, Tier> = TIERS.reduce(
  (acc, tier) => {
    acc[tier.id] = tier;
    return acc;
  },
  {} as Record<AdmissionTierId, Tier>,
);

export function isTierId(value: unknown): value is AdmissionTierId {
  return value === "ga";
}

/**
 * VIP stays in the catalog so the private offer page, webhook, and entitlement
 * model all use the same benefit set. It is not a direct public ticket.
 */
export const VIP_SPEC = {
  name: "VIP Implementation Experience",
  shortName: "VIP Access",
  priceCents: 7700,
  headline:
    "Add recordings, the live VIP Build Lab, and the reusable tools to build your app, business GPS, and internal AI agent team.",
  bullets: [
    "Everything in General Admission",
    "30-day session recordings",
    "VIP Build Lab · Sun Aug 30 · 4:15–5:45 PM Eastern",
    "Join the Lab right after the main Summit ends",
    "Priority question submission",
    "MVP App Builder",
    "AI Business GPS",
    "Internal Agent Builder Skill",
    "AI Agent Hiring + Workflow Kit",
    "VIP Implementation Resources",
  ],
} as const;

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
    priceCents: 7700,
    summary:
      "Keep the momentum going when Day 2 ends. Stay for the live VIP Build Lab, get 30-day recordings, and unlock the MVP App Builder, AI Business GPS, and Internal Agent Builder Skill.",
    bullets: [
      "Requires verified General Admission on the same email",
      "30-day session recordings",
      "VIP Build Lab · Sun Aug 30 · 4:15–5:45 PM Eastern",
      "Join the Lab right after the main Summit ends",
      "Priority questions",
      "MVP App Builder",
      "AI Business GPS",
      "Internal Agent Builder Skill",
      "AI Agent Hiring + Workflow Kit",
      "VIP Implementation Resources",
    ],
  },
  vault: {
    id: "vault",
    name: "Emerald Vault Key",
    priceCents: 19900,
    summary:
      "Add the private, unlisted Day 3 Vault Opener Class and two additional live hours with Spin.",
    bullets: [
      "Secret Day 3 Vault Opener Class with Spin",
      "Two additional live implementation hours with Spin",
      "Private room details delivered after purchase",
      "30 days of NuAmenti 3 Gold",
      "Full NuAmenti 3 Day recording",
    ],
  },
  intensive: {
    id: "intensive",
    name: "Strategy & Build Intensive",
    priceCents: 100000,
    summary:
      "A private two-hour session to find the main bottleneck, design the right system, and build the next working piece with Spin.",
    bullets: [
      "Two-hour private strategy + build session",
      "One clear system or workflow built around your business",
      "Only 10 total slots",
      "For verified Vault holders and approved attendees",
    ],
    hardCap: 10,
  },
  mentorship: {
    id: "mentorship",
    name: "8-Week Mentorship & Work-Along",
    priceCents: 800000,
    summary: "Eight weeks of guided building with the NuAmenti team for approved applicants.",
    bullets: [
      "Eight-week guided implementation",
      "Application required",
      "Separate from the private Intensive",
    ],
  },
};

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

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
