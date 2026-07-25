import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { OfferGate } from "@/components/OfferGate";
import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";

export const Route = createFileRoute("/offer/implementation-vault")({
  head: () => ({
    meta: [
      { title: "Next step — AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "Verified next step for Summit VIP registrants. Sign-in from your NuAmenti access email required.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Next step — AI AutoPilot Summit" },
      {
        property: "og:description",
        content: "Verified next step for Summit VIP registrants.",
      },
      { property: "og:url", content: "/offer/implementation-vault" },
    ],
    links: [{ rel: "canonical", href: "/offer/implementation-vault" }],
  }),
  component: VaultRoute,
});

function VaultRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Sequential next step</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your next step is inside your access email.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Eligibility is checked from your verified access session — never from
        this URL. Details below only appear once we confirm your VIP
        registration.
      </p>

      <OfferGate
        predicate={(a) => a.hasVip && !a.hasVault}
        ineligibleMessage="This next step is only offered to verified VIP registrants who have not yet added the Implementation Vault. Open the secure Vault link in your NuAmenti access email — signed in on the same browser."
      >
        <VaultContent />
      </OfferGate>
    </main>
  );
}

function VaultContent() {
  const v = UPSELLS.vault;
  const cfg = getCommasConfig();
  const url = resolveCheckoutUrl("vault", cfg);
  const salesOn = isHandoffAllowed("vault", cfg);
  const qaReview = useQaReviewMode();
  const cta = qaReview ? (
    <a
      href="/strategy-intensive?qaStage=vault"
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
    >
      Preview accepted Vault — continue without payment
    </a>
  ) : salesOn && url ? (
    <a
      href={url}
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      rel="noopener noreferrer"
    >
      Add the Vault — {formatUsd(v.priceCents)}
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-3 font-heading text-base font-semibold text-muted-foreground"
    >
      Vault checkout link being connected
    </button>
  );

  return (
    <>
      <ProductThankYou
        verified={true}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — you added the VIP Implementation Experience."
        body="Your VIP add-on is confirmed. Below is your next optional step — the Implementation Vault."
        videoUrl={cfg.sectionVideos.thankYouVip}
        videoLabel="A note from the family — VIP welcome"
        className="mt-6 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-6"
      />

      {qaReview ? (
        <div className="mt-6 rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Owner preview:</strong> accepting
          this offer moves to the Vault confirmation and private 1-on-1 page
          without a charge.
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">{v.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Vault is an independent library. It does not replace your Summit
          admission or VIP experience. It adds the implementation items below.
        </p>
        <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
          {formatUsd(v.priceCents)}
        </div>
        <p className="mt-4 text-muted-foreground">{v.summary}</p>
      </div>

      <VideoSlot
        url={cfg.sectionVideos.hero ?? null}
        label="Vault walkthrough"
        className="mt-8"
      />

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have vs. what the Vault adds
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have (VIP)</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· 30-day session recordings</li>
              <li>· VIP Implementation Lab + priority Q&A</li>
              <li>· VIP Proposal + Outreach Kit</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">
              The Vault adds
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {v.bullets.map((b) => (
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
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          No thanks — continue to next steps →
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Declining the Vault does not affect your Summit ticket. Every
        affiliate/tool link inside the Vault carries a clear disclosure.
      </p>

      <TestimonialSection
        page="vault"
        eyebrow="From Vault users"
        heading="What people built with the Vault"
      />
    </>
  );
}
