import { formatUsd, TIER_MAP, type TierId } from "./tiers";

export interface OfferExplainerContent {
  title: string;
  videoLabel: string;
  summary: string;
  fit: string;
}

export const OFFER_EXPLAINERS: Record<TierId, OfferExplainerContent> = {
  ga: {
    title: "Before you choose GA",
    videoLabel: "Watch: GA explained in under a minute",
    summary:
      "GA is $77. It includes both four-hour live build days and the challenge workbook. Recordings are not included unless you add the $22 recordings option at checkout.",
    fit: "Choose GA if you can attend live and want the full core build without the extra access.",
  },
  vip: {
    title: "Before you choose VIP",
    videoLabel: "Watch: VIP explained in under a minute",
    summary:
      "VIP is $177. It includes everything in GA, the recordings, and one group VIP hour after each live day. Selected businesses receive a hot seat, so a personal turn is not promised.",
    fit: "Choose VIP if you want the replays and more live support around your build.",
  },
  bundle: {
    title: "Before you choose the Bundle",
    videoLabel: "Watch: the Bundle explained in under a minute",
    summary:
      "The Bundle is $333. It includes everything in VIP, the AI+AI=AI 2 founding-edition preorder, the companion PDF workbook, and 60 days of NuAmenti Gold starting August 10.",
    fit: "Choose the Bundle if you want the challenge plus resources and NuAmenti access to keep building after the weekend.",
  },
  founder: {
    title: "Before you claim a Founder Seat",
    videoLabel: "Watch: the Founder Seat explained",
    summary:
      "The Founder Seat is $1,111 and is capped at 33 verified purchases. It includes everything in the Bundle plus three months of NuAmenti Diamond starting August 10, the Founding Credits Wall, a signed book, the InnerCITY Founders room, the August 8 Atlanta Meetup, and first MCP beta access.",
    fit: "Choose Founder only if you will use the Founder room, Diamond access, product recognition, beta access, and Atlanta Meetup. InvestFest admission, travel, lodging, and meals are not included.",
  },
};

export interface ConfirmationContent {
  shortName: string;
  title: string;
  videoLabel: string;
  included: string;
  nextSteps: readonly string[];
  notices: readonly string[];
}

const COMMON_PREP = [
  "Save your FanBasis receipt and the challenge access email.",
  "Download the workbook when the access email arrives.",
  "Choose one real offer for your new site to sell.",
  "Gather your logo, photos, account logins, and payment or booking link.",
] as const;

export const CONFIRMATION_CONTENT: Record<TierId, ConfirmationContent> = {
  ga: {
    shortName: "GA",
    title: "What happens next with General Access",
    videoLabel: "Watch: your GA next steps",
    included:
      "GA includes both four-hour live challenge days and the workbook.",
    nextSteps: [
      "Add both live sessions, 12–4 PM ET, to your calendar.",
      ...COMMON_PREP,
    ],
    notices: [
      "Recordings are included only if your FanBasis receipt lists the $22 Recordings Add-On.",
    ],
  },
  vip: {
    shortName: "VIP",
    title: "What happens next with VIP Access",
    videoLabel: "Watch: your VIP next steps",
    included:
      "VIP includes both four-hour live days, the workbook, recordings, and the group VIP hour after each day.",
    nextSteps: [
      "Add the 12–4 PM ET live sessions and 4–5 PM ET VIP hours to your calendar.",
      ...COMMON_PREP,
      "Write down one clear question for the group hot-seat sessions.",
    ],
    notices: [
      "Selected businesses receive a live hot seat. A personal turn is not guaranteed.",
    ],
  },
  bundle: {
    shortName: "Bundle",
    title: "What happens next with Bundle Access",
    videoLabel: "Watch: your Bundle next steps",
    included:
      "The Bundle includes the full VIP experience, the AI+AI=AI 2 founding-edition preorder, the companion PDF workbook, and 60 days of NuAmenti Gold.",
    nextSteps: [
      "Add the 12–4 PM ET live sessions and 4–5 PM ET VIP hours to your calendar.",
      ...COMMON_PREP,
      "Confirm your email and shipping address on your receipt.",
      "Watch for your companion PDF and your NuAmenti Gold activation on August 10.",
    ],
    notices: ["The physical founding-edition book ships in Q4 2026."],
  },
  founder: {
    shortName: "Founder",
    title: "What happens next with your Founder Seat",
    videoLabel: "Watch: your Founder next steps",
    included:
      "Founder includes every Bundle benefit plus three months of NuAmenti Diamond, the Founding Credits Wall, a signed book, the InnerCITY Founders room, the August 8 Atlanta Meetup, and first MCP beta access.",
    nextSteps: [
      "Add the 12–4 PM ET live sessions and 4–5 PM ET VIP hours to your calendar.",
      ...COMMON_PREP,
      "Complete the Founder onboarding form when it arrives.",
      "Confirm the exact name for the Founding Credits Wall and your shipping address.",
      "Watch for the private Founders room invite and RSVP details for the August 8 Atlanta Meetup.",
    ],
    notices: [
      "NuAmenti Diamond starts August 10. The signed book ships in Q4 2026.",
      "InvestFest admission, travel, lodging, meals, and transportation are not included.",
      "A Founder Seat is not equity, shares, profit-sharing, or an investment.",
    ],
  },
};

export function getOfferExplainer(tier: TierId): OfferExplainerContent {
  return OFFER_EXPLAINERS[tier];
}

export function getConfirmationContent(
  tier: TierId | null,
): ConfirmationContent | null {
  return tier ? CONFIRMATION_CONTENT[tier] : null;
}

export function offerContinueLabel(tier: TierId): string {
  const item = TIER_MAP[tier];
  if (tier === "founder") return "Continue with Founder — $1,111";
  if (tier === "bundle") return "Continue with the Bundle — $333";
  return `Continue with ${item.name} — ${formatUsd(item.priceCents)}`;
}
