import { createFileRoute, Link } from "@tanstack/react-router";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { useIntensiveSlotsRemaining } from "@/hooks/use-intensive-slots";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Strategy & Build Intensive — $1,000 · 10 slots" },
      {
        name: "description",
        content:
          "A two-hour private session. Only 10 total, exclusively for verified NuAmenti and Summit attendees.",
      },
      { property: "og:title", content: "Strategy & Build Intensive — $1,000" },
      {
        property: "og:description",
        content:
          "Two-hour private strategy + build session. Ten slots, atomic inventory, verified Summit attendees only.",
      },
      { property: "og:url", content: "/strategy-intensive" },
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
  const summary = useEntitlementSummary();

  const subLabel = soldOut
    ? "The Intensive is fully claimed for this cohort."
    : slots.status === "ok"
      ? `${slots.remaining} of ${i.hardCap} slots remaining.`
      : `${i.hardCap} slots total.`;

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

      <div className="mt-8">
        <IntensiveCta
          salesOn={salesOn}
          url={url}
          summary={summary}
          soldOut={soldOut}
          slotsKnown={slots.status === "ok"}
          price={i.priceCents}
        />
      </div>

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

function IntensiveCta({
  salesOn,
  url,
  summary,
  soldOut,
  slotsKnown,
  price,
}: {
  salesOn: boolean;
  url: string | null;
  summary: ReturnType<typeof useEntitlementSummary>;
  soldOut: boolean;
  slotsKnown: boolean;
  price: number;
}) {
  // Sold out takes precedence over every gate — never take money for a full pool.
  if (soldOut) return <DisabledBtn label="All 10 slots taken" />;
  if (summary.status === "loading") {
    return <DisabledBtn label="Checking your eligibility…" />;
  }
  if (summary.status === "unauthenticated" || summary.status === "error") {
    return (
      <SecureLinkNotice message="The Intensive is only sold to verified Summit or NuAmenti attendees. Open the secure Intensive link in your NuAmenti access email — verified sign-in is required." />
    );
  }
  const { hasGa, hasIntensive } = derivedAccess(summary.scopes);
  if (hasIntensive) {
    return (
      <AlreadyOwned message="You already hold an Intensive slot. Booking + prep details come through your NuAmenti access email." />
    );
  }
  if (!hasGa) {
    return (
      <SecureLinkNotice message="Intensive eligibility requires a verified Summit registration on the same session. Open the secure Intensive link in your NuAmenti access email." />
    );
  }
  if (!salesOn || !url || !slotsKnown) {
    return <DisabledBtn label="Intensive opening soon" />;
  }
  return (
    <a
      href={url}
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      rel="noopener noreferrer"
    >
      Claim a slot — {formatUsd(price)}
    </a>
  );
}

function DisabledBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-3 font-heading text-base font-semibold text-muted-foreground"
    >
      {label}
    </button>
  );
}

function AlreadyOwned({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[color:var(--emerald-signal)]/40 bg-secondary/40 p-4 text-sm text-foreground">
      <p className="font-heading">You already have this.</p>
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  );
}

function SecureLinkNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
