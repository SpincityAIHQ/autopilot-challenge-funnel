import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getCommasConfig } from "@/lib/challenge-config";

export const Route = createFileRoute("/keynote")({
  head: () => ({
    meta: [
      { title: "Next NuAmenti Keynote — Priority access" },
      {
        name: "description",
        content:
          "Get priority access when the next NuAmenti keynote is announced.",
      },
    ],
  }),
  component: Keynote,
});

function Keynote() {
  const cfg = getCommasConfig();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    try {
      await fetch("/api/public/keynote-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, email_marketing_consent: consent }),
      });
    } catch {
      // best-effort — the receipt email is the source of truth.
    }
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Next NuAmenti Keynote</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Get priority access when the next keynote is announced.
      </h1>
      <p className="mt-3 text-muted-foreground">
        We don't have a public date, price, or checkout for the next keynote
        yet. Add your email and we'll notify the family first.
      </p>

      {cfg.keynote.announced ? (
        <p className="mt-4 rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-foreground">
          Announced for {cfg.keynote.dateIso} — {cfg.keynote.price ?? ""}.{" "}
          {cfg.keynote.checkoutUrl ? (
            <a
              href={cfg.keynote.checkoutUrl}
              className="underline text-[color:var(--gold)]"
            >
              Reserve your seat →
            </a>
          ) : null}
        </p>
      ) : null}

      {submitted ? (
        <p className="mt-8 rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          Thank you, family — you're on the priority list.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 surface-raised space-y-4 p-6">
          <label className="block text-sm text-muted-foreground">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
            />
            <span>
              I want NuAmenti to email me when the next keynote is announced.
            </span>
          </label>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Join the priority list
          </button>
        </form>
      )}

      <Link to="/" className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Back to the Summit
      </Link>
    </main>
  );
}
