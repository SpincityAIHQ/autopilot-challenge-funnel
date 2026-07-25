/**
 * Public copy for the AI AutoPilot Summit confirmation flow.
 * Warm, family-centered voice per project knowledge. Nothing here fulfills
 * anything — the receipt email and server-verified entitlement do.
 */

import type { AdmissionTierId } from "./tiers";

export interface ConfirmationContent {
  shortName: string;
  headline: string;
  included: string;
  nextSteps: string[];
  notices: string[];
  videoLabel: string;
}

export const CONFIRMATION_CONTENT: Record<AdmissionTierId, ConfirmationContent> =
  {
    ga: {
      shortName: "General Admission",
      headline:
        "Thank you, family — you're officially registered with the GA Ticket.",
      included:
        "GA includes live online access to both Summit days, the Digital Summit Action Guide, AI Readiness Scorecard, Buyer + Offer Canvas, and live prompt drops.",
      nextSteps: [
        "Check your inbox for the FanBasis receipt and NuAmenti welcome email — also check Promotions and Spam.",
        "Add Aug 24 and Aug 25 to your calendar using the buttons below.",
        "Bring one business, offer, or idea you're ready to map and build.",
        "Session start times are sent to registrants closer to the event.",
      ],
      notices: [
        "GA does not include session recordings. If you want the 30-day replay library, upgrade to VIP or add the Implementation Vault below.",
      ],
    },
    vip: {
      shortName: "VIP Experience",
      headline:
        "Thank you, family — you're officially registered with the VIP Ticket.",
      included:
        "VIP includes everything in GA plus 30-day recordings, one live VIP Implementation Lab, priority Q&A, the VIP Proposal + Outreach Kit, and the VIP Resource Vault.",
      nextSteps: [
        "Check your inbox for the FanBasis receipt and NuAmenti welcome email — also check Promotions and Spam.",
        "Add Aug 24 and Aug 25 to your calendar using the buttons below.",
        "Watch for the VIP Implementation Lab invite in a separate email.",
        "Priority Q&A submission link comes with your welcome pack.",
      ],
      notices: [
        "Recordings unlock via a secure link in your welcome email — never from a public URL.",
      ],
    },
  };

export function getConfirmationContent(
  tier: AdmissionTierId | null,
): ConfirmationContent | null {
  if (!tier) return null;
  return CONFIRMATION_CONTENT[tier];
}
