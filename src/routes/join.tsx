import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { supabase } from "@/integrations/supabase/client";
import { academyApi, useAcademySession } from "@/lib/academy-client";
export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join the free webinar | AI AutoPilot" }] }),
  component: Join,
});
function Join() {
  const session = useAcademySession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = login
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/join` },
          });
      if (result.error) throw result.error;
      if (!result.data.session)
        setMessage("Check your email to confirm your account, then sign in here.");
      else if (login) window.location.assign("/learn");
      else await register();
    } catch {
      setMessage("We could not complete sign-in. Check your details or try again shortly.");
    } finally {
      setBusy(false);
    }
  }
  async function register() {
    setBusy(true);
    try {
      await academyApi("register", {
        marketingConsent: consent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attribution: consent
          ? Object.fromEntries(new URLSearchParams(window.location.search).entries())
          : {},
      });
      window.location.assign("/class");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (recovery)
    return (
      <AcademyFrame>
        <section className="academy-auth academy-card">
          <h1>Set a new password</h1>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const result = await supabase.auth.updateUser({ password });
              setBusy(false);
              if (result.error)
                setMessage("The password could not be updated. Please request a new reset email.");
              else window.location.assign("/learn");
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
            <button className="academy-button" disabled={busy}>
              Save password
            </button>
          </form>
          <p role="status" className="academy-status">
            {message}
          </p>
        </section>
      </AcademyFrame>
    );
  return (
    <AcademyFrame>
      <section className="academy-auth academy-card">
        <p className="academy-eyebrow">Your learning journey starts here</p>
        <h1>
          {session.email
            ? "Join the free classroom"
            : login
              ? "Welcome back"
              : "Create your free account"}
        </h1>
        <p>Save your progress, activity book and learning feedback in one place.</p>
        {session.email ? (
          <p>Signed in as {session.email}</p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={12}
                autoComplete={login ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {!login ? <p className="academy-muted">Use at least 12 characters.</p> : null}
            <button className="academy-button" disabled={busy}>
              {busy ? "Working…" : login ? "Sign in" : "Create account"}
            </button>
          </form>
        )}
        {!login || session.email ? (
          <label className="academy-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Email me optional learning reminders, Summit updates and offers. I can opt out anytime.
          </label>
        ) : null}
        {session.email ? (
          <button className="academy-button" onClick={register} disabled={busy}>
            Enter the free classroom
          </button>
        ) : (
          <button className="academy-text-button" onClick={() => setLogin(!login)}>
            {login ? "Create a free account" : "Already have an account? Sign in"}
          </button>
        )}
        {login && !session.email ? (
          <button
            className="academy-text-button"
            onClick={async () => {
              if (!email) {
                setMessage("Enter your email address first.");
                return;
              }
              setBusy(true);
              try {
                await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/join`,
                });
                setMessage("If an account matches, a password reset email will arrive shortly.");
              } catch {
                setMessage("Password reset is temporarily unavailable.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            Forgot your password?
          </button>
        ) : null}
        <p className="academy-muted">
          Learning activity is saved to provide your course progress. Optional marketing is
          separate. <a href="/privacy">Privacy policy</a>
        </p>
        <p role="status" className="academy-status">
          {message || session.error}
        </p>
      </section>
    </AcademyFrame>
  );
}
