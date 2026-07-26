import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { OfferPurchaseAction } from "@/components/OfferPurchaseAction";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { OfferGate } from "@/components/OfferGate";
import { TestimonialSection } from "@/components/TestimonialSection";

const product = "vip_upgrade" as const;

export const Route = createFileRoute("/offer/vip-upgrade")({
  head: () => ({
    meta: [
      { title: "Your VIP Option — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "A private next step for confirmed AI AutoPilot Summit registrants who want the Build Lab immediately after Day 2.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Next step — AI AutoPilot Summit" },
      { property: "og:description", content: "Verified Summit next step." },
      { property: "og:url", content: "/offer/vip-upgrade" },
    ],
    links: [{ rel: "canonical", href: "/offer/vip-upgrade" }],
  }),
  component: VipUpgradeRoute,
});

function VipUpgradeRoute() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Your next build option</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Stay for the VIP Build Lab right after Day 2
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The main Summit ends Sunday at 4:00 PM Eastern. VIP starts at 4:15 PM
        while the work is still fresh. This page opens only after your General
        Admission ticket is confirmed.
      </p>

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
  const upgrade = UPSELLS.vip_upgrade;

  return (
    <>
      <FunnelVideoSlot
        url={cfg.sectionVideos.vipOffer}
        label="Watch: the VIP Implementation Experience"
        envKey="VITE_SUMMIT_VIDEO_VIP_OFFER"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <OfferPurchaseAction
          product="vip_upgrade"
          productName="VIP"
          priceCents={upgrade.priceCents}
          fallbackUrl={resolveCheckoutUrl(product, cfg)}
          fallbackAllowed={isHandoffAllowed(product, cfg)}
          qaHref="/offer/implementation-vault?qaStage=vip"
          qaLabel="Preview accepted VIP — no payment"
        />
        <Link
          to="/next-steps"
          className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary"
        >
          No thanks — keep General Admission
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your General Admission ticket remains active either way.
        </p>
      </section>

      <div className="mt-8">
        <h2 className="font-display text-2xl text-foreground">
          {upgrade.name} — {formatUsd(upgrade.priceCents)}
        </h2>
        <p className="mt-3 font-heading text-[color:var(--emerald-signal)]">
          Sunday, August 30 · 4:15–5:45 PM Eastern · immediately after Day 2
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{upgrade.summary}</p>
      </div>

      <section className="mt-8 surface p-6">
        <h3 className="font-heading text-lg text-foreground">
          What you already have and what VIP adds
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· Niche + Offer Map</li>
              <li>· Business Infrastructure Map</li>
              <li>· AI Business GPS workbook</li>
              <li>· AI Agent Team Chart</li>
              <li>· First Workflow + Loop Builder</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">VIP adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {upgrade.bullets.map((bullet) => (
                <li key={bullet}>· {bullet}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Use the same email you used for General Admission. Write
          Info@NuAmenti.com before paying if that email must change.
        </p>
      </section>

      <TestimonialSection
        page="vip_upgrade"
        eyebrow="From VIP registrants"
        heading="What deeper implementation looked like"
      />
    </>
  );
}
