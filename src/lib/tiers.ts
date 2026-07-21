/**
 * Tier catalog for The AUTOPILOT Challenge.
 * Prices are the public source of truth for display and math.
 * Payment collection happens through Commas — this app never charges cards.
 *
 * The $22 GA recordings bump is a NATIVE Commas order bump inside the GA
 * checkout. It does NOT change the pre-Commas total shown on this site.
 */

export type TierId = "ga" | "vip" | "bundle" | "founder";

export interface Tier {
  id: TierId;
  name: string;
  priceCents: number;
  headline: string;
  bullets: string[];
  hardCap?: number;
}

export const GA_BUMP_CENTS = 2200;
export const GA_BUMP_LABEL = "Recordings + completed-map template — forever";
export const GA_BUMP_COPY =
  "Recordings are not included. Add both replays and the completed Autonomy Map template for $22 during checkout.";

export const TIERS: readonly Tier[] = [
  {
    id: "ga",
    name: "GA Ticket",
    priceCents: 7700,
    headline:
      "Build your monetizable site, launch assets, and lead + sales system during both live days.",
    bullets: [
      "Sat Aug 1 + Sun Aug 2 · 12–2 PM ET",
      "Full two-day live business build",
      "Companion workbook",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    priceCents: 17700,
    headline:
      "Everything in GA + recordings + one group VIP hour after each day.",
    bullets: [
      "Everything in GA",
      "Group VIP Hour after Day 1 and Day 2",
      "Selected businesses receive a live hot seat; a personal turn is not guaranteed",
      "Recordings included",
    ],
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
  },
  {
    id: "founder",
    name: "Founder Seat",
    priceCents: 111100,
    headline:
      "Everything in the Bundle + 3 months NuAmenti Diamond + Founder access, recognition, meetup, and early MCP beta access.",
    bullets: [
      "Everything in The Bundle",
      "3 months of NuAmenti Diamond at launch",
      "Founding Credits Wall recognition",
      "Signed founding-edition book",
      "Private Founders room in the InnerCITY",
      "Founders Meetup — Sat Aug 8, InvestFest, Atlanta",
      "InvestFest admission, travel, lodging, meals, and transportation are not included",
      "First MCP beta access",
    ],
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
  return (
    value === "ga" ||
    value === "vip" ||
    value === "bundle" ||
    value === "founder"
  );
}

/**
 * Server-side total in cents. Bump is ONLY valid on GA. Kept for webhook
 * reconciliation math; the public site never shows a bumped total.
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
