/**
 * EMAIL provider selection for academy follow-ups (September 11, 2026 direction).
 *
 * Lovable-native email is the primary provider; GoHighLevel is optional.
 * Selection is NOT send enablement: `ACADEMY_NATIVE_EMAIL_ENABLED` must be
 * "true" before a single native message may leave the app, and the existing
 * master/sequence flags still apply on top of that.
 *
 * SMS is always GoHighLevel. CRM-only events are an optional GHL sync and are
 * never sent as native email.
 */

type Env = Record<string, string | undefined>;

export type AcademyEmailTransport = "lovable" | "ghl" | "off";

/** Default is `lovable`; an unrecognised value fails closed to `off`. */
export function academyEmailTransport(env: Env = process.env): AcademyEmailTransport {
  const value = (env.ACADEMY_MESSAGE_TRANSPORT ?? "lovable").trim().toLowerCase();
  if (value === "" || value === "lovable") return "lovable";
  if (value === "ghl") return "ghl";
  return "off";
}

/** The explicit native-email send gate. Defaults to false. */
export function nativeEmailEnabled(env: Env = process.env): boolean {
  return env.ACADEMY_NATIVE_EMAIL_ENABLED === "true";
}

/**
 * Native email may be attempted only when it is selected, explicitly enabled
 * and the server credential exists. Configuration is never evidence of domain
 * activation or of delivery.
 */
export function nativeEmailReady(env: Env = process.env): boolean {
  return (
    academyEmailTransport(env) === "lovable" &&
    nativeEmailEnabled(env) &&
    Boolean(env.LOVABLE_API_KEY)
  );
}

/**
 * Deliberate event -> template mapping. Anything absent here is held: it is
 * never guessed onto another template and never silently sent.
 */
export const NATIVE_EMAIL_TEMPLATES: Record<string, string> = {
  // Account / access confirmations (transactional)
  webinar_registered: "academy-account-welcome",
  access_activated: "academy-access-activated",
  purchase_access_code: "academy-purchase-access-code",
  // Optional learning follow-ups (marketing consent required)
  webinar_not_started: "academy-never-started",
  learning_dropoff: "academy-learning-inactivity",
};

/** Events deliberately held until their own template is authored and reviewed. */
export const NATIVE_EMAIL_HELD_EVENTS = [
  "learning_practice",
  "learning_feedback",
  "learning_approved",
  "learning_stalled",
];

export function nativeEmailTemplate(eventName: string): string | null {
  return NATIVE_EMAIL_TEMPLATES[eventName] ?? null;
}

/**
 * Documented provider purpose per event. Account and access messages are
 * transactional; optional learning follow-ups are marketing, so the provider
 * applies its own unsubscribe footer and suppression to them.
 */
export function nativeEmailPurpose(eventName: string): "transactional" | "marketing" {
  return ["webinar_registered", "access_activated", "purchase_access_code"].includes(eventName)
    ? "transactional"
    : "marketing";
}

/** Stable, logical idempotency key: one logical event, one channel. */
export function nativeEmailIdempotencyKey(eventId: string, eventName: string): string {
  return `${eventName}:email:${eventId}`;
}
