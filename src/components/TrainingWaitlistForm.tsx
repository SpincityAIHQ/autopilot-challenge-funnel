import { useState, type FormEvent } from "react";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"];

/** Landing-page capture: name + email for the free training waiting list. */
export function TrainingWaitlistForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams(window.location.search);
      const attribution: Record<string, string> = {};
      for (const key of UTM_KEYS) {
        const v = params.get(key);
        if (v) attribution[key] = v.slice(0, 128);
      }
      const res = await fetch("/api/public/training-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          email_marketing_consent: consent,
          source: "landing",
          attribution,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setMessage("That didn't go through. Please check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="academy-card academy-waitlist" role="status">
        <p className="academy-eyebrow">You're on the list</p>
        <h2>Thank you, family.</h2>
        <p>
          We'll email {email} the moment the free training opens. Watch your inbox — and check
          Promotions and Spam so you don't miss it.
        </p>
      </div>
    );
  }

  return (
    <form className="academy-card academy-waitlist" onSubmit={submit}>
      <p className="academy-eyebrow">Free training · waiting list</p>
      <h2>Get first access.</h2>
      <p>Leave your name and email and we'll send your link the day it opens.</p>
      <label>
        Your name
        <input
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </label>
      <label>
        Email address
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="academy-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Yes, email me updates about the training and what comes after it. Optional.</span>
      </label>
      <button className="academy-button" disabled={busy}>
        {busy ? "Adding you…" : "Join the waiting list"}
      </button>
      <p className="academy-muted">
        We'll only use this to send you the training. Unsubscribe any time.
      </p>
      <p role="status" className="academy-status">
        {message}
      </p>
    </form>
  );
}
