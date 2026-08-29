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

export const CONSENT_COPY_VERSION = "2026-08-29-v2";

export const SELLER_IDENTITY = "SpincityHQ LLC / NuAmenti";

export const CONSENT_COPY: Record<ConsentChannel, string> = {
  email:
    "Yes, email me implementation notes, Summit updates, and offers from SpincityHQ LLC / NuAmenti. I can unsubscribe any time.",
  sms: "Yes, I consent to receive recurring automated marketing and promotional text messages from SpincityHQ LLC / NuAmenti about the Summit and related offers at the phone number I provide. Message frequency may vary. Consent is not required to purchase. Message and data rates may apply. Reply STOP to opt out or HELP for help.",
  ai_call:
    "I expressly consent to receive automated marketing and promotional calls from SpincityHQ LLC / NuAmenti about the Summit and related offers at the phone number I provide, including calls using AI-generated or artificial voice and prerecorded voice. My consent is not a condition of purchase. I may revoke it at any time by writing Sebastian@spincityhq.com.",
};
