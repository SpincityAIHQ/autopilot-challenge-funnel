/**
 * Lovable-native EMAIL delivery for academy follow-ups.
 *
 * Mirrors the guard rails and the result contract of the GoHighLevel sender so
 * the outbox keeps exactly one set of statuses:
 *   accepted  — the provider accepted the submission (NOT proof of inbox delivery)
 *   cancelled — deliberately not sent (unsupported/held event, consent, suppression, eligibility)
 *   unknown   — the request was attempted and its outcome is ambiguous
 *
 * SMS and CRM-only events never reach this module. No receipt ID is fabricated:
 * the managed send helper returns no provider message ID.
 */

import { EmailAPIError } from "@lovable.dev/email-js";
import { academyMessagePolicy } from "./academy-message-policy";
import {
  NATIVE_EMAIL_HELD_EVENTS,
  nativeEmailIdempotencyKey,
  nativeEmailPurpose,
  nativeEmailReady,
  nativeEmailTemplate,
} from "./academy-email-transport";
import {
  sendTemplateEmail as defaultSendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from "./email-templates/send-email";

type Env = Record<string, string | undefined>;
type Payload = Record<string, unknown>;

export type NativeEmailReceipt = {
  transport: "lovable";
  evidence: "provider_accepted" | "suppressed" | "outcome_unknown";
  recordedAt: string;
  channel: "email";
  template?: string;
  purpose?: "transactional" | "marketing";
  reason?: string;
};

export type NativeEmailOptions = {
  env?: Env;
  onAttempt?: () => void;
  beforeSend?: () => Promise<boolean>;
  /** Test seam only: a synthetic sender. Production uses the managed helper. */
  sendImpl?: (
    templateName: string,
    to: string,
    options: SendTemplateEmailOptions,
  ) => Promise<SendTemplateEmailResult>;
};

const normalize = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const validEmail = (value: string) =>
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254;
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_:-]{1,200}$/.test(value);
const string = (value: unknown, limit: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, limit) : "";

function paragraphsFrom(payload: Payload): string[] {
  const body = string(payload.message_text, 20000);
  if (!body) return [];
  // The composed text already ends with the action line and its own footer;
  // the branded template renders the action as a button and the footer note.
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith("Turn off optional emails"))
    .filter((part) => !part.startsWith("This email confirms your AI AutoPilot"))
    .filter((part) => !/^[^:\n]{1,80}: https?:\/\//.test(part));
}

/**
 * Sends one prepared academy message as native email.
 * Throws only when the provider is not usable at all (never attempted), so the
 * caller can hold the row without consuming an attempt.
 */
export async function dispatchAcademyNativeEmail(
  payload: Payload,
  options: NativeEmailOptions = {},
): Promise<{ status: "accepted" | "unknown" | "cancelled"; receipt: NativeEmailReceipt }> {
  const env = options.env ?? process.env;
  const send = options.sendImpl ?? defaultSendTemplateEmail;
  if (!nativeEmailReady(env)) throw new Error("NATIVE_EMAIL_NOT_ENABLED");

  const name = typeof payload.event_name === "string" ? payload.event_name : "";
  const policy = academyMessagePolicy(name);
  const receipt = (
    evidence: NativeEmailReceipt["evidence"],
    extra: Partial<NativeEmailReceipt> = {},
  ): NativeEmailReceipt => ({
    transport: "lovable",
    evidence,
    recordedAt: new Date().toISOString(),
    channel: "email",
    ...extra,
  });
  const cancel = (reason: string, extra: Partial<NativeEmailReceipt> = {}) => ({
    status: "cancelled" as const,
    receipt: receipt("suppressed", { reason, ...extra }),
  });

  // SMS and CRM-only work stays with GoHighLevel.
  if (policy.sms || policy.crmOnly) return cancel("channel_not_native_email");
  if (!validId(payload.event_id)) return cancel("unsupported_event");
  if (NATIVE_EMAIL_HELD_EVENTS.includes(name)) return cancel("template_not_authored");

  const template = nativeEmailTemplate(name);
  if (!template) return cancel("unsupported_event");

  const purchase = ["purchase_access_code", "access_activated"].includes(name);
  if (purchase && payload.purchase_verified !== true) return cancel("purchase_not_verified");
  if (
    payload.send_email !== true ||
    payload.send_sms === true ||
    (!purchase && policy.marketingRequired && payload.marketing_consent !== true)
  )
    return cancel("channel_or_consent_mismatch");

  const to = normalize(payload.email);
  if (!validEmail(to)) throw new Error("NATIVE_EMAIL_RECIPIENT_INVALID");

  const purpose = nativeEmailPurpose(name);
  const templateData = {
    subject: string(payload.message_subject, 180) || undefined,
    heading: string(payload.message_subject, 180) || undefined,
    preview: string(payload.message_subject, 180) || undefined,
    paragraphs: paragraphsFrom(payload),
    actionLabel: string(payload.action_label, 80) || undefined,
    actionUrl: string(payload.action_url, 500) || undefined,
  };

  let attempted = false;
  try {
    const result = await send(template, to, {
      templateData,
      purpose,
      idempotencyKey: nativeEmailIdempotencyKey(String(payload.event_id), name),
      beforeSend: options.beforeSend,
      onAttempt: () => {
        attempted = true;
        options.onAttempt?.();
      },
    });
    if (result.sent) return { status: "accepted", receipt: receipt("provider_accepted", { template, purpose }) };
    return cancel(result.reason, { template, purpose });
  } catch (error: unknown) {
    // A refusal before the request was made is a configuration/eligibility fault:
    // let the caller hold the row. Anything after the attempt is ambiguous.
    if (!attempted) {
      if (error instanceof EmailAPIError) throw new Error(`NATIVE_EMAIL_UNAVAILABLE:${error.code}`);
      throw error instanceof Error ? error : new Error("NATIVE_EMAIL_UNAVAILABLE");
    }
    return {
      status: "unknown",
      receipt: receipt("outcome_unknown", { template, purpose, reason: "request_outcome_unknown" }),
    };
  }
}
