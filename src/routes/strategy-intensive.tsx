import { createFileRoute, Link } from "@tanstack/react-router";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { useIntensiveSlotsRemaining } from "@/hooks/use-intensive-slots";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Strategy & Build Intensive — $1,000 · 10 slots" },
      {
        name: "description",
        content:
          "A two-hour private session. Only 10 total, exclusively for NuAmenti and Summit attendees.",
      },
      { property: "og:title", content: "Strategy & Build Intensive — $1,000" },
      {
        property: "og:description",
        content:
          "Two-hour private strategy + build session. Ten slots, atomic inventory, Summit attendees only.",
      },
    ],
    links: [{ rel: "canonical", href: "/strategy-intensive" }],
  }),
  component: StrategyIntensive,
});

function StrategyIntensive() {
  const i = UPSELLS.intensive;
  const cfg = getCommasConfig();
  const url = resolveCheckoutUrl("intensive", cfg);
  const slots = useIntensiveSlotsRemaining();
  const soldOut = slots.status === "ok" && slots.remaining <= 0;
  const salesOn = isHandoffAllowed("intensive", cfg);

  let canSubmit = false;
  let label = "Intensive opening soon";
  let subLabel = `${i.hardCap} slots total.`;

  if (soldOut) {
    label = "All 10 slots taken";
    subLabel = "The Intensive is fully claimed for this cohort.";
  } else if (salesOn && slots.status === "ok" && slots.remaining > 0) {
    canSubmit = true;
    label = `Claim a slot — ${formatUsd(i.priceCents)}`;
    subLabel = `${slots.remaining} of ${i.hardCap} slots remaining.`;
  } else if (salesOn && slots.status !== "ok") {
    label = "Checking availability…";
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Post-Summit · Ascension</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {i.name}
      </h1>
      <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(i.priceCents)}
      </div>
      <p className="mt-4 text-muted-foreground">{i.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your Summit ticket stays valid whether you claim an Intensive slot or
        not. The Mentorship is a separate offer, not this one.
      </p>
      <p className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
        {subLabel}
      </p>

      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        {i.bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (canSubmit && url) window.location.href = url;
        }}
        className={`mt-8 inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground transition ${
          canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
        }`}
      >
        {label}
      </button>

      <p className="mt-6 text-xs text-muted-foreground">
        We never claim a slot is reserved until verified payment is received.
      </p>

      <Link
        to="/"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to the Summit
      </Link>
    </main>
  );
}
