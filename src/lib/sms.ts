/**
 * SMS adapter — DISABLED BY DEFAULT (planned Twilio path).
 * Every send goes through delivery_outbox.
 *
 * Guardrails required before flipping on:
 *   - STOP/HELP keywords honored
 *   - quiet-hours suppression (buyer-local; 8pm-9am local)
 *   - internal suppression list (opt-outs, hard bounces)
 *   - carrier compliance / registered sender
 */

export interface SmsConfig {
  enabled: boolean;
  provider?: "twilio";
  from?: string;
}

export function getSmsConfig(): SmsConfig {
  return {
    enabled: process.env.SMS_ENABLED === "true",
    provider: (process.env.SMS_PROVIDER as "twilio") ?? undefined,
    from: process.env.SMS_FROM,
  };
}

export function isSmsReady(cfg = getSmsConfig()): boolean {
  return Boolean(
    cfg.enabled &&
      cfg.provider === "twilio" &&
      cfg.from &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN,
  );
}

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
export function isStopKeyword(body: string): boolean {
  return STOP_WORDS.has(body.trim().toUpperCase());
}

export function isHelpKeyword(body: string): boolean {
  return body.trim().toUpperCase() === "HELP";
}
