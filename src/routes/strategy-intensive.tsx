import { createFileRoute, Link } from "@tanstack/react-router";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { useIntensiveSlotsRemaining } from "@/hooks/use-intensive-slots";
import { OfferGate } from "@/components/OfferGate";
import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Next step — AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "Verified next step for eligible Summit attendees. Sign-in from your NuAmenti access email required.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Next step — AI AutoPilot Summit" },
      {
        property: "og:description",
        content: "Verified next step for eligible Summit attendees.",
      },
      { property: "og:url", content: "/strategy-intensive" },
    ],
    links: [{ rel: "canonical", href: "/strategy-intensive" }],
  }),
  component: StrategyIntensiveRoute,
});

function StrategyIntensiveRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Sequential next step</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your next step is inside your access email.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Eligibility is checked from your verified access session — never
        from this URL. Details below only appear once we confirm your
        Vault purchase or operator-approved eligibility.
      </p>

      <OfferGate
        predicate={(a) => (a.hasVault || a.hasIntensiveEligibility) && !a.hasIntensive}
        ineligibleMessage="This next step is only offered to verified Implementation Vault holders and operator-approved attendees. Open the secure Intensive link in your NuAmenti access email — signed in on the same browser."
      >
        <IntensiveContent />
      </OfferGate>
    </main>
  );
}

function IntensiveContent() {
  const i = UPSELLS.intensive;
  const cfg = getCommasConfig();
  const url = resolveCheckoutUrl("intensive", cfg);
  const slots = useIntensiveSlotsRemaining();
  const soldOut = slots.status === "ok" && slots.remaining <= 0;
  const salesOn = isHandoffAllowed("intensive", cfg);
  const slotsKnown = slots.status === "ok";

  let cta;
  if (soldOut) {
    cta = <Disabled label={`All ${i.hardCap} slots taken`} />;
  } else if (!salesOn || !url || !slotsKnown) {
    cta = <Disabled label="Intensive opening soon" />;
  } else {
    cta = (
      <a
        href={url}
        className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
        rel="noopener noreferrer"
      >
        Claim a slot — {formatUsd(i.priceCents)}
      </a>
    );
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          Book Your Private 1-on-1 Strategy &amp; Build Intensive
        </h2>
        <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
          {formatUsd(i.priceCents)}
        </div>
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
        Intensive slot or not. The 8-Week Mentorship is a separate offer,
        not this one.
      </p>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have vs. what the Intensive adds
        </h3>
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

      <div className="mt-8">{cta}</div>

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
    </>
  );
}

function Disabled({ label }: { label: string }) {
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
