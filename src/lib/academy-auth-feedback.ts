/**
 * Pure, allowlisted feedback mapping for /join authentication actions.
 *
 * Rules enforced here (tested in src/tests/academy-auth-feedback.test.ts):
 *  - Mapping keys ONLY on a Supabase error's `code`, `name` or HTTP `status`.
 *    Raw provider message text is never matched on and never shown to a user.
 *  - Account-existence-sensitive outcomes are mapped neutrally: we never state
 *    that an address does exist, does not exist, or that "only the password"
 *    was wrong.
 *  - Anything unrecognised (network failures, 5xx, timeouts, aborts) falls
 *    through to a safe temporary-failure message.
 *  - Email-send rate limiting returns a conservative UI cooldown. The cooldown
 *    is advisory: the copy explains the server limit may last longer, it is
 *    never a promise that a retry at the deadline will succeed.
 */

export type AuthAction =
  | "signin"
  | "signup"
  | "resend"
  | "reset"
  | "update-password"
  | "confirm-link";

export type AuthFeedbackTone = "error" | "info" | "success";

/** Extra control the UI may offer alongside the message. */
export type AuthFeedbackAction = "resend-confirmation" | "reset-password" | null;

export interface AuthFeedback {
  tone: AuthFeedbackTone;
  message: string;
  /** Suggested follow-up control, if any. */
  offer: AuthFeedbackAction;
  /** Seconds the UI should hold email sends for, or null. */
  cooldownSeconds: number | null;
}

/** Minimal shape we read off a Supabase error (or a thrown value). */
export interface AuthErrorLike {
  code?: unknown;
  name?: unknown;
  status?: unknown;
  /** Only used when the transport surfaced a trustworthy numeric Retry-After. */
  retryAfterSeconds?: unknown;
}

/** Conservative client-side cooldown when no trustworthy Retry-After exists. */
export const DEFAULT_EMAIL_COOLDOWN_SECONDS = 60;
/** Never let a server-declared wait exceed a sane UI bound. */
const MAX_COOLDOWN_SECONDS = 60 * 30;

export const COOLDOWN_NOTE =
  "You can retry this request after the countdown. The server limit may last longer than the countdown.";

const TEMPORARY =
  "We could not confirm the result of that request. It may or may not have gone through — please wait a few moments and check before trying again.";

const TEMPORARY_EMAIL =
  "We could not confirm the result of that request. An email may still have been sent — check your inbox and spam folder before trying again.";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Trustworthy Retry-After only: a finite positive number. Strings, NaN,
 * negatives and absurd values are ignored in favour of the safe default.
 */
export function normalizeRetryAfter(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.ceil(value), MAX_COOLDOWN_SECONDS);
}

function feedback(
  tone: AuthFeedbackTone,
  message: string,
  offer: AuthFeedbackAction = null,
  cooldownSeconds: number | null = null,
): AuthFeedback {
  return { tone, message, offer, cooldownSeconds };
}

/** Allowlisted error identifiers. Anything else is a temporary failure. */
type Known =
  | "email_not_confirmed"
  | "invalid_credentials"
  | "over_email_send_rate_limit"
  | "over_request_rate_limit"
  | "otp_expired"
  | "user_already_exists"
  | "weak_password"
  | "same_password"
  | "validation_failed"
  | "signup_disabled"
  | "session_expired"
  | "user_not_found";

const CODE_ALLOWLIST: Record<string, Known> = {
  email_not_confirmed: "email_not_confirmed",
  invalid_credentials: "invalid_credentials",
  invalid_grant: "invalid_credentials",
  over_email_send_rate_limit: "over_email_send_rate_limit",
  over_sms_send_rate_limit: "over_email_send_rate_limit",
  over_request_rate_limit: "over_request_rate_limit",
  otp_expired: "otp_expired",
  flow_state_expired: "otp_expired",
  flow_state_not_found: "otp_expired",
  user_already_exists: "user_already_exists",
  email_exists: "user_already_exists",
  weak_password: "weak_password",
  same_password: "same_password",
  validation_failed: "validation_failed",
  signup_disabled: "signup_disabled",
  email_provider_disabled: "signup_disabled",
  session_expired: "session_expired",
  session_not_found: "session_expired",
  refresh_token_not_found: "session_expired",
  user_not_found: "user_not_found",
};

function classify(error: AuthErrorLike | null | undefined): {
  known: Known | null;
  status: number | null;
} {
  const status = readStatus(error?.status);
  const code = readString(error?.code);
  if (code && CODE_ALLOWLIST[code]) return { known: CODE_ALLOWLIST[code], status };
  const name = readString(error?.name);
  // Some SDK paths only set a name (e.g. AuthWeakPasswordError).
  if (name === "AuthWeakPasswordError") return { known: "weak_password", status };
  if (name === "AuthSessionMissingError") return { known: "session_expired", status };
  if (status === 429) return { known: "over_request_rate_limit", status };
  return { known: null, status };
}

/**
 * Map an auth failure to user-safe feedback. `error` may be a returned
 * Supabase error object OR a thrown value; unrecognised shapes are safe.
 */
export function describeAuthError(
  action: AuthAction,
  error: AuthErrorLike | null | undefined,
): AuthFeedback {
  const { known, status } = classify(error);
  const retryAfter = normalizeRetryAfter(error?.retryAfterSeconds);
  const cooldown = retryAfter ?? DEFAULT_EMAIL_COOLDOWN_SECONDS;

  switch (known) {
    case "email_not_confirmed":
      return feedback(
        "error",
        "Confirm your email before signing in. Open the confirmation email we sent, then come back and sign in.",
        "resend-confirmation",
      );
    case "invalid_credentials":
      return feedback(
        "error",
        "Email or password is incorrect. Check both and try again, or reset your password.",
        "reset-password",
      );
    case "over_email_send_rate_limit":
      return feedback(
        "error",
        `Too many emails have been requested for now. ${COOLDOWN_NOTE}`,
        null,
        cooldown,
      );
    case "over_request_rate_limit":
      return feedback(
        "error",
        `Too many attempts have been made for now. ${COOLDOWN_NOTE}`,
        null,
        cooldown,
      );
    case "otp_expired":
      return feedback(
        "error",
        "That confirmation link has expired or was already used. Request a new confirmation email and use the newest one.",
        "resend-confirmation",
      );
    case "user_already_exists":
      // Neutral: never confirm that an account exists.
      return feedback(
        "info",
        "If this address is eligible, we have sent an email with the next step. Check your inbox and spam folder, or sign in instead.",
      );
    case "weak_password":
      return feedback(
        "error",
        "Choose a stronger password: at least 12 characters, and not a commonly used one.",
      );
    case "same_password":
      return feedback("error", "Choose a password different from your current one.");
    case "validation_failed":
      return feedback("error", "Check the email address and password, then try again.");
    case "signup_disabled":
      return feedback(
        "error",
        "New accounts cannot be created right now. Please try again later.",
      );
    case "session_expired":
      return feedback(
        "error",
        "Your session has expired. Please sign in again to continue.",
      );
    case "user_not_found":
      // Neutral by design for reset/resend; sign-in stays the shared wording.
      return action === "signin"
        ? feedback(
            "error",
            "Email or password is incorrect. Check both and try again, or reset your password.",
            "reset-password",
          )
        : feedback(
            "info",
            "If this address is eligible, an email is on its way. Check your inbox and spam folder.",
          );
    default:
      break;
  }

  const emailAction = action === "signup" || action === "resend" || action === "reset";
  if (status !== null && status >= 500)
    return feedback("error", emailAction ? TEMPORARY_EMAIL : TEMPORARY);
  if (action === "confirm-link")
    return feedback(
      "error",
      "We could not complete that confirmation link. Request a new confirmation email and use the newest one.",
      "resend-confirmation",
    );
  return feedback("error", emailAction ? TEMPORARY_EMAIL : TEMPORARY);
}

/** Existence-sensitive outcomes must be indistinguishable from an accepted request. */
const EXISTENCE_SENSITIVE: ReadonlySet<string> = new Set([
  "user_not_found",
  "user_already_exists",
  "email_not_confirmed",
]);

/** Classify a returned or thrown auth error to its allowlisted identifier. */
export function classifyAuthError(error: unknown): string | null {
  return classify((error ?? null) as AuthErrorLike | null).known;
}

export function isExistenceSensitive(known: string | null): boolean {
  return known !== null && EXISTENCE_SENSITIVE.has(known);
}

export function isRateLimited(known: string | null): boolean {
  return known === "over_email_send_rate_limit" || known === "over_request_rate_limit";
}

/** Neutral success copy. Provider acceptance is never inbox delivery. */
export function describeAuthSuccess(action: AuthAction): AuthFeedback {
  switch (action) {
    case "signup":
      return feedback(
        "info",
        "Check your inbox. If this address is eligible, a confirmation email is on its way — open it to finish creating your account.",
      );
    case "resend":
      return feedback(
        "info",
        "If this address is eligible, another confirmation email has been requested. Use the newest email; older links stop working.",
      );
    case "reset":
      return feedback(
        "info",
        "If this address is eligible, a password reset email has been requested. Check your inbox and spam folder.",
      );
    case "update-password":
      return feedback("success", "Your password has been updated.");
    default:
      return feedback("success", "Done.");
  }
}

// ---------- cooldown (deadline based, never auto-retrying) ----------

/** sessionStorage key. Only a timestamp is ever stored — never email or tokens. */
export const COOLDOWN_STORAGE_KEY = "academy.join.emailCooldownUntil";

export function cooldownDeadline(now: number, seconds: number): number {
  return now + Math.max(0, Math.ceil(seconds)) * 1000;
}

/** Whole seconds remaining, floored at 0. */
export function cooldownRemaining(deadline: number | null, now: number): number {
  if (!deadline || !Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Parse a persisted deadline; expired or malformed values are discarded. */
export function readStoredDeadline(raw: string | null, now: number): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= now) return null;
  return value;
}

export function cooldownLabel(secondsLeft: number): string {
  return `You can request another email in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}. The server limit may last longer.`;
}
