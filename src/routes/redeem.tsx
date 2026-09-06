import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { academyApi, useAcademySession } from "@/lib/academy-client";
export const Route = createFileRoute("/redeem")({
  head: () => ({
    meta: [
      { title: "Redeem access | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Redeem,
});
function Redeem() {
  const session = useAcademySession();
  return <Redemption key={session.email ?? "anonymous"} session={session} />;
}
function Redemption({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await academyApi<{ tier: string; accessUntil: string }>("redeem", { code });
      setCode("");
      setSuccess(true);
      setMessage(`Access activated until ${new Date(r.accessUntil).toLocaleDateString()}.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AcademyFrame>
      <section className="academy-auth academy-card">
        <p className="academy-eyebrow">Activate your ticket</p>
        <h1>Redeem your access code.</h1>
        <p>
          Use the code from your purchase email to unlock your Summit tier or Accelerator programme.
          Your guide will recognise your ticket the moment it activates.
        </p>
        {session.loading ? (
          <p>Loading your account…</p>
        ) : !session.email ? (
          <>
            <p>
              First sign in with the same email you used at Shopify. Your code stays private; do not
              put it in a website link.
            </p>
            <a className="academy-button" href="/join">
              Sign in or create an account
            </a>
          </>
        ) : (
          <>
            <p className="academy-muted">Signed in as {session.email}</p>
            <form onSubmit={submit}>
              <label>
                Access code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={80}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="SPIN-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  required
                />
              </label>
              <button className="academy-button" disabled={busy || !code.trim()}>
                Activate my access
              </button>
            </form>
            <button
              className="academy-text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await academyApi<{ message: string }>("request-code", {});
                  setMessage(r.message);
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Check for my access email
            </button>
          </>
        )}
        <p role="status" className="academy-status">
          {message || session.error}
        </p>
        {success ? (
          <a className="academy-button" href="/learn">
            Go to my learning
          </a>
        ) : null}
        <p className="academy-muted">
          Codes belong to the purchasing email and activate one student account. If you used another
          email or bought team seats, <a href="mailto:Info@NuAmenti.com">contact the team</a>.
        </p>
      </section>
    </AcademyFrame>
  );
}
