import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { OfferGate } from "@/components/OfferGate";
import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useIntensiveSlotsRemaining } from "@/hooks/use-intensive-slots";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import {
  getCommasConfig,
  isHandoffAllowed,
  resolveCheckoutUrl,
} from "@/lib/challenge-config";
import { formatUsd, UPSELLS } from "@/lib/tiers";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Private Strategy & Build Intensive — NuAmenti" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "A private next step for confirmed Vault buyers and approved AI AutoPilot Summit attendees.",
      },
      { property: "og:url", content: "/strategy-intensive" },
    ],
    links: [{ rel: "canonical", href: "/strategy-intensive" }],
  }),
  component: StrategyIntensiveRoute,
});

function StrategyIntensiveRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Your private build option</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Build the next working piece with Spin
      </h1>

      <OfferGate
        predicate={(access) =>
          (access.hasVault || access.hasIntensiveEligibility) &&
          !access.hasIntensive
        }
        ineligibleMessage="This private option is only for confirmed Vault buyers and approved attendees. Open the secure link in your NuAmenti email on the same browser."
      >
        <IntensiveContent />
      </OfferGate>
    </main>
  );
}

function IntensiveContent() {
  const intensive = UPSELLS.intensive;
  const cfg = getCommasConfig();
  const checkoutUrl = resolveCheckoutUrl("intensive", cfg);
  const slots = useIntensiveSlotsRemaining();
  const qaReview = useQaReviewMode();
  const soldOut = slots.status === "ok" && slots.remaining <= 0;
  const slotsKnown = slots.status === "ok";
  const salesOn = isHandoffAllowed("intensive", cfg);

  let primaryCta;
  if (qaReview) {
    primaryCta = (
      <a
        href="/next-steps?qaStage=intensive"
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      >
        Claim a Slot · Preview, No Payment
      </a>
    );
  } else if (soldOut) {
    primaryCta = <Disabled label={`All ${intensive.hardCap} Slots Taken`} />;
  } else if (!salesOn || !checkoutUrl || !slotsKnown) {
    primaryCta = <Disabled label="Intensive Checkout Link Being Connected" />;
  } else {
    primaryCta = (
      <a
        href={checkoutUrl}
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      >
        Claim a Slot · {formatUsd(intensive.priceCents)}
      </a>
    );
  }

  return (
    <>
      <FunnelVideoSlot
        url={cfg.sectionVideos.thankYouVault}
        label="Vault welcome and private Intensive invitation"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU_VAULT"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          {primaryCta}
          <Link
            to="/next-steps"
            className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary sm:w-auto"
          >
            No thanks
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your Summit, VIP, and Vault access remain active either way.
        </p>
      </section>

      <ProductThankYou
        verified={true}
        eyebrow="Verified · Implementation Vault"
        headline="Thank you, family — your Vault access is confirmed."
        body="You now have the maps, agent job sheets, app plans, workflow templates, and marketing tools inside the Vault. The private session is optional."
        videoUrl={null}
        videoLabel="Vault welcome"
        className="mt-6 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-6"
      />

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          Private Strategy &amp; Build Intensive
        </h2>
        <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
          {formatUsd(intensive.priceCents)}
        </div>
        <p className="mt-5 text-muted-foreground">{intensive.summary}</p>
      </div>

      <section className="mt-6 surface-raised p-6" aria-live="polite">
        <p className="label-mono">Live seat count</p>
        <div className="mt-2 font-display text-3xl text-foreground">
          {qaReview ? (
            <span className="text-muted-foreground">
              Preview mode · live seat count connects at launch
            </span>
          ) : slots.status === "loading" ? (
            <span className="text-muted-foreground">Checking availability…</span>
          ) : slots.status === "ok" ? (
            soldOut ? (
              <span>All {intensive.hardCap} slots taken</span>
            ) : (
              <span>
                {slots.remaining}
                <span className="ml-2 text-base text-muted-foreground">
                  of {intensive.hardCap} slots remaining
                </span>
              </span>
            )
          ) : (
            <span className="text-muted-foreground">Checking availability…</span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A seat is counted only after payment is confirmed.
        </p>
      </section>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What the private session adds
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {intensive.bullets.map((bullet) => (
            <li key={bullet}>· {bullet}</li>
          ))}
        </ul>
      </section>

      <TestimonialSection
        page="intensive"
        eyebrow="From Intensive buyers"
        heading="What people built in a private session"
      />
    </>
  );
}

function Disabled({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-muted px-5 py-3.5 font-heading text-base font-semibold text-muted-foreground"
    >
      {label}
    </button>
  );
}
