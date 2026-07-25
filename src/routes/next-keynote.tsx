import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  getCommasConfig,
  resolveKeynoteCheckoutUrl,
  isKeynoteHandoffAllowed,
} from "@/lib/challenge-config";

export const Route = createFileRoute("/next-keynote")({
  head: () => ({
    meta: [
      { title: "Next NuAmenti Keynote — Priority access" },
      {
        name: "description",
        content:
          "Get priority access when the next NuAmenti keynote is announced. Your Summit ticket remains valid whether you join the priority list or not.",
      },
      { property: "og:title", content: "Next NuAmenti Keynote — Priority access" },
      {
        property: "og:description",
        content: "Priority access to the next NuAmenti keynote announcement.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/next-keynote" }],
  }),
  component: NextKeynote,
});

function NextKeynote() {
  const cfg = getCommasConfig();
  const keynoteUrl = resolveKeynoteCheckoutUrl(cfg);
  const keynoteHandoffOn = isKeynoteHandoffAllowed(cfg);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    // Consent is the announcement request — we don't add anyone to a
    // notification list without an explicit, checked opt-in for this
    // single, transactional keynote-announcement message.
    if (!consent) {
      setError(
        "Please check the box to request the one keynote-announcement message.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/keynote-waitlist", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, email_marketing_consent: consent }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 429) {
        const ra = res.headers.get("Retry-After");
        setError(`Too many attempts. Try again in ${ra ?? "60"}s.`);
      } else {
        setError("We couldn't save that just now. Please try again.");
      }
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Next NuAmenti Keynote</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Get priority access when the next keynote is announced.
      </h1>
      <p className="mt-3 text-muted-foreground">
        We don't have a public date, price, or checkout for the next keynote
        yet. If you check the box below, we'll send you one transactional
        announcement message when it's live — nothing else. Skipping this
        list does not affect your Summit ticket or Vault access.
      </p>

      {cfg.keynote.announced && keynoteHandoffOn && keynoteUrl ? (
        <p className="mt-4 rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-foreground">
          Announced for {cfg.keynote.dateIso} — {cfg.keynote.price ?? ""}.{" "}
          <a
            href={keynoteUrl}
            className="underline text-[color:var(--gold)]"
            rel="noopener noreferrer"
          >
            Reserve your seat →
          </a>
        </p>
      ) : cfg.keynote.announced ? (
        <p className="mt-4 rounded-md border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
          Reservations open once the keynote checkout is finalized.
        </p>
      ) : null}

      {submitted ? (
        <div className="mt-8 space-y-4">
          <p
            role="status"
            className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground"
          >
            Thank you, family — your request is recorded. When the next
            keynote is announced, we'll send you the single announcement
            message you asked for and nothing else. Broader marketing is
            separate and always optional on{" "}
            <Link to="/communication-preferences" className="underline">
              your communication preferences
            </Link>
            .
          </p>
          <Link
            to="/next-steps"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Continue → Your next steps
          </Link>
        </div>
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
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
              aria-describedby="keynote-consent-copy"
            />
            <span id="keynote-consent-copy">
              Please send me the one keynote-announcement message when the
              next NuAmenti keynote is live. This is a single transactional
              message tied to this request — it is not broader marketing,
              and it is not required to keep your Summit ticket.
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-[color:var(--gold)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Join the priority list"}
          </button>
          <p className="text-xs text-muted-foreground">
            Not now?{" "}
            <Link to="/next-steps" className="underline">
              Skip to your next steps
            </Link>
            . Your Summit ticket remains valid.
          </p>
        </form>
      )}
    </main>
  );
}
