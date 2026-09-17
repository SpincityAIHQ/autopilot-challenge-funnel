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
  evidence: "provider_accepted" | "suppressed" | "outcome_unknown" | "held" | "provider_rejected";
  recordedAt: string;
  channel: "email";
  template?: string;
  purpose?: "transactional";
  reason?: string;
  /** Provider-supplied backoff for a documented retryable rejection. */
  retryAfterSeconds?: number | null;
  status?: number;
};

export type NativeEmailStatus = "accepted" | "unknown" | "cancelled" | "held";

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

/** Strips control characters but PRESERVES newlines, so paragraphs survive. */
const multiline = (value: unknown, limit: number) =>
  typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
        .trim()
        .slice(0, limit)
    : "";

/**
 * Sentences the provider's own footer replaces, or that do not belong in a
 * native app notification. The provider appends exactly one unsubscribe footer
 * to every app email, so the composed GHL opt-out/STOP copy is removed here.
 * The GHL and SMS composers themselves are unchanged.
 */
const REMOVED_SENTENCE =
  /(turn (them|it) off|turn off optional|unsubscribe|opt out|opt-out|reply stop|promotional email|marketing email|this email confirms your ai autopilot)/i;

/** Action lines like "Open your lessons: https://..." become the button. */
const ACTION_LINE = /^[^:\n]{1,80}:\s*https?:\/\/\S+$/;

function sentencesKept(paragraph: string): string {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !REMOVED_SENTENCE.test(sentence))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Turns one composed message body into template paragraphs: newline structure
 * is preserved for splitting, the action line and the composed footer are
 * removed so the branded template renders them once, and no learner progress
 * or promotional line is invented here.
 */
export function nativeEmailParagraphs(messageText: unknown): string[] {
  const body = multiline(messageText, 20000);
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .filter((part) => !ACTION_LINE.test(part))
    .map(sentencesKept)
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Documented provider outcome classification (see @lovable.dev/email-js
 * EmailAPIError: `status`, `code`, `retryAfterSeconds`, `retryable`).
 *   429              -> definite non-acceptance, retryable with provider backoff
 *   other 4xx        -> definite non-acceptance, NOT retryable (validation etc.)
 *   5xx / transport  -> genuinely ambiguous once the request left the app
 * Nothing outside these documented cases is assumed safe to retry.
 */
export function classifyNativeSendError(
  error: unknown,
  attempted: boolean,
): { kind: "unavailable" | "rate_limited" | "rejected" | "ambiguous"; reason: string; retryAfterSeconds?: number | null; status?: number } {
  if (error instanceof EmailAPIError) {
    if (error.status === 429)
      return { kind: "rate_limited", reason: `provider_rate_limited:${error.code ?? "429"}`, retryAfterSeconds: error.retryAfterSeconds, status: 429 };
    if (error.status >= 400 && error.status < 500)
      return { kind: "rejected", reason: `provider_rejected:${error.code ?? error.status}`, status: error.status };
    if (!attempted) return { kind: "unavailable", reason: `provider_unavailable:${error.code ?? error.status}`, status: error.status };
    return { kind: "ambiguous", reason: `provider_server_error:${error.status}`, status: error.status };
  }
  if (!attempted) return { kind: "unavailable", reason: "provider_unavailable" };
  return { kind: "ambiguous", reason: "request_outcome_unknown" };
}

/**
 * Sends one prepared academy message as native email.
 * Throws only when the provider is not usable at all (never attempted), so the
 * caller can hold the row without consuming an attempt.
 */
export async function dispatchAcademyNativeEmail(
  payload: Payload,
  options: NativeEmailOptions = {},
): Promise<{ status: NativeEmailStatus; receipt: NativeEmailReceipt }> {
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
  /** Held work stays pending: no attempt is consumed and nothing is completed. */
  const hold = (reason: string, extra: Partial<NativeEmailReceipt> = {}) => ({
    status: "held" as const,
    receipt: receipt("held", { reason, ...extra }),
  });

  // SMS and CRM-only work stays with GoHighLevel.
  if (policy.sms || policy.crmOnly) return cancel("channel_not_native_email");
  if (!validId(payload.event_id)) return cancel("unsupported_event");
  // Unsupported / promotional events are HELD, never cancelled: cancelling
  // would delete pending work that a future authored template must still send.
  if (NATIVE_EMAIL_HELD_EVENTS.includes(name)) return hold("template_not_authored");

  const template = nativeEmailTemplate(name);
  if (!template) return hold("template_not_authored");

  const purchase = ["purchase_access_code", "access_activated", "purchase_confirmed"].includes(name);
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
    paragraphs: nativeEmailParagraphs(payload.message_text),
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
    const classified = classifyNativeSendError(error, attempted);
    if (classified.kind === "unavailable") {
      // Never attempted and the transport is unusable: the caller holds the row.
      throw error instanceof Error ? error : new Error("NATIVE_EMAIL_UNAVAILABLE");
    }
    if (classified.kind === "rate_limited")
      return hold(classified.reason, {
        template,
        purpose,
        retryAfterSeconds: classified.retryAfterSeconds ?? null,
        status: classified.status,
      });
    if (classified.kind === "rejected")
      return {
        status: "cancelled" as const,
        receipt: receipt("provider_rejected", { template, purpose, reason: classified.reason, status: classified.status }),
      };
    return {
      status: "unknown",
      receipt: receipt("outcome_unknown", { template, purpose, reason: classified.reason, status: classified.status }),
    };
  }
}
