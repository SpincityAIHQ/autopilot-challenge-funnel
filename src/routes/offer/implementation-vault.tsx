import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
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
      { title: "Implementation Vault — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "A private next step for confirmed VIP registrants who want ready-to-use AI business tools.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Next step — AI AutoPilot Summit" },
      { property: "og:description", content: "Verified VIP next step." },
      { property: "og:url", content: "/offer/implementation-vault" },
    ],
    links: [{ rel: "canonical", href: "/offer/implementation-vault" }],
  }),
  component: VaultRoute,
});

function VaultRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Your next build option</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Keep building with the Implementation Vault
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This page opens only after your VIP purchase is confirmed. Use the
        secure link in your NuAmenti email.
      </p>

      <OfferGate
        predicate={(access) => access.hasVip && !access.hasVault}
        ineligibleMessage="This option is only for confirmed VIP buyers who have not added the Implementation Vault. Open the secure link in your NuAmenti email on the same browser."
      >
        <VaultContent />
      </OfferGate>
    </main>
  );
}

function VaultContent() {
  const vault = UPSELLS.vault;
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
      Add the Vault — {formatUsd(vault.priceCents)}
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
      <FunnelVideoSlot
        url={cfg.sectionVideos.thankYouVip}
        label="A note from the family — VIP welcome"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU_VIP"
        className="mt-8"
      />

      <ProductThankYou
        verified={true}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — your VIP access is confirmed."
        body="You now have recordings, the VIP Build Lab, priority questions, and deeper agent and workflow tools. The Vault below is an optional next step."
        videoUrl={null}
        videoLabel="A note from the family — VIP welcome"
        className="mt-6 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-6"
      />

      {qaReview ? (
        <div className="mt-6 rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Owner preview:</strong> accepting
          this option moves to the Vault confirmation and private 1-on-1 page
          without a charge.
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          {vault.name}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Vault does not replace your Summit or VIP access. It gives you
          ready-to-use tools so you can keep building after the live event.
        </p>
        <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
          {formatUsd(vault.priceCents)}
        </div>
        <p className="mt-4 text-muted-foreground">{vault.summary}</p>
      </div>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have and what the Vault adds
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· 30-day session recordings</li>
              <li>· One live VIP Build Lab</li>
              <li>· Priority questions</li>
              <li>· AI Agent Hiring + Workflow Kit</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">
              The Vault adds
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {vault.bullets.map((bullet) => (
                <li key={bullet}>· {bullet}</li>
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

      <p className="mt-6 text-xs text-muted-foreground">
        Skipping the Vault does not change your Summit or VIP access. Tool links
        inside the Vault carry clear affiliate notices when needed.
      </p>

      <TestimonialSection
        page="vault"
        eyebrow="From Vault users"
        heading="What people built with the Vault"
      />
    </>
  );
}
