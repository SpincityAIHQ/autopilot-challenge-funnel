import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { OfferGate } from "@/components/OfferGate";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import {
  getCommasConfig,
  isHandoffAllowed,
  resolveCheckoutUrl,
} from "@/lib/challenge-config";
import { formatUsd, UPSELLS } from "@/lib/tiers";

const product = "vip_upgrade" as const;

export const Route = createFileRoute("/offer/vip-upgrade")({
  head: () => ({
    meta: [
      { title: "Add VIP — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Add recordings, the live VIP Build Lab, priority questions, and deeper AI agent and workflow tools.",
      },
      { property: "og:url", content: "/offer/vip-upgrade" },
    ],
    links: [{ rel: "canonical", href: "/offer/vip-upgrade" }],
  }),
  component: VipUpgradeRoute,
});

function VipUpgradeRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Optional next step</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Stay for the VIP Build Lab right after Day 2
      </h1>

      <OfferGate
        predicate={(access) => access.hasGa && !access.hasVip}
        ineligibleMessage="This option is only for confirmed General Admission buyers who have not added VIP. Open the secure link in your NuAmenti email on the same browser."
      >
        <VipUpgradeContent />
      </OfferGate>
    </main>
  );
}

function VipUpgradeContent() {
  const cfg = getCommasConfig();
  const vip = UPSELLS.vip_upgrade;
  const checkoutUrl = resolveCheckoutUrl(product, cfg);
  const salesOn = isHandoffAllowed(product, cfg);
  const qaReview = useQaReviewMode();

  const primaryCta = qaReview ? (
    <a
      href="/offer/implementation-vault?qaStage=vip"
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
    >
      Add VIP · Preview, No Payment
    </a>
  ) : salesOn && checkoutUrl ? (
    <a
      href={checkoutUrl}
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
    >
      Add VIP · {formatUsd(vip.priceCents)}
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-muted px-5 py-3.5 font-heading text-base font-semibold text-muted-foreground"
    >
      VIP Checkout Link Being Connected
    </button>
  );

  return (
    <>
      <FunnelVideoSlot
        url={cfg.sectionVideos.vipOffer}
        label="Watch the VIP invitation"
        envKey="VITE_SUMMIT_VIDEO_VIP_OFFER"
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
          Your General Admission ticket remains active either way.
        </p>
      </section>

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          {vip.name} — {formatUsd(vip.priceCents)}
        </h2>
        <p className="mt-3 font-heading text-[color:var(--emerald-signal)]">
          Sunday, August 30 · 4:15–5:45 PM Eastern · immediately after Day 2
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{vip.summary}</p>
      </div>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have and what VIP adds
        </h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label-mono">General Admission</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· Niche + Offer Map</li>
              <li>· Business Infrastructure Map</li>
              <li>· AI Business GPS workbook</li>
              <li>· AI Agent Team Chart</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">VIP adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {vip.bullets.map((bullet) => (
                <li key={bullet}>· {bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TestimonialSection
        page="vip_upgrade"
        eyebrow="From VIP registrants"
        heading="What deeper implementation looked like"
      />
    </>
  );
}
