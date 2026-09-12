import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { supabase } from "@/integrations/supabase/client";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { onboardingStep, type OnboardingProfile } from "@/lib/academy-onboarding";
import { academyJoinDestination, academyJoinHref, academyJoinSearch } from "@/lib/academy-navigation";
import { createJoinController } from "@/lib/academy-join-controller";
import {
  COOLDOWN_STORAGE_KEY,
  cooldownDeadline,
  cooldownLabel,
  cooldownRemaining,
  describeAuthError,
  readStoredDeadline,
  type AuthFeedback,
} from "@/lib/academy-auth-feedback";

export const Route = createFileRoute("/join")({
  validateSearch: academyJoinSearch,
  head: () => ({ meta: [{ title: "Access your training | AI AutoPilot" }] }),
  component: Join,
});

function Join() {
  const search = Route.useSearch();
  const session = useAcademySession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState(search.mode === "signin");
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  /** Set only after a signup that produced no session: show check-inbox, not another signup. */
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  /** Durable: a confirmation email is needed. Survives feedback/email changes. */
  const [confirmationHelp, setConfirmationHelp] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const verificationStarted = useRef(false);
  const verificationBlocked = useRef(false);

  // ---- shared in-flight + staleness guards ----
  const inFlight = useRef(false);
  const requestToken = useRef(0);

  // ---- cooldowns (deadline timestamps; never auto-retry) ----
  const [emailCooldownUntil, setEmailCooldownUntil] = useState<number | null>(null);
  const [attemptCooldownUntil, setAttemptCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const stored = readStoredDeadline(
        window.sessionStorage.getItem(COOLDOWN_STORAGE_KEY),
        Date.now(),
      );
      if (stored) setEmailCooldownUntil(stored);
    } catch {
      /* storage unavailable — cooldown simply is not restored */
    }
  }, []);

  const emailCooldownLeft = cooldownRemaining(emailCooldownUntil, now);
  const attemptCooldownLeft = cooldownRemaining(attemptCooldownUntil, now);
  const anyCooldown = emailCooldownLeft > 0 || attemptCooldownLeft > 0;

  useEffect(() => {
    if (!anyCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyCooldown]);

  const applyCooldown = useCallback((seconds: number, alsoAttempts: boolean) => {
    const deadline = cooldownDeadline(Date.now(), seconds);
    // Never shorten a longer existing deadline.
    setEmailCooldownUntil((prev) => Math.max(prev ?? 0, deadline));
    setNow(Date.now());
    if (alsoAttempts) setAttemptCooldownUntil((prev) => Math.max(prev ?? 0, deadline));
    try {
      const stored = readStoredDeadline(
        window.sessionStorage.getItem(COOLDOWN_STORAGE_KEY),
        Date.now(),
      );
      window.sessionStorage.setItem(
        COOLDOWN_STORAGE_KEY,
        String(Math.max(stored ?? 0, deadline)),
      );
    } catch {
      /* storage unavailable — countdown still runs for this view */
    }
  }, []);


  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = fragment.get("token_hash");
    if (!tokenHash || fragment.get("type") !== "email" || verificationStarted.current) return;
    verificationStarted.current = true;
    verificationBlocked.current = true;
    setVerifyingEmail(true);
    // The one-use token stays out of query logs/referrers and is removed before requests.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    void (async () => {
      try {
        const response = await fetch("/api/academy/email-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenHash }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          // Never surface raw backend text or the token itself.
          setConfirmationHelp(true);
          setFeedback(
            describeAuthError("confirm-link", {
              code: typeof result?.code === "string" ? result.code : undefined,
              status: response.status,
            }),
          );
          return;
        }
        const signedIn = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
        if (signedIn.error) {
          setConfirmationHelp(true);
          setFeedback(describeAuthError("confirm-link", signedIn.error));
          return;
        }
        verificationBlocked.current = false;
        setConfirmationHelp(false);
        setAwaitingConfirmation(null);
        setOnboardingAttempt((attempt) => attempt + 1);
      } catch (error) {
        setConfirmationHelp(true);
        setFeedback(describeAuthError("confirm-link", error as Record<string, unknown>));
      } finally {
        setVerifyingEmail(false);
      }
    })();
  }, []);

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [onboardingAttempt, setOnboardingAttempt] = useState(0);
  const step = onboardingStep({ ...session, recovery, profile });

  useEffect(() => setLogin(search.mode === "signin"), [search.mode]);

  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery")
      setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (
      session.loading ||
      !session.email ||
      recovery ||
      verificationBlocked.current ||
      verifyingEmail
    )
      return;
    const profileEmail = session.email;
    let active = true;
    setProfile(null);
    setConsent(false);
    setSmsConsent(false);
    setPhone("");
    setFeedback(null);
    academyApi<{ registered: boolean }>("onboarding")
      .then((result) => {
        if (active) setProfile({ email: profileEmail, registered: result.registered });
      })
      .catch(() => {
        if (active) setFeedback(describeAuthError("signin", null));
      });
    return () => {
      active = false;
    };
  }, [session.loading, session.email, recovery, onboardingAttempt, verifyingEmail]);

  useEffect(() => {
    if (step === "ready" && !verificationBlocked.current && !verifyingEmail)
      window.location.assign(academyJoinDestination(search.next));
  }, [step, search.next, verifyingEmail]);

  const redirectTo = () =>
    `${window.location.origin}${academyJoinHref(search.next ?? "", true)}`;

  const controller = useRef(
    createJoinController({
      client: {
        signInWithPassword: (args) => supabase.auth.signInWithPassword(args),
        signUp: (args) => supabase.auth.signUp(args),
        resend: (args) => supabase.auth.resend(args),
        resetPasswordForEmail: (email, options) =>
          supabase.auth.resetPasswordForEmail(email, options),
        updateUser: (args) => supabase.auth.updateUser(args),
      },
      redirectTo: () => redirectTo(),
      token: () => requestToken.current,
      setBusy,
      setFeedback,
      applyCooldown: (seconds, alsoAttempts) => applyCooldown(seconds, alsoAttempts),
      setAwaitingConfirmation,
      setConfirmationHelp,
      onSession: () => {
        verificationBlocked.current = false;
        setOnboardingAttempt((attempt) => attempt + 1);
      },
    }),
  ).current;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const submitted = email.trim();
    if (!submitted || busy) return;
    if (login) {
      if (attemptCooldownLeft > 0) return;
      await controller.signIn(submitted, password);
      return;
    }
    if (emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;
    await controller.signUp(submitted, password);
  }

  /** Explicit, user-initiated only. Never called on mount, never repeats signUp. */
  async function resendConfirmation() {
    const target = (awaitingConfirmation ?? email).trim();
    if (!target) {
      setFeedback({
        tone: "error",
        message: "Enter your email address first, then request the confirmation email.",
        offer: null,
        cooldownSeconds: null,
      });
      return;
    }
    if (busy || emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;
    await controller.resend(target);
  }

  async function sendReset() {
    const target = email.trim();
    if (!target) {
      setFeedback({
        tone: "error",
        message: "Enter your email address first, then request the reset email.",
        offer: null,
        cooldownSeconds: null,
      });
      return;
    }
    if (busy || emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;
    await controller.reset(target);
  }

  async function register() {
    if (step !== "preferences" || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await academyApi<{ nextPath: string }>("register", {
        marketingConsent: consent,
        phone: phone.trim() || undefined,
        smsConsent: smsConsent && Boolean(phone.trim()),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attribution: consent
          ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
          : {},
      });
      window.location.assign(academyJoinDestination(search.next, result.nextPath));
    } catch {
      setFeedback(describeAuthError("signin", null));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const statusText = feedback?.message || session.error || "";
  const cooldownText =
    emailCooldownLeft > 0 ? cooldownLabel(emailCooldownLeft) : "";
  const emailSendBlocked = busy || emailCooldownLeft > 0 || attemptCooldownLeft > 0;

  const alerts = (
    <>
      {cooldownText ? (
        <p role="status" aria-live="polite" className="academy-status">
          {cooldownText}
        </p>
      ) : null}
      <p
        role={feedback?.tone === "error" ? "alert" : "status"}
        aria-live="polite"
        className="academy-status"
      >
        {statusText}
      </p>
    </>
  );

  if (verifyingEmail)
    return (
      <AcademyFrame>
        <section className="academy-auth academy-card">
          <p role="status">Verifying your email and opening your account…</p>
        </section>
      </AcademyFrame>
    );

  if (step === "recovery")
    return (
      <AcademyFrame>
        <section className="academy-auth academy-card">
          <h1>Set a new password</h1>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || attemptCooldownLeft > 0) return;
              await controller.updatePassword(password);
            }}
          >
            <label>
              New password
              <input
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="academy-button" disabled={busy || attemptCooldownLeft > 0}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
          {feedback?.tone === "success" ? (
            <button
              type="button"
              className="academy-button"
              onClick={() => window.location.assign(academyJoinHref(search.next ?? "/learn", true))}
            >
              Continue to my classroom
            </button>
          ) : null}
          {alerts}
        </section>
      </AcademyFrame>
    );

  // Signup accepted, no session: check-inbox state (never another signup form).
  if (awaitingConfirmation && !session.email)
    return (
      <AcademyFrame>
        <section className="academy-auth academy-card">
          <p className="academy-eyebrow">One more step</p>
          <h1>Check your inbox</h1>
          <p>
            Open the confirmation email we requested for {awaitingConfirmation}, then return here to
            enter your classroom. Check your spam folder if you do not see it.
          </p>
          <button
            type="button"
            className="academy-button"
            onClick={resendConfirmation}
            disabled={emailSendBlocked}
          >
            {busy ? "Working…" : "Resend confirmation email"}
          </button>
          <button
            type="button"
            className="academy-text-button"
            onClick={() => {
              setAwaitingConfirmation(null);
              setLogin(true);
              setPassword("");
              setFeedback(null);
            }}
            disabled={busy}
          >
            Back to sign in
          </button>
          {alerts}
        </section>
      </AcademyFrame>
    );

  return (
    <AcademyFrame>
      <section className="academy-auth academy-card">
        <p className="academy-eyebrow">Your learning journey starts here</p>
        <h1>
          {session.email
            ? step === "preferences"
              ? "Choose your learning reminders"
              : "Opening your classroom"
            : login
              ? "Welcome back"
              : "Create your free account"}
        </h1>
        <p>
          Your classroom keeps your viewing progress, activity sheets and feedback in one place.
          Thoth, your AI tutor, uses your saved activity to help you choose your next step.
        </p>
        <p>
          Returning Summit attendee? Use the email address on your invitation. Verify it, then
          activate your purchased lessons when you are ready to begin at /redeem.
        </p>
        {session.email ? (
          <p>Signed in as {session.email}</p>
        ) : step === "signed-out" ? (
          <form onSubmit={onSubmit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  requestToken.current += 1;
                  setEmail(e.target.value);
                  setFeedback(null);
                  // confirmationHelp is deliberately NOT cleared here: entering
                  // an address must not remove the recovery control.
                }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                // Older valid passwords must remain submittable on sign-in.
                {...(login ? {} : { minLength: 12 })}
                autoComplete={login ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {!login ? <p className="academy-muted">Use at least 12 characters.</p> : null}
            <button
              className="academy-button"
              disabled={busy || (login ? attemptCooldownLeft > 0 : emailSendBlocked)}
            >
              {busy ? "Working…" : login ? "Sign in" : "Create account"}
            </button>
          </form>
        ) : (
          <p role="status">Checking your sign-in…</p>
        )}

        {!session.email && (confirmationHelp || feedback?.offer === "resend-confirmation") ? (
          <button
            type="button"
            className="academy-button"
            onClick={resendConfirmation}
            disabled={busy || emailCooldownLeft > 0 || attemptCooldownLeft > 0}
          >
            Resend confirmation email
          </button>
        ) : null}

        {step === "preferences" ? (
          <>
            <p>
              These reminders are optional. Choose what helps you stay on track, then enter your
              classroom.
            </p>
            <label className="academy-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Email me optional learning reminders, Summit updates and offers. I can opt out anytime.
            </label>
            <label>
              Mobile number (optional)
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="academy-check">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
              />
              Text me optional reminders and updates at this number. Message and data rates may
              apply; reply STOP to stop or HELP for help. This is separate from email and never
              required to buy.
            </label>
          </>
        ) : null}

        <div className="academy-auth-actions">
          {step === "preferences" ? (
            <button type="button" className="academy-button" onClick={register} disabled={busy}>
              {busy ? "Saving…" : "Enter my classroom"}
            </button>
          ) : step === "signed-out" ? (
            <button
              type="button"
              className="academy-text-button"
              onClick={() => {
                setLogin(!login);
                setPassword("");
                setFeedback(null);
              }}
              disabled={busy}
            >
              {login ? "Create a free account" : "Already have an account? Sign in"}
            </button>
          ) : session.email && feedback ? (
            <button
              type="button"
              className="academy-button"
              onClick={() => {
                verificationBlocked.current = false;
                setOnboardingAttempt((attempt) => attempt + 1);
              }}
            >
              Try opening my classroom again
            </button>
          ) : null}

          {login && !session.email ? (
            <button
              type="button"
              className="academy-text-button"
              onClick={sendReset}
              disabled={emailSendBlocked}
            >
              Forgot your password?
            </button>
          ) : null}
        </div>

        <p className="academy-muted">
          Learning activity is saved to provide your course progress. Optional marketing is
          separate. <a href="/privacy">Privacy policy</a>
        </p>
        {alerts}
      </section>
    </AcademyFrame>
  );
}
