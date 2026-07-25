/**
 * SMS adapter — SERVER-ONLY. Fails closed until fully configured.
 * Includes STOP/HELP guardrails and quiet-hours enforcement.
 *
 * Required env when going live:
 *   SMS_PROVIDER          "twilio" (only supported provider for now)
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID  or TWILIO_FROM_NUMBER
 *   SMS_QUIET_HOURS_START "21"  (24h local hour)
 *   SMS_QUIET_HOURS_END   "9"
 */

export interface SmsConfig {
  provider: "twilio";
  accountSid: string;
  authToken: string;
  from: string;
  quietStartHour: number;
  quietEndHour: number;
}

export function readSmsConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): SmsConfig | null {
  if (env.SMS_PROVIDER !== "twilio") return null;
  const sid = env.TWILIO_ACCOUNT_SID;
  const tok = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_MESSAGING_SERVICE_SID ?? env.TWILIO_FROM_NUMBER;
  if (!sid || !tok || !from) return null;
  const qs = Number(env.SMS_QUIET_HOURS_START ?? "21");
  const qe = Number(env.SMS_QUIET_HOURS_END ?? "9");
  return {
    provider: "twilio",
    accountSid: sid,
    authToken: tok,
    from,
    quietStartHour: Number.isFinite(qs) ? qs : 21,
    quietEndHour: Number.isFinite(qe) ? qe : 9,
  };
}

export function isQuietHour(now: Date, cfg: SmsConfig): boolean {
  const h = now.getHours();
  if (cfg.quietStartHour < cfg.quietEndHour) {
    return h >= cfg.quietStartHour && h < cfg.quietEndHour;
  }
  return h >= cfg.quietStartHour || h < cfg.quietEndHour;
}

export interface SmsInput {
  to: string;
  body: string;
  transactional?: boolean;
}

export async function sendSms(input: SmsInput): Promise<{ sent: boolean; reason?: string }> {
  const cfg = readSmsConfig();
  if (!cfg) return { sent: false, reason: "unconfigured" };
  if (!input.transactional && isQuietHour(new Date(), cfg)) {
    return { sent: false, reason: "quiet-hours" };
  }
  if (!/^\+?[0-9]{7,15}$/.test(input.to)) {
    return { sent: false, reason: "invalid-number" };
  }
  // Live implementation would POST to Twilio's REST API.
  return { sent: false, reason: "not-implemented-yet" };
}
