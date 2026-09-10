import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { academyJoinHref } from "@/lib/academy-navigation";
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
    [success, setSuccess] = useState(false),
    [verificationRequired, setVerificationRequired] = useState(false);
  async function activatePurchased() {
    setBusy(true); setMessage("");
    try {
      const result = await academyApi<{ verificationRequired: boolean; confirmationPending: boolean; activated: number }>("activate-tickets", { confirmActivation: true });
      setVerificationRequired(result.verificationRequired);
      if (result.verificationRequired) setMessage("Verify this purchase email through your inbox first. Then return here to activate your ticket.");
      else if (!result.activated) setMessage("No eligible ticket matched this account yet. Check your purchase email, try again shortly, or use a purchase code below. Contact the team for a different checkout email or team seats.");
      else {
        setSuccess(true);
        setMessage(result.confirmationPending ? "Your lessons are open. The confirmation email is pending; you can begin now. Choose Activate again later to retry the confirmation without extending your access." : "Your purchased lessons are open. Your existing access period is preserved on repeat activation.");
      }
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await academyApi<{ tier: string; accessUntil: string; confirmationPending?: boolean }>("redeem", { code });
      setCode("");
      setSuccess(true);
      setMessage(`Access activated until ${new Date(r.accessUntil).toLocaleDateString()}.${r.confirmationPending ? " Confirmation is pending; your lessons are open now." : ""}`);
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
        <h1>Open your purchased lessons.</h1>
        <p>
          Use your purchase email to match your Summit ticket or Accelerator programme.
          Choose Activate when you are ready: this starts any access period that begins on activation.
          Viewing the free training does not start that clock.
        </p>
        {session.loading ? (
          <p>Loading your account…</p>
        ) : !session.email ? (
          <>
            <p>
              First sign in with the same email you used at checkout. Your matching ticket stays private.
            </p>
            <a className="academy-button" href={academyJoinHref("/redeem", true)}>
              Sign in or create an account
            </a>
          </>
        ) : (
          <>
            <p className="academy-muted">Signed in as {session.email}</p>
            <button className="academy-button" disabled={busy} onClick={activatePurchased}>Activate my purchased lessons</button>
            {verificationRequired ? <button className="academy-text-button" disabled={busy} onClick={async () => {
              setBusy(true);
              try { const result = await academyApi<{ message: string }>("request-ticket-verification", {}); setMessage(result.message); }
              catch (error) { setMessage((error as Error).message); }
              finally { setBusy(false); }
            }}>Email me a verification link</button> : null}
            <p>If your purchase email includes an access code, you can still use it below.</p>
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
          Tickets belong to the purchasing email and activate one student account. If you used another
          email or bought team seats, <a href="mailto:Info@NuAmenti.com">contact the team</a>.
        </p>
      </section>
    </AcademyFrame>
  );
}
