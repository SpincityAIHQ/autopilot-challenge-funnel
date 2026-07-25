/**
 * Consent model — three unbundled, revocable channels.
 * Marketing consent may NEVER be a condition of purchase.
 *
 * Copy version is bumped whenever the visible consent text changes. The
 * exact `consent_text` shown at capture time is persisted per row for
 * evidentiary purposes (in addition to `copy_version`).
 *
 * Seller identity is legally accurate: SpincityHQ LLC / NuAmenti.
 * There is no verified DBA registration for "dba NuAmenti"; do not use
 * "dba" copy anywhere in the consent surface.
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

export const CONSENT_COPY_VERSION = "2026-07-25-v1";

export const SELLER_IDENTITY = "SpincityHQ LLC / NuAmenti";

export const CONSENT_COPY: Record<ConsentChannel, string> = {
  email:
    "Yes, email me implementation notes, Summit updates, and offers from SpincityHQ LLC / NuAmenti. I can unsubscribe any time.",
  sms:
    "Yes, text me Summit reminders and implementation nudges from SpincityHQ LLC / NuAmenti. Message and data rates may apply. Reply STOP to opt out, HELP for help.",
  ai_call:
    "I explicitly consent to receiving AI-assisted or prerecorded marketing calls from SpincityHQ LLC / NuAmenti about this Summit and related offers. I understand my consent is not required to purchase, applies to the phone number I provide, discloses the use of AI/prerecorded voice, and can be revoked at any time by writing Info@NuAmenti.com.",
};

