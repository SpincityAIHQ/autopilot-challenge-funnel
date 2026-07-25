import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UPSELLS, formatUsd } from "@/lib/tiers";

export const Route = createFileRoute("/apply/mentorship")({
  head: () => ({
    meta: [
      { title: "8-Week Mentorship & Work-Along — Application" },
      {
        name: "description",
        content:
          "Application-based eight-week mentorship. Separate from the 10-slot Strategy Intensive. Applying does not charge a card.",
      },
      { property: "og:title", content: "8-Week Mentorship — Application" },
      {
        property: "og:description",
        content:
          "Apply for the eight-week guided implementation cohort. Separate scope from the 10-slot Intensive.",
      },
    ],
    links: [{ rel: "canonical", href: "/apply/mentorship" }],
  }),
  component: MentorshipApplication,
});

function MentorshipApplication() {
  const m = UPSELLS.mentorship;
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      await fetch("/api/public/mentorship-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // best-effort — operator follows up manually
    }
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Post-Summit · Ascension</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {m.name}
      </h1>
      <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(m.priceCents)}
      </div>
      <p className="mt-4 text-muted-foreground">{m.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        The Mentorship is a separate offer from the Strategy Intensive.
        Applying does not reserve a seat or charge a card. Your Summit ticket
        remains valid whether you apply or not.
      </p>

      {submitted ? (
        <p className="mt-10 rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          Thank you, family — your application is in. We'll be in touch.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 surface-raised space-y-4 p-6">
          <TextField name="full_name" label="Full name" required />
          <TextField name="email" type="email" label="Email" required />
          <TextField name="phone" type="tel" label="Phone (optional)" />
          <TextField name="business" label="Business or brand" />
          <TextArea name="goals" label="What do you want to build?" required />
          <TextField name="current_offer" label="Your current offer" />
          <TextField name="monthly_revenue_band" label="Monthly revenue band" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="ready_to_invest"
              value="true"
              className="mt-1 accent-[color:var(--gold)]"
            />
            <span>
              I understand the Mentorship is {formatUsd(m.priceCents)} and I'm
              ready to invest if accepted.
            </span>
          </label>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Submit application
          </button>
        </form>
      )}

      <Link
        to="/"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to the Summit
      </Link>
    </main>
  );
}

function TextField(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm text-muted-foreground">
      {props.label}
      <input
        type={props.type ?? "text"}
        name={props.name}
        required={props.required}
        className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

function TextArea(props: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block text-sm text-muted-foreground">
      {props.label}
      <textarea
        name={props.name}
        required={props.required}
        rows={4}
        className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}
