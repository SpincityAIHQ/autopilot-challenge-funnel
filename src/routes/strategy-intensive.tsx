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
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { useQaReviewMode } from "@/hooks/use-qa-review";

export const Route = createFileRoute("/strategy-intensive")({
  head: () => ({
    meta: [
      { title: "Private Strategy & Build Intensive — NuAmenti" },
      {
        name: "description",
        content:
          "A private next step for confirmed Vault buyers and approved AI AutoPilot Summit attendees.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Private Strategy & Build Intensive" },
      { property: "og:description", content: "Verified Summit next step." },
      { property: "og:url", content: "/strategy-intensive" },
    ],
    links: [{ rel: "canonical", href: "/strategy-intensive" }],
  }),
  component: StrategyIntensiveRoute,
});

function StrategyIntensiveRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Your private build option</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Build the next working piece with Spin
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This page opens only for confirmed Vault buyers and approved Summit
        attendees. Use the secure link in your NuAmenti email.
      </p>

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
  const url = resolveCheckoutUrl("intensive", cfg);
  const slots = useIntensiveSlotsRemaining();
  const soldOut = slots.status === "ok" && slots.remaining <= 0;
  const salesOn = isHandoffAllowed("intensive", cfg);
  const slotsKnown = slots.status === "ok";
  const qaReview = useQaReviewMode();

  let cta;
  if (qaReview) {
    cta = (
      <a
        href="/next-steps?qaStage=intensive"
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      >
        Preview accepted 1-on-1 — no payment
      </a>
    );
  } else if (soldOut) {
    cta = <Disabled label={`All ${intensive.hardCap} slots taken`} />;
  } else if (!salesOn || !url || !slotsKnown) {
    cta = <Disabled label="Intensive checkout link being connected" />;
  } else {
    cta = (
      <a
        href={url}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
        rel="noopener noreferrer"
      >
        Claim a slot · {formatUsd(intensive.priceCents)}
      </a>
    );
  }

  return (
    <>
      <FunnelVideoSlot
        url={cfg.sectionVideos.thankYouVault}
        label="A note from the family — Vault welcome"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU_VAULT"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5" aria-live="polite">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label-mono">Live seat count</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A seat counts only after payment is confirmed.
            </p>
          </div>
          <div className="text-right font-display text-xl text-[color:var(--emerald-signal)] sm:text-2xl">
            {qaReview ? (
              <span>Preview</span>
            ) : slots.status === "loading" ? (
              <span>Checking…</span>
            ) : slots.status === "ok" ? (
              soldOut ? (
                <span>Sold out</span>
              ) : (
                <span>
                  {slots.remaining}/{intensive.hardCap}
                </span>
              )
            ) : (
              <span>Checking…</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          {cta}
          <Link
            to="/next-steps"
            className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary sm:w-auto"
          >
            No thanks
          </Link>
        </div>

        {qaReview ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Owner preview:</strong> the
            primary button advances to the final confirmation without a charge
            or seat change.
          </p>
        ) : null}
      </section>

      <ProductThankYou
        verified={true}
        eyebrow="Verified · Implementation Vault"
        headline="Thank you, family — your Vault access is confirmed."
        body="You now have the maps, agent job sheets, app plans, workflow templates, and marketing tools inside the Vault. The private session below is optional."
        videoUrl={null}
        videoLabel="A note from the family — Vault welcome"
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

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have and what the private session adds
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Your Summit access and resources</li>
              <li>· The AI AutoPilot Implementation Vault</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">
              The private session adds
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {intensive.bullets.map((bullet) => (
                <li key={bullet}>· {bullet}</li>
              ))}
            </ul>
          </div>
        </div>
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
