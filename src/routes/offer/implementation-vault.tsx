import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { OfferGate } from "@/components/OfferGate";
import { OneClickUpgradeButton } from "@/components/OneClickUpgradeButton";
import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import { getCommasConfig, isHandoffAllowed, resolveCheckoutUrl } from "@/lib/challenge-config";
import { secureCheckoutLabel } from "@/lib/one-click";
import { formatUsd, UPSELLS } from "@/lib/tiers";

export const Route = createFileRoute("/offer/implementation-vault")({
  head: () => ({
    meta: [
      { title: "Implementation Vault — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Add reusable AI business maps, agent job sheets, app plans, workflows, loops, and marketing tools.",
      },
      { property: "og:url", content: "/offer/implementation-vault" },
    ],
    links: [{ rel: "canonical", href: "/offer/implementation-vault" }],
  }),
  component: VaultRoute,
});

function VaultRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Optional next step</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Keep building with the Implementation Vault
      </h1>

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
  const checkoutUrl = resolveCheckoutUrl("vault", cfg);
  const salesOn = isHandoffAllowed("vault", cfg);
  const qaReview = useQaReviewMode();

  // Fallback path: the ordinary Commas checkout handoff. Used whenever a
  // saved-card one-click is not possible, so the buyer is never stranded.
  const secureCheckoutCta = qaReview ? (
    <a
      href="/strategy-intensive?qaStage=vault"
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
    >
      Add the Vault · Preview, No Payment
    </a>
  ) : salesOn && checkoutUrl ? (
    <a
      href={checkoutUrl}
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
    >
      {secureCheckoutLabel(vault.priceCents)}
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-muted px-5 py-3.5 font-heading text-base font-semibold text-muted-foreground"
    >
      Vault Checkout Link Being Connected
    </button>
  );

  return (
    <>
      <FunnelVideoSlot
        url={cfg.sectionVideos.thankYouVip}
        label="VIP welcome and Vault invitation"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU_VIP"
        className="mt-7"
      />

      <OneClickUpgradeButton
        product="vault"
        priceCents={vault.priceCents}
        fallback={secureCheckoutCta}
        declineSlot={
          <Link
            to="/next-steps"
            className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary sm:w-auto"
          >
            No thanks
          </Link>
        }
      />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Your Summit and VIP access remain active either way.
      </p>

      <ProductThankYou
        verified={true}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — your VIP access is confirmed."
        body="You now have recordings, the VIP Build Lab, priority questions, and deeper agent and workflow tools. The Vault is an optional library you can keep using after the live event."
        videoUrl={null}
        videoLabel="VIP welcome"
        className="mt-6 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-6"
      />

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">{vault.name}</h2>
        <div className="mt-4 font-display text-4xl text-[color:var(--gold)]">
          {formatUsd(vault.priceCents)}
        </div>
        <p className="mt-4 text-muted-foreground">{vault.summary}</p>
      </div>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have and what the Vault adds
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· 30-day session recordings</li>
              <li>· VIP Build Lab</li>
              <li>· Priority questions</li>
              <li>· AI Agent Hiring + Workflow Kit</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">The Vault adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {vault.bullets.map((bullet) => (
                <li key={bullet}>· {bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TestimonialSection
        page="vault"
        eyebrow="From Vault users"
        heading="What people built with the Vault"
      />
    </>
  );
}
