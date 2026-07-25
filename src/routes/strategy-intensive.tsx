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
import { TestimonialSection } from "@/components/TestimonialSection";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Private 1-on-1 Strategy & Build Intensive" },
      {
        name: "description",
        content:
          "A two-hour private 1-on-1 strategy and build session. Only 10 total, exclusively for verified Vault holders and operator-approved attendees.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Private 1-on-1 Strategy & Build Intensive" },
      {
        property: "og:description",
        content:
          "Two-hour private 1-on-1 strategy + build session. Ten slots, atomic inventory, verified Vault holders only.",
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

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Post-Vault · Final ascension</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Book Your Private 1-on-1 Strategy & Build Intensive
      </h1>
      <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(i.priceCents)}
      </div>

      <div className="mt-6 surface-raised p-6" aria-live="polite">
        <p className="label-mono">Live inventory</p>
        <div className="mt-2 font-display text-3xl text-foreground">
          {slots.status === "loading" ? (
            <span className="text-muted-foreground">Checking availability…</span>
          ) : slots.status === "ok" ? (
            soldOut ? (
              <span>All {i.hardCap} slots taken</span>
            ) : (
              <span>
                {slots.remaining}
                <span className="ml-2 text-base text-muted-foreground">
                  of {i.hardCap} slots remaining
                </span>
              </span>
            )
          ) : (
            <span className="text-muted-foreground">Checking availability…</span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Atomic inventory. We never claim a slot is reserved until verified
          payment is received.
        </p>
      </div>

      <p className="mt-6 text-muted-foreground">{i.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your Summit ticket and Vault access stay valid whether you claim an
        Intensive slot or not. The 8-Week Mentorship is a separate offer, not
        this one.
      </p>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          What you already have vs. what the Intensive adds
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Your Summit ticket + resources</li>
              <li>· The Implementation Vault</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">The Intensive adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {i.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

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

      <div className="mt-6">
        <Link
          to="/next-steps"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          No thanks — continue to next steps →
        </Link>
      </div>

      <TestimonialSection
        page="intensive"
        eyebrow="From Intensive alumni"
        heading="What people built in a private 1-on-1"
      />
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
      <SecureLinkNotice message="The Intensive is only sold to verified Vault holders (or operator-approved attendees). Open the secure Intensive link in your NuAmenti access email — verified sign-in is required." />
    );
  }
  const { hasVault, hasIntensive } = derivedAccess(summary.scopes);
  if (hasIntensive) {
    return (
      <AlreadyOwned message="You already hold an Intensive slot. Booking and prep details come through your NuAmenti access email." />
    );
  }
  if (!hasVault) {
    return (
      <SecureLinkNotice message="Intensive eligibility requires a verified Implementation Vault purchase (or operator approval). Add the Vault first, then return here." />
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
