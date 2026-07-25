/**
 * Public copy for the AI AutoPilot Summit confirmation flow.
 * GA gets the $55 VIP upgrade offer; direct VIP never sees it.
 */

import type { AdmissionTierId } from "./tiers";

export interface ConfirmationContent {
  shortName: string;
  headline: string;
  included: string;
  nextSteps: string[];
  notices: string[];
  videoLabel: string;
  showVipUpgrade: boolean;
}

export const CONFIRMATION_CONTENT: Record<AdmissionTierId, ConfirmationContent> = {
  ga: {
    shortName: "General Admission",
    headline:
      "Thank you, family, for choosing General Admission. We're verifying your payment now.",
    included:
      "Once verified, GA unlocks live online access to both Summit days, the Digital Summit Action Guide, AI Readiness Scorecard, Buyer + Offer Canvas, and live prompt drops.",
    nextSteps: [
      "Your FanBasis receipt confirms payment was received. Your official NuAmenti verification + access email is the authority for entry, links, and resources.",
      "Watch inbox, Promotions, and Spam for both messages. Reply to Info@NuAmenti.com if the NuAmenti email doesn't arrive within a few hours.",
      "Add Aug 24 and Aug 25 to your calendar with the buttons below.",
      "Bring one business, offer, or idea you're ready to map and build.",
      "Exact session start times are sent to registrants closer to the event.",
    ],
    notices: [
      "This confirmation page is display context only — it does not prove purchase. Wait for the NuAmenti verification + access email before treating anything as unlocked.",
      "GA does not include recordings. Below: upgrade to VIP for $55, or keep GA and continue to the Implementation Vault.",
    ],
    videoLabel: "Watch: your first move as a GA registrant",
    showVipUpgrade: true,
  },
  vip: {
    shortName: "VIP Experience",
    headline:
      "Thank you, family, for choosing the VIP Experience. We're verifying your payment now.",
    included:
      "Once verified, VIP includes everything in GA plus 30-day recordings, one live VIP Implementation Lab, priority Q&A, the VIP Proposal + Outreach Kit, and the VIP Resource Vault.",
    nextSteps: [
      "Your FanBasis receipt confirms payment was received. Your official NuAmenti verification + access email is the authority for entry, VIP Lab invite, and resources.",
      "Watch inbox, Promotions, and Spam. Reply to Info@NuAmenti.com if the NuAmenti email doesn't arrive within a few hours.",
      "Add Aug 24 and Aug 25 to your calendar with the buttons below.",
      "Priority Q&A submission link comes with your NuAmenti welcome pack.",
    ],
    notices: [
      "This confirmation page is display context only — it does not prove purchase. Recordings and VIP resources unlock via the secure link in your NuAmenti access email, never from a public URL.",
    ],
    videoLabel: "Watch: your VIP welcome from the family",
    showVipUpgrade: false,
  },
};


export function getConfirmationContent(
  tier: AdmissionTierId | null,
): ConfirmationContent | null {
  if (!tier) return null;
  return CONFIRMATION_CONTENT[tier];
}
