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
  // Account / access notices
  webinar_registered: "academy-account-welcome",
  access_activated: "academy-access-activated",
  purchase_access_code: "academy-purchase-access-code",
  purchase_confirmed: "academy-purchase-confirmed",
  // Service-related learning reminders (app-side optional consent still applies)
  webinar_not_started: "academy-never-started",
  learning_dropoff: "academy-learning-inactivity",
};

/**
 * Events deliberately held: their own template is not authored and reviewed, or
 * they are promotional/upsell in nature, which native app email does not carry.
 */
export const NATIVE_EMAIL_HELD_EVENTS = [
  "learning_practice",
  "learning_feedback",
  "learning_approved",
  "learning_stalled",
  "summit_offer",
  "vault_upsell",
  "accelerator_offer",
];

export function nativeEmailTemplate(eventName: string): string | null {
  return NATIVE_EMAIL_TEMPLATES[eventName] ?? null;
}

/**
 * Provider purpose. Lovable's managed app email is user-triggered transactional
 * only and the provider appends its own unsubscribe footer to EVERY app email,
 * so 'transactional' is the single supported value in @lovable.dev/email-js.
 * Do NOT send an unsupported 'marketing' purpose.
 */
export function nativeEmailPurpose(_eventName: string): "transactional" {
  return "transactional";
}

/**
 * The app's OWN consent classification, kept separate from provider purpose.
 * 'optional_learning' still requires the learner's marketing consent before the
 * app queues or sends the reminder; it does not change the provider purpose.
 */
export function nativeEmailConsentClass(eventName: string): "account_access" | "optional_learning" {
  return ["webinar_registered", "access_activated", "purchase_access_code", "purchase_confirmed"].includes(eventName)
    ? "account_access"
    : "optional_learning";
}


/** Stable, logical idempotency key: one logical event, one channel. */
export function nativeEmailIdempotencyKey(eventId: string, eventName: string): string {
  return `${eventName}:email:${eventId}`;
}

/**
 * OWNER TEST GATE — deliberately independent of the production send gate.
 *
 * `ACADEMY_OWNER_EMAIL_TEST_ENABLED=true` allows exactly one owner-addressed
 * template send for inbox proof while `ACADEMY_NATIVE_EMAIL_ENABLED` stays
 * false, so customer dispatch is never a precondition for testing. It grants
 * nothing else: the harness never claims, drains or completes queue rows.
 */
export function ownerEmailTestEnabled(env: Env = process.env): boolean {
  return env.ACADEMY_OWNER_EMAIL_TEST_ENABLED === "true";
}

/** Owner test readiness: sender configuration only, NOT the production gate. */
export function ownerEmailTestReady(env: Env = process.env): boolean {
  return ownerEmailTestEnabled(env) && Boolean(env.LOVABLE_API_KEY);
}

/** True when this event has an authored, reviewed native template. */
export function nativeEmailSupportedEvent(eventName: string): boolean {
  return !NATIVE_EMAIL_HELD_EVENTS.includes(eventName) && Boolean(NATIVE_EMAIL_TEMPLATES[eventName]);
}
