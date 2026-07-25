/**
 * Mailchimp adapter — DISABLED BY DEFAULT.
 * Every send goes through the delivery_outbox row it wrote server-side.
 * Message bodies and PII are NEVER logged; only status/attempts/error.
 */

export interface MailchimpConfig {
  enabled: boolean;
  audienceId?: string;
  apiKey?: string;
  senderEmail?: string;
  serverPrefix?: string; // e.g. "us14"
}

export function getMailchimpConfig(): MailchimpConfig {
  const enabled = process.env.MAILCHIMP_ENABLED === "true";
  return {
    enabled,
    audienceId: process.env.MAILCHIMP_AUDIENCE_ID,
    apiKey: process.env.MAILCHIMP_API_KEY,
    senderEmail: process.env.MAILCHIMP_SENDER_EMAIL,
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX,
  };
}

export function isMailchimpReady(cfg = getMailchimpConfig()): boolean {
  return Boolean(
    cfg.enabled &&
      cfg.audienceId &&
      cfg.apiKey &&
      cfg.senderEmail &&
      cfg.serverPrefix,
  );
}
