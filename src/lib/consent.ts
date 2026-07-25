/**
 * Consent model — three unbundled, revocable channels.
 * Marketing consent may NEVER be a condition of purchase.
 */

export type ConsentChannel = "email" | "sms" | "ai_call";

export interface ConsentRecord {
  channel: ConsentChannel;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  source: string;
  copy_version: string;
}

export const CONSENT_COPY_VERSION = "2026-08-24-v1";

export const CONSENT_COPY: Record<ConsentChannel, string> = {
  email:
    "Yes, email me implementation notes, Summit updates, and offers from NuAmenti. I can unsubscribe any time.",
  sms:
    "Yes, text me Summit reminders and implementation nudges. Message and data rates may apply. Reply STOP to opt out, HELP for help.",
  ai_call:
    "I explicitly consent to occasionally receiving AI-assisted or prerecorded calls from NuAmenti about this Summit and related offers, understanding that my consent is not required to purchase and I can revoke it any time.",
};
