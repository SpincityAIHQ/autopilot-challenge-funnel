/**
 * AI/prerecorded call adapter — DISABLED BY DEFAULT.
 *
 * Federal + state rules require:
 *   - explicit written seller-specific consent stored with copy version
 *   - upfront AI disclosure at call start
 *   - one-touch opt-out during and after the call
 *   - internal + DNC suppression list checks
 *   - registered caller ID
 *
 * We do NOT dial anyone from this app. Adapter is a stub that verifies
 * consent + writes a delivery_outbox row for an operator/provider to send.
 */

export interface AiCallConfig {
  enabled: boolean;
  provider?: string;
  caller_id?: string;
}

export function getAiCallConfig(): AiCallConfig {
  return {
    enabled: process.env.AI_CALL_ENABLED === "true",
    provider: process.env.AI_CALL_PROVIDER,
    caller_id: process.env.AI_CALL_CALLER_ID,
  };
}

export function isAiCallReady(cfg = getAiCallConfig()): boolean {
  return Boolean(cfg.enabled && cfg.provider && cfg.caller_id);
}
