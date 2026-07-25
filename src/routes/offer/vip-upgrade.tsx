import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { OfferGate } from "@/components/OfferGate";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";

const product = "vip_upgrade" as const;

export const Route = createFileRoute("/offer/vip-upgrade")({
  head: () => ({
    meta: [
      { title: "Next step — AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "Sequential next step for verified Summit registrants. Verified sign-in is required from your NuAmenti access email.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Next step — AI AutoPilot Summit" },
      {
        property: "og:description",
        content: "Verified next step for Summit registrants.",
      },
      { property: "og:url", content: "/offer/vip-upgrade" },
    ],
    links: [{ rel: "canonical", href: "/offer/vip-upgrade" }],
  }),
  component: VipUpgradeRoute,
});

function VipUpgradeRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Sequential next step</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your next step is inside your access email.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Eligibility for this next step is checked from your verified access
        session — never from this URL. Details below only appear once we
        confirm your Summit registration.
      </p>

      <OfferGate
        predicate={(a) => a.hasGa && !a.hasVip}
        ineligibleMessage="This next step is only offered to verified GA registrants who have not already added VIP. Open the secure upgrade link in your NuAmenti access email — signed in on the same browser."
      >
        <VipUpgradeContent />
      </OfferGate>
    </main>
  );
}

function VipUpgradeContent() {
  const cfg = getCommasConfig();
  const upgrade = UPSELLS.vip_upgrade;
  const url = resolveCheckoutUrl(product, cfg);
  const salesOn = isHandoffAllowed(product, cfg);
  const qaReview = useQaReviewMode();
  const cta = qaReview ? (
    <a
      href="/offer/implementation-vault?qaStage=vip"
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      Preview accepted VIP — continue without payment
    </a>
  ) : salesOn && url ? (
    <a
      href={url}
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
      rel="noopener noreferrer"
    >
      Upgrade to VIP · {formatUsd(upgrade.priceCents)}
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-3 font-heading text-sm font-semibold text-muted-foreground"
    >
      VIP checkout link being connected
    </button>
  );

  return (
    <>
      {qaReview ? (
        <div className="mt-6 rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Owner preview:</strong> accepting
          this offer moves to the VIP confirmation and Vault page without a
          charge.
        </div>
      ) : null}

      <FunnelVideoSlot
        url={cfg.sectionVideos.vipOffer}
        label="Watch: the VIP Implementation Experience"
        envKey="VITE_SUMMIT_VIDEO_VIP_OFFER"
        className="mt-8"
      />

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          {upgrade.name} — {formatUsd(upgrade.priceCents)}
        </h2>
      </div>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have vs. what this adds
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have (GA)</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Live online access · Aug 24 + Aug 25</li>
              <li>· Digital Summit Action Guide</li>
              <li>· AI Readiness Scorecard</li>
              <li>· Buyer + Offer Canvas</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">VIP adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {upgrade.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          This is additive. Your GA ticket remains valid whether you add VIP or
          not.
        </p>
      </section>

      <section className="mt-8 surface-raised p-6">
        <p className="text-sm text-muted-foreground">{upgrade.summary}</p>
        <div className="mt-6">{cta}</div>
        <p className="mt-4 text-xs text-muted-foreground">
          Live fulfillment requires a verified GA registration on the same
          email. Please pay with the same email you used for GA, or write
          Info@NuAmenti.com before paying if you need to change it.
        </p>
      </section>

      <TestimonialSection
        page="vip_upgrade"
        eyebrow="From VIP registrants"
        heading="What deeper implementation looked like"
      />

      <p className="mt-6 text-xs text-muted-foreground">
        <Link to="/next-steps" className="underline">
          No thanks — continue with GA →
        </Link>
      </p>
    </>
  );
}
