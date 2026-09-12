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
  updateUser(args: { password: string }): Promise<JoinAuthResult>;
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
  /** Called ONLY when a real session was returned. */
  onSession(): void;
}

/** Shared synchronous in-flight guard, one per controller instance. */
export function createJoinController(host: JoinHost) {
  let inFlight = false;

  function cooldownFor(error: unknown): { seconds: number; alsoAttempts: boolean } | null {
    const known = classifyAuthError(error);
    if (!isRateLimited(known)) return null;
    const retryAfter = normalizeRetryAfter((error as { retryAfterSeconds?: unknown })?.retryAfterSeconds);
    return { seconds: retryAfter ?? DEFAULT_EMAIL_COOLDOWN_SECONDS, alsoAttempts: true };
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
    if (stale) return;
    if (action === "signup") host.setAwaitingConfirmation(submitted);
    if (action !== "reset") host.setConfirmationHelp(true);
    host.setFeedback(describeAuthSuccess(action));
  }

  function failure(action: "signin" | "signup" | "resend" | "reset" | "update-password", error: unknown, stale: boolean) {
    const limit = cooldownFor(error);
    if (limit) host.applyCooldown(limit.seconds, limit.alsoAttempts);
    if (stale) return;
    const mapped = describeAuthError(action, error as Record<string, unknown>);
    host.setFeedback(mapped);
    if (mapped.offer === "resend-confirmation") host.setConfirmationHelp(true);
  }

  return {
    async signIn(email: string, password: string) {
      await guard(async () => {
        const token = host.token();
        try {
          const result = await host.client.signInWithPassword({ email, password });
          const stale = token !== host.token();
          if (result?.error) return failure("signin", result.error, stale);
          // Only an actual returned session unblocks onboarding.
          if (result?.data?.session) {
            host.setAwaitingConfirmation(null);
            host.setConfirmationHelp(false);
            host.onSession();
          }
        } catch (error) {
          failure("signin", error, token !== host.token());
        }
      });
    },

    async signUp(email: string, password: string) {
      await guard(async () => {
        const token = host.token();
        try {
          const result = await host.client.signUp({
            email,
            password,
            options: { emailRedirectTo: host.redirectTo() },
          });
          const stale = token !== host.token();
          if (result?.error) {
            // A duplicate signup must be indistinguishable from an eligible one.
            if (isExistenceSensitive(classifyAuthError(result.error)))
              return acceptedEmailRequest("signup", email, stale);
            return failure("signup", result.error, stale);
          }
          if (result?.data?.session) {
            if (stale) return;
            host.setAwaitingConfirmation(null);
            host.setConfirmationHelp(false);
            host.onSession();
            return;
          }
          acceptedEmailRequest("signup", email, stale);
        } catch (error) {
          failure("signup", error, token !== host.token());
        }
      });
    },

    async resend(email: string) {
      await guard(async () => {
        const token = host.token();
        try {
          const result = await host.client.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: host.redirectTo() },
          });
          const stale = token !== host.token();
          if (result?.error && !isExistenceSensitive(classifyAuthError(result.error)))
            return failure("resend", result.error, stale);
          acceptedEmailRequest("resend", email, stale);
        } catch (error) {
          failure("resend", error, token !== host.token());
        }
      });
    },

    async reset(email: string) {
      await guard(async () => {
        const token = host.token();
        try {
          const result = await host.client.resetPasswordForEmail(email, {
            redirectTo: host.redirectTo(),
          });
          const stale = token !== host.token();
          if (result?.error && !isExistenceSensitive(classifyAuthError(result.error)))
            return failure("reset", result.error, stale);
          acceptedEmailRequest("reset", email, stale);
        } catch (error) {
          failure("reset", error, token !== host.token());
        }
      });
    },

    async updatePassword(password: string) {
      await guard(async () => {
        try {
          const result = await host.client.updateUser({ password });
          if (result?.error) return failure("update-password", result.error, false);
          host.setFeedback(describeAuthSuccess("update-password"));
        } catch (error) {
          failure("update-password", error, false);
        }
      });
    },

    get busy() {
      return inFlight;
    },
  };
}

export type JoinController = ReturnType<typeof createJoinController>;
