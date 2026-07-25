/**
 * Mailchimp adapter — SERVER-ONLY.
 * Fails closed until fully configured. When keys are missing, every call
 * is a structured no-op so nothing accidentally sends.
 *
 * Required env when going live:
 *   MAILCHIMP_API_KEY        e.g. "xxxxxxxxxx-us14"
 *   MAILCHIMP_AUDIENCE_ID    dedicated Summit audience
 *   MAILCHIMP_SERVER_PREFIX  e.g. "us14"
 *   MAILCHIMP_TAG_GA         tag applied to GA registrants
 *   MAILCHIMP_TAG_VIP        tag applied to VIP registrants
 *   MAILCHIMP_TAG_VAULT      tag applied to Vault purchasers
 *   MAILCHIMP_TAG_INTENSIVE  tag applied to Intensive slot holders
 *   MAILCHIMP_TAG_KEYNOTE    tag applied to Keynote waitlist
 *   MAILCHIMP_FROM_EMAIL     verified sender
 */

export interface MailchimpConfig {
  apiKey: string;
  audienceId: string;
  serverPrefix: string;
  fromEmail: string;
  tags: {
    ga?: string;
    vip?: string;
    vault?: string;
    intensive?: string;
    keynote?: string;
  };
}

export function readMailchimpConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): MailchimpConfig | null {
  const required = [
    env.MAILCHIMP_API_KEY,
    env.MAILCHIMP_AUDIENCE_ID,
    env.MAILCHIMP_SERVER_PREFIX,
    env.MAILCHIMP_FROM_EMAIL,
  ];
  if (required.some((v) => !v || v.trim() === "")) return null;
  return {
    apiKey: env.MAILCHIMP_API_KEY!,
    audienceId: env.MAILCHIMP_AUDIENCE_ID!,
    serverPrefix: env.MAILCHIMP_SERVER_PREFIX!,
    fromEmail: env.MAILCHIMP_FROM_EMAIL!,
    tags: {
      ga: env.MAILCHIMP_TAG_GA,
      vip: env.MAILCHIMP_TAG_VIP,
      vault: env.MAILCHIMP_TAG_VAULT,
      intensive: env.MAILCHIMP_TAG_INTENSIVE,
      keynote: env.MAILCHIMP_TAG_KEYNOTE,
    },
  };
}

export interface UpsertContactInput {
  email: string;
  fullName?: string;
  tags?: string[];
  merge?: Record<string, string>;
}

/** Fail-closed upsert. Returns {sent:false, reason:"unconfigured"} until live. */
export async function upsertContact(input: UpsertContactInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const cfg = readMailchimpConfig();
  if (!cfg) return { sent: false, reason: "unconfigured" };
  // Live implementation: PUT to
  // https://<serverPrefix>.api.mailchimp.com/3.0/lists/<audienceId>/members/<md5(lowercase email)>
  // with basic auth `anystring:apiKey`. Left as an explicit TODO — the
  // operator must confirm audience + verified sender before enabling.
  return { sent: false, reason: "not-implemented-yet" };
}
