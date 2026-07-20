/**
 * Tier catalog for The AUTOPILOT Challenge.
 * Prices are the public source of truth for display and math.
 * Payment collection happens through Commas — this app never charges cards itself.
 */

export type TierId = "ga" | "vip" | "bundle" | "founder";

export interface Tier {
  id: TierId;
  name: string;
  priceCents: number;
  headline: string;
  bullets: string[];
  bumpEligible: boolean;
  hardCap?: number;
}

export const GA_BUMP_CENTS = 2200;
export const GA_BUMP_LABEL = "Recordings + completed-map template — forever";

export const TIERS: readonly Tier[] = [
  {
    id: "ga",
    name: "GA Ticket",
    priceCents: 7700,
    headline: "Both live days + workbook.",
    bullets: [
      "Sat Aug 1 + Sun Aug 2 · 12–2 PM ET",
      "Companion workbook",
      "Live Q&A both days",
    ],
    bumpEligible: true,
  },
  {
    id: "vip",
    name: "VIP",
    priceCents: 17700,
    headline: "GA + VIP Hour after each day with live hot seats + recordings.",
    bullets: [
      "Everything in GA",
      "VIP Hour after Day 1 and Day 2 with live hot seats",
      "Recordings included",
    ],
    bumpEligible: false,
  },
  {
    id: "bundle",
    name: "The Bundle",
    priceCents: 33300,
    headline:
      "VIP + AI+AI=AI 2 founding-edition pre-order + companion PDF workbook now + 60 days NuAmenti Gold activating Aug 10.",
    bullets: [
      "Everything in VIP",
      "AI+AI=AI 2 founding-edition pre-order (ships Q4 2026)",
      "Companion PDF workbook — delivered now",
      "60 days of NuAmenti Gold, activating Aug 10",
    ],
    bumpEligible: false,
  },
  {
    id: "founder",
    name: "Founder Seat",
    priceCents: 88800,
    headline:
      "Bundle + 3 months NuAmenti Diamond at launch + Founding Credits Wall + signed founding-edition book + private Founders room in the InnerCITY + Founders Meetup at InvestFest (Sat Aug 8, Atlanta) + first MCP beta access.",
    bullets: [
      "Everything in The Bundle",
      "3 months of NuAmenti Diamond at launch",
      "Founding Credits Wall recognition",
      "Signed founding-edition book",
      "Private Founders room in the InnerCITY",
      "Founders Meetup — Sat Aug 8, InvestFest, Atlanta",
      "First MCP beta access",
    ],
    bumpEligible: false,
    hardCap: 33,
  },
] as const;

export const TIER_MAP: Record<TierId, Tier> = TIERS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TierId, Tier>,
);

export function isTierId(value: unknown): value is TierId {
  return value === "ga" || value === "vip" || value === "bundle" || value === "founder";
}

/**
 * Compute the total in cents.
 * Bump is ONLY allowed on GA. Any other tier ignores the bump flag.
 */
export function computeTotalCents(tier: TierId, bump: boolean): number {
  const base = TIER_MAP[tier].priceCents;
  const bumpAmount = tier === "ga" && bump ? GA_BUMP_CENTS : 0;
  return base + bumpAmount;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const FOUNDER_HARD_CAP = 33;
export const FOUNDER_DISCLAIMER =
  "The Founder Seat is a founding-member package — not equity, shares, an investment, profit participation, or profit-sharing.";
