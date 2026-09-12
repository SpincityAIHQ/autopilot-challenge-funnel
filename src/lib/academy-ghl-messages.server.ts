import { createGhlClient } from "./academy-ghl-client.server";
import { academyMessagePolicy } from "./academy-message-policy";

type Env = Record<string, string | undefined>;
type Payload = Record<string, unknown>;
export type GhlDeliveryReceipt = {
  transport: "api" | "webhook";
  evidence: "provider_accepted" | "webhook_accepted" | "contact_synced" | "suppressed" | "outcome_unknown";
  recordedAt: string;
  channel: "email" | "sms" | "none";
  contactId?: string;
  messageId?: string;
  conversationId?: string;
  emailMessageId?: string;
  httpStatus?: number;
  reason?: string;
};
type Options = {
  env?: Env;
  fetchImpl?: typeof fetch;
  accessEmail?: boolean;
  onAttempt?: () => void;
  beforeSend?: () => Promise<boolean>;
};
const email = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254;
const validPhone = (value: unknown): value is string => typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const supportedEvents = new Set([
  "webinar_registered", "webinar_registered_sms", "customer_returned", "customer_preferences_updated",
  "purchase_updated", "purchase_access_code", "access_activated", "access_activated_sms", "purchase_access_sms",
  "purchase_confirmed", "purchase_confirmed_sms",
  "webinar_not_started", "learning_dropoff", "learning_practice", "learning_feedback", "learning_approved", "learning_stalled",
]);

/** An explicit API selection never falls back to a workflow after an ambiguous send. */
export function academyGhlTransport(env: Env = process.env) {
  const value = env.ACADEMY_GHL_TRANSPORT?.trim() || "webhook";
  return value === "api" || value === "webhook" ? value : null;
}
function webhookEndpoint(env: Env, accessEmail: boolean) {
  const endpoint = accessEmail
    ? env.ACADEMY_GHL_ACCESS_WEBHOOK_URL || env.ACADEMY_GHL_WEBHOOK_URL
    : env.ACADEMY_GHL_WEBHOOK_URL;
  try {
    const url = new URL(endpoint ?? "");
    return url.protocol === "https:" && url.hostname === "services.leadconnectorhq.com" &&
      !url.username && !url.password && !url.port && url.pathname.startsWith("/hooks/") ? url.href : null;
  } catch { return null; }
}
export function academyGhlTransportReady(env: Env = process.env, accessEmail = false) {
  if (academyGhlTransport(env) === "webhook") return Boolean(webhookEndpoint(env, accessEmail));
  if (academyGhlTransport(env) !== "api") return false;
  try { createGhlClient(env); return true; } catch { return false; }
}

function verifyContact(value: unknown, expectedEmail: string, locationId: string, expectedId?: string) {
  if (!object(value) || !validId(value.id) || value.locationId !== locationId || email(value.email) !== expectedEmail ||
    (expectedId && value.id !== expectedId)) throw new Error("GHL_CONTACT_IDENTITY_UNVERIFIED");
  return value as Record<string, unknown> & { id: string };
}
function dndBlocked(contact: Record<string, unknown>, channel: "email" | "sms") {
  // Never change a provider-side opt-out. Unknown suppression state fails closed.
  if (contact.dnd === true) return true;
  if (contact.dnd !== false) throw new Error("GHL_CONTACT_DND_UNAVAILABLE");
  if (contact.dndSettings === undefined || contact.dndSettings === null) return false;
  if (!object(contact.dndSettings)) throw new Error("GHL_CONTACT_DND_UNAVAILABLE");
  for (const [key, settings] of Object.entries(contact.dndSettings)) {
    if (key.toLowerCase() !== channel && key.toLowerCase() !== "all") continue;
    if (!object(settings)) throw new Error("GHL_CONTACT_DND_UNAVAILABLE");
    if (settings.status === "active" || settings.status === "permanent") return true;
    if (settings.status !== "inactive") throw new Error("GHL_CONTACT_DND_UNAVAILABLE");
  }
  return false;
}
async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error("GHL_CONTACT_SYNC_UNAVAILABLE");
  const result: unknown = await response.json();
  if (!object(result)) throw new Error("GHL_CONTACT_SYNC_UNAVAILABLE");
  return result;
}
function textField(payload: Payload, name: string, max: number) {
  const value = payload[name];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("GHL_MESSAGE_CONTENT_INVALID");
  return value;
}
function contactFields(payload: Payload, env: Env) {
  if (!env.ACADEMY_GHL_CONTACT_FIELD_MAP_JSON?.trim()) return [];
  let map: unknown;
  try { map = JSON.parse(env.ACADEMY_GHL_CONTACT_FIELD_MAP_JSON); } catch { throw new Error("GHL_CONTACT_FIELD_MAP_INVALID"); }
  if (!object(map)) throw new Error("GHL_CONTACT_FIELD_MAP_INVALID");
  const fields: { id: string; fieldValue: string }[] = [];
  for (const [key, id] of Object.entries(map)) {
    if (!["marketing_consent", "sms_consent", "purchase_verified", "customer_lifecycle", "access_tiers"].includes(key) || !validId(id))
      throw new Error("GHL_CONTACT_FIELD_MAP_INVALID");
    const value = payload[key];
    if (value === undefined) continue; // Missing snapshot must not erase known access.
    if (["marketing_consent", "sms_consent", "purchase_verified"].includes(key)) {
      if (typeof value !== "boolean") throw new Error("GHL_CONTACT_FIELD_VALUE_INVALID");
      fields.push({ id, fieldValue: value ? "true" : "false" });
    } else if (key === "access_tiers") {
      if (!Array.isArray(value) || value.some((tier) => !["free", "ga", "vip", "vault", "accelerator"].includes(tier)))
        throw new Error("GHL_CONTACT_FIELD_VALUE_INVALID");
      fields.push({ id, fieldValue: JSON.stringify([...new Set(value)].sort()) });
    } else {
      if (typeof value !== "string" || !["customer", "returning_customer", "returning_learner", "new_learner"].includes(value))
        throw new Error("GHL_CONTACT_FIELD_VALUE_INVALID");
      fields.push({ id, fieldValue: value });
    }
  }
  return fields;
}

/** The caller must atomically claim a durable outbox row before invoking this function.
 * GHL does not document an idempotency key for this endpoint. It is called once, with
 * no retry or fallback, after onAttempt. Provider acceptance is not proof of delivery.
 */
export async function dispatchAcademyGhl(payload: Payload, options: Options = {}): Promise<{
  status: "accepted" | "unknown" | "cancelled";
  receipt: GhlDeliveryReceipt;
}> {
  const env = options.env ?? process.env, fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const transport = academyGhlTransport(env);
  if (!transport || !academyGhlTransportReady(env, options.accessEmail)) throw new Error("GHL_TRANSPORT_NOT_CONFIGURED");
  const name = typeof payload.event_name === "string" ? payload.event_name : "";
  const policy = academyMessagePolicy(name);
  const channel = policy.crmOnly ? "none" : policy.sms ? "sms" : "email";
  const receipt = (evidence: GhlDeliveryReceipt["evidence"], extra: Partial<GhlDeliveryReceipt> = {}): GhlDeliveryReceipt =>
    ({ transport, evidence, recordedAt: new Date().toISOString(), channel, ...extra });
  const suppress = (reason: string, extra: Partial<GhlDeliveryReceipt> = {}) =>
    ({ status: "cancelled" as const, receipt: receipt("suppressed", { reason, ...extra }) });
  const purchase = ["purchase_access_code", "access_activated", "access_activated_sms", "purchase_access_sms", "purchase_confirmed", "purchase_confirmed_sms"].includes(name);
  if (!supportedEvents.has(name) || !validId(payload.event_id)) return suppress("unsupported_event");
  if (purchase && payload.purchase_verified !== true) return suppress("purchase_not_verified");
  if ((channel === "sms" && (payload.send_sms !== true || payload.send_email === true || payload.sms_consent !== true || !validPhone(payload.phone))) ||
    (channel === "email" && (payload.send_email !== true || payload.send_sms === true)) ||
    (channel === "none" && (payload.send_email === true || payload.send_sms === true)) ||
    (!purchase && policy.marketingRequired && payload.marketing_consent !== true)) return suppress("channel_or_consent_mismatch");
  const targetEmail = email(payload.email);
  if (!validEmail(targetEmail)) throw new Error("GHL_RECIPIENT_EMAIL_INVALID");

  if (transport === "webhook") {
    if (options.beforeSend && !(await options.beforeSend())) return suppress("eligibility_changed");
    options.onAttempt?.();
    try {
      const response = await fetchImpl(webhookEndpoint(env, Boolean(options.accessEmail))!, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
        headers: { "Content-Type": "application/json", "X-Academy-Event-Id": String(payload.event_id), "Idempotency-Key": String(payload.event_id) },
        body: JSON.stringify(payload),
      });
      return { status: response.ok ? "accepted" : "unknown", receipt: receipt(response.ok ? "webhook_accepted" : "outcome_unknown", { httpStatus: response.status }) };
    } catch { return { status: "unknown", receipt: receipt("outcome_unknown", { reason: "request_outcome_unknown" }) }; }
  }

  // Explicit senders are configured only after verification in this GHL location.
  // Do not derive a sender from the learner, owner profile, or an arbitrary default.
  const fromEmail = email(env.ACADEMY_GHL_EMAIL_FROM), fromPhone = env.ACADEMY_GHL_SMS_FROM?.trim();
  if (channel === "email" && !validEmail(fromEmail)) throw new Error("GHL_EMAIL_SENDER_NOT_CONFIGURED");
  if (channel === "sms" && !validPhone(fromPhone)) throw new Error("GHL_SMS_SENDER_NOT_CONFIGURED");
  const message = channel === "none" ? null : textField(payload, channel === "sms" ? "sms_text" : "message_text", channel === "sms" ? 1600 : 100000);
  const subject = channel === "email" ? textField(payload, "message_subject", 998) : null;
  if (subject && /[\r\n]/.test(subject)) throw new Error("GHL_MESSAGE_CONTENT_INVALID");
  const customFields = contactFields(payload, env);

  const client = createGhlClient(env, fetchImpl);
  // Including a phone here can select a different contact under GHL's phone-first
  // duplicate policy. Email is the account identity; update the phone by ID later.
  const upsert = await json(await client.request("/contacts/upsert", {
    method: "POST", body: { locationId: client.locationId, email: targetEmail, createNewIfDuplicateAllowed: false },
  }));
  const contact = verifyContact(upsert.contact, targetEmail, client.locationId);
  if (validPhone(payload.phone) || customFields.length) {
    const updated = await json(await client.request(`/contacts/${contact.id}`, { method: "PUT", body: {
      ...(validPhone(payload.phone) ? { phone: payload.phone } : {}),
      ...(customFields.length ? { customFields } : {}),
    } }));
    if (updated.contact) verifyContact(updated.contact, targetEmail, client.locationId, contact.id);
  }
  // These tags are event history, never current access authority. Add Tags preserves
  // unrelated GHL tags. No raw progress, workbook, answers or access codes are tags.
  const tags = ["spinxp", `spinxp:event:${name}`];
  if (payload.purchase_verified === true) tags.push("spinxp:verified-purchase-observed");
  if (name === "access_activated" && ["ga", "vip", "vault", "accelerator"].includes(String(payload.tier)))
    tags.push(`spinxp:activated:${payload.tier}`);
  await json(await client.request(`/contacts/${contact.id}/tags`, { method: "POST", body: { tags } }));
  if (channel === "none") return { status: "accepted", receipt: receipt("contact_synced", { contactId: contact.id }) };

  // Re-read provider suppression and identity immediately before each channel send.
  const fresh = await json(await client.request(`/contacts/${contact.id}`));
  const current = verifyContact(fresh.contact, targetEmail, client.locationId, contact.id);
  if (channel === "sms" && current.phone !== payload.phone) throw new Error("GHL_CONTACT_PHONE_UNVERIFIED");
  if (dndBlocked(current, channel)) return suppress("provider_dnd", { contactId: contact.id });
  if (options.beforeSend && !(await options.beforeSend())) return suppress("eligibility_changed", { contactId: contact.id });
  const body = channel === "email"
    ? { type: "Email", contactId: contact.id, emailFrom: fromEmail, emailTo: targetEmail, subject, message, status: "pending" }
    : { type: "SMS", contactId: contact.id, fromNumber: fromPhone, toNumber: payload.phone, message, status: "pending" };
  options.onAttempt?.();
  try {
    const response = await client.request("/conversations/messages", { method: "POST", body });
    const evidence = { contactId: contact.id, httpStatus: response.status };
    if (!response.ok) return { status: "unknown", receipt: receipt("outcome_unknown", { ...evidence, reason: "provider_rejected_or_unknown" }) };
    const result: unknown = await response.json();
    if (!object(result) || !validId(result.messageId) || !validId(result.conversationId))
      return { status: "unknown", receipt: receipt("outcome_unknown", { ...evidence, reason: "provider_receipt_missing" }) };
    return { status: "accepted", receipt: receipt("provider_accepted", {
      ...evidence, messageId: result.messageId, conversationId: result.conversationId,
      ...(validId(result.emailMessageId) ? { emailMessageId: result.emailMessageId } : {}),
    }) };
  } catch { return { status: "unknown", receipt: receipt("outcome_unknown", { contactId: contact.id, reason: "request_outcome_unknown" }) }; }
}
