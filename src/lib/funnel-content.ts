/**
 * Public copy for the AI AutoPilot Summit confirmation flow.
 *
 * Sequential funnel: the ONLY public admission is General Admission ($22).
 * The GA confirmation page presents the $77 VIP Implementation Experience
 * as the primary ascension decision; declining routes to /next-steps, NOT
 * directly to the $199 Vault. Vault is revealed only after VIP purchase.
 *
 * Legacy `vip` confirmation copy remains for verified-webhook fulfillment
 * of direct VIP payments (e.g. operator-issued VIP admission), even though
 * VIP is not sold from the public site.
 */

export type ConfirmationTier = "ga" | "vip";

export interface ConfirmationContent {
  shortName: string;
  headline: string;
  included: string;
  nextSteps: string[];
  notices: string[];
  videoLabel: string;
  /** GA-only: reveal the $77 VIP Implementation Experience upsell. */
  showVipUpgrade: boolean;
  /** VIP path (legacy): reveal the $199 Vault as the next ascension step. */
  showVaultOffer: boolean;
}

export const CONFIRMATION_CONTENT: Record<ConfirmationTier, ConfirmationContent> = {
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
      "GA does not include recordings. See the next section for the VIP Implementation Experience — or continue with GA.",
    ],
    videoLabel: "Watch: your first move as a GA registrant",
    showVipUpgrade: true,
    showVaultOffer: false,
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
    showVaultOffer: true,
  },
};

export function getConfirmationContent(
  tier: ConfirmationTier | null,
): ConfirmationContent | null {
  if (!tier) return null;
  return CONFIRMATION_CONTENT[tier];
}
