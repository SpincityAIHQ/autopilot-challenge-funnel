/**
 * Shared /join auth controller.
 *
 * The component in src/routes/join.tsx calls EXACTLY these handlers, so the
 * regression tests can drive the real logic with an injected fake client
 * instead of imitating it.
 *
 * Invariants enforced here:
 *  - Transport-side cooldowns are applied even when the UI feedback is stale
 *    (the user changed the address mid-flight), so provider limits are honoured.
 *  - Account-existence-sensitive failures on signup/resend/reset produce the
 *    IDENTICAL state, copy and cooldown as an accepted request.
 *  - `email_not_confirmed` guidance is only surfaced for credential sign-in and
 *    confirmation-link contexts, never leaked through reset/resend.
 *  - A returned session (and only a returned session) clears the verification
 *    block and re-runs onboarding.
 *  - No user lookups of any kind.
 */

import {
  DEFAULT_EMAIL_COOLDOWN_SECONDS,
  classifyAuthError,
  describeAuthError,
  describeAuthSuccess,
  isExistenceSensitive,
  isRateLimited,
  normalizeRetryAfter,
  type AuthFeedback,
} from "@/lib/academy-auth-feedback";

export interface JoinAuthResult {
  data?: { session?: unknown } | null;
  error?: unknown;
}

export interface JoinAuthClient {
  signInWithPassword(args: { email: string; password: string }): Promise<JoinAuthResult>;
  signUp(args: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }): Promise<JoinAuthResult>;
  resend(args: {
    type: "signup";
    email: string;
    options?: { emailRedirectTo?: string };
  }): Promise<JoinAuthResult>;
  resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<JoinAuthResult>;
  updateUser(args: { password: string }): Promise<{ error?: unknown }>;
}

export interface JoinHost {
  client: JoinAuthClient;
  redirectTo(): string;
  /** Current request token; a change means the submitted address went stale. */
  token(): number;
  setBusy(busy: boolean): void;
  setFeedback(feedback: AuthFeedback | null): void;
  /** Applied regardless of staleness. `alsoAttempts` extends the attempt gate. */
  applyCooldown(seconds: number, alsoAttempts: boolean): void;
  setAwaitingConfirmation(email: string | null): void;
  /** Durable "you need a confirmation email" recovery state. */
  setConfirmationHelp(on: boolean): void;
  /**
   * A request finished for an address the user has since edited. The outcome
   * must not vanish silently, but it must never overwrite newer feedback or a
   * newer session: the host applies it only when nothing newer exists.
   */
  setStaleFeedback(feedback: AuthFeedback): void;
  /** Called ONLY when a real session was returned. */
  onSession(): void;
}

/** A request that never answers must not leave the button stuck on "Working…". */
export const DEFAULT_REQUEST_TIMEOUT_MS = 25000;

/**
 * An email send timed out and has still not resolved. Pressing again could
 * send a second message or burn the provider allowance, so we say plainly what
 * is unknown instead of silently doing nothing or locking on "Working…".
 */
export const PENDING_EMAIL_SEND: AuthFeedback = {
  tone: "info",
  message:
    "Your last email request has not come back yet, so we cannot tell whether it was sent. Check your inbox and spam folder first. If nothing arrives, reload this page before requesting another.",
  offer: null,
  cooldownSeconds: null,
};

/**
 * Neutral wording for an outcome that belongs to an address the user has since
 * changed. It reveals nothing about any account and promises no delivery.
 */
export const STALE_COMPLETION: AuthFeedback = {
  tone: "info",
  message:
    "Your earlier request has finished. If you changed the address in the box, check the inbox for the address you first used, or press the button again for the new one.",
  offer: null,
  cooldownSeconds: null,
};

/** Shared synchronous in-flight guard, one per controller instance. */
export function createJoinController(host: JoinHost, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  let inFlight = false;
  /** An email send that timed out and has still not resolved either way. */
  let pendingEmailSend = false;

  /**
   * Bounded wait. A timeout is deliberately mapped to the safe temporary
   * outcome: the request may still have been accepted upstream, so the copy
   * never claims nothing happened.
   */
  function bounded<T>(work: Promise<T>, onLate?: (settled: boolean) => void): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return work;
    return new Promise<T>((resolve, reject) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        onLate?.(false);
        reject({ name: "AuthRetryableFetchError", status: 504 });
      }, timeoutMs);
      /**
       * A late answer is NOT discarded outright. A rate limit in it — returned
       * or thrown — is an observed fact about the provider's allowance, so the
       * cooldown is still extended. Nothing else is touched: no feedback, no
       * session, no confirmation state, and never a retry.
       */
      const late = (error: unknown) => {
        const limit = cooldownFor(error);
        if (limit) host.applyCooldown(limit.seconds, limit.alsoAttempts);
        onLate?.(true);
      };
      work.then(
        (value) => {
          if (timedOut) return late((value as { error?: unknown } | null)?.error);
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          if (timedOut) return late(error);
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  function cooldownFor(error: unknown): { seconds: number; alsoAttempts: boolean } | null {
    const known = classifyAuthError(error);
    if (!isRateLimited(known)) return null;
    const retryAfter = normalizeRetryAfter((error as { retryAfterSeconds?: unknown })?.retryAfterSeconds);
    return {
      seconds: retryAfter ?? DEFAULT_EMAIL_COOLDOWN_SECONDS,
      // An email-send limit gates email requests only; password sign-in stays
      // available. Request-rate limits (and a bare 429) gate attempts as well.
      alsoAttempts: known === "over_request_rate_limit",
    };
  }

  /**
   * Wrap an email send so a timeout marks it pending and a late answer clears
   * it. A second manual send is refused while one is unresolved.
   */
  function emailSend<T>(work: Promise<T>): Promise<T> {
    return bounded(work, (settled) => {
      pendingEmailSend = !settled;
    });
  }

  /** True (and explains itself) when an earlier email send is still unresolved. */
  function blockedByPendingEmail() {
    if (!pendingEmailSend) return false;
    host.setFeedback(PENDING_EMAIL_SEND);
    return true;
  }

  async function guard(work: () => Promise<void>) {
    if (inFlight) return;
    inFlight = true;
    host.setBusy(true);
    host.setFeedback(null);
    try {
      await work();
    } finally {
      inFlight = false;
      host.setBusy(false);
    }
  }


  /** Accepted-request outcome for signup / resend / reset. Never reveals existence. */
  function acceptedEmailRequest(
    action: "signup" | "resend" | "reset",
    submitted: string,
    stale: boolean,
  ) {
    host.applyCooldown(DEFAULT_EMAIL_COOLDOWN_SECONDS, false);
    if (stale) return host.setStaleFeedback(STALE_COMPLETION);
    if (action === "signup") host.setAwaitingConfirmation(submitted);
    if (action !== "reset") host.setConfirmationHelp(true);
    host.setFeedback(describeAuthSuccess(action));
  }

  type EmailAction = "signup" | "resend" | "reset";

  /**
   * Single action-aware normalisation point for BOTH returned and thrown
   * errors. On email actions an existence-sensitive failure is indistinguishable
   * from an accepted request — same copy, state and cooldown.
   */
  function handleError(
    action: "signin" | "signup" | "resend" | "reset" | "update-password",
    error: unknown,
    stale: boolean,
    submitted?: string,
  ) {
    const emailAction = action === "signup" || action === "resend" || action === "reset";
    if (emailAction && isExistenceSensitive(classifyAuthError(error)))
      return acceptedEmailRequest(action as EmailAction, submitted ?? "", stale);
    return failure(action, error, stale);
  }

  function failure(action: "signin" | "signup" | "resend" | "reset" | "update-password", error: unknown, stale: boolean) {
    const limit = cooldownFor(error);
    if (limit) host.applyCooldown(limit.seconds, limit.alsoAttempts);
    if (stale) return host.setStaleFeedback(STALE_COMPLETION);
    const mapped = describeAuthError(action, error as Record<string, unknown>);
    host.setFeedback(mapped);
    if (mapped.offer === "resend-confirmation") host.setConfirmationHelp(true);
  }

  return {
    async signIn(email: string, password: string) {
      await guard(async () => {
        const token = host.token();
        try {
          const result = await bounded(host.client.signInWithPassword({ email, password }));
          const stale = token !== host.token();
          if (result?.error) return handleError("signin", result.error, stale);
          // Only an actual returned session unblocks onboarding.
          if (result?.data?.session) {
            host.setAwaitingConfirmation(null);
            host.setConfirmationHelp(false);
            host.onSession();
          }
        } catch (error) {
          handleError("signin", error, token !== host.token());
        }
      });
    },

    async signUp(email: string, password: string) {
      await guard(async () => {
        if (blockedByPendingEmail()) return;
        const token = host.token();
        try {
          const result = await emailSend(
            host.client.signUp({
              email,
              password,
              options: { emailRedirectTo: host.redirectTo() },
            }),
          );
          const stale = token !== host.token();
          // A duplicate signup must be indistinguishable from an eligible one.
          if (result?.error) return handleError("signup", result.error, stale, email);
          if (result?.data?.session) {
            if (stale) return;
            host.setAwaitingConfirmation(null);
            host.setConfirmationHelp(false);
            host.onSession();
            return;
          }
          acceptedEmailRequest("signup", email, stale);
        } catch (error) {
          handleError("signup", error, token !== host.token(), email);
        }
      });
    },

    async resend(email: string) {
      await guard(async () => {
        if (blockedByPendingEmail()) return;
        const token = host.token();
        try {
          const result = await emailSend(
            host.client.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: host.redirectTo() },
            }),
          );
          const stale = token !== host.token();
          if (result?.error) return handleError("resend", result.error, stale, email);
          acceptedEmailRequest("resend", email, stale);
        } catch (error) {
          handleError("resend", error, token !== host.token(), email);
        }
      });
    },

    async reset(email: string) {
      await guard(async () => {
        if (blockedByPendingEmail()) return;
        const token = host.token();
        try {
          const result = await emailSend(
            host.client.resetPasswordForEmail(email, { redirectTo: host.redirectTo() }),
          );
          const stale = token !== host.token();
          if (result?.error) return handleError("reset", result.error, stale, email);
          acceptedEmailRequest("reset", email, stale);
        } catch (error) {
          handleError("reset", error, token !== host.token(), email);
        }
      });
    },

    async updatePassword(password: string) {
      await guard(async () => {
        try {
          const result = await bounded(host.client.updateUser({ password }));
          if (result?.error) return handleError("update-password", result.error, false);
          host.setFeedback(describeAuthSuccess("update-password"));
        } catch (error) {
          handleError("update-password", error, false);
        }
      });
    },

    get busy() {
      return inFlight;
    },

    /** An email send timed out and has not resolved; sign-in is unaffected. */
    get emailSendPending() {
      return pendingEmailSend;
    },
  };
}

export type JoinController = ReturnType<typeof createJoinController>;
