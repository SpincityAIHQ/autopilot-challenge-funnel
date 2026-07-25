/**
 * AI/prerecorded outbound call adapter — SERVER-ONLY, DISABLED BY DEFAULT.
 *
 * AI-assisted or prerecorded marketing calls require:
 *  - Explicit, seller-specific WRITTEN consent from the recipient.
 *  - AI disclosure at the start of every call.
 *  - Persistent opt-out and DNC integration.
 *  - Provider-side compliance configuration.
 *
 * Nothing dials until every gate below is set. Event-service reminders
 * (transactional) are NOT sent through this adapter — those must be their
 * own separate, plainly transactional channel.
 */

export interface AiCallConfig {
  provider: string;
  apiKey: string;
  fromNumber: string;
  dncListId: string;
  disclosureScript: string;
  operatorSignoff: string; // human operator who approved this send
}

export function readAiCallConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): AiCallConfig | null {
  const req = [
    env.AI_CALL_PROVIDER,
    env.AI_CALL_API_KEY,
    env.AI_CALL_FROM_NUMBER,
    env.AI_CALL_DNC_LIST_ID,
    env.AI_CALL_DISCLOSURE_SCRIPT,
    env.AI_CALL_OPERATOR_SIGNOFF,
  ];
  if (req.some((v) => !v || v.trim() === "")) return null;
  return {
    provider: env.AI_CALL_PROVIDER!,
    apiKey: env.AI_CALL_API_KEY!,
    fromNumber: env.AI_CALL_FROM_NUMBER!,
    dncListId: env.AI_CALL_DNC_LIST_ID!,
    disclosureScript: env.AI_CALL_DISCLOSURE_SCRIPT!,
    operatorSignoff: env.AI_CALL_OPERATOR_SIGNOFF!,
  };
}

export interface AiCallInput {
  to: string;
  hasWrittenConsent: boolean;
  consentRecordId: string; // reference into marketing_consents
  script: string;
}

export async function placeAiCall(input: AiCallInput): Promise<{
  placed: boolean;
  reason?: string;
}> {
  const cfg = readAiCallConfig();
  if (!cfg) return { placed: false, reason: "unconfigured" };
  if (!input.hasWrittenConsent || !input.consentRecordId) {
    return { placed: false, reason: "no-written-consent" };
  }
  // No provider is wired yet. When one is added, this function must:
  //  1. Verify the number is not on the DNC list.
  //  2. Prepend the disclosure script.
  //  3. Log the operator sign-off and consent record id.
  return { placed: false, reason: "not-implemented-yet" };
}
