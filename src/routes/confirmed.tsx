import { createFileRoute, Link } from "@tanstack/react-router";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { OneClickUpgradeButton } from "@/components/OneClickUpgradeButton";
import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";
import { derivedAccess, useEntitlementSummary } from "@/hooks/use-entitlement-summary";
import { getCommasConfig } from "@/lib/challenge-config";
import { formatUsd, UPSELLS } from "@/lib/tiers";

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "Your Next Step — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Your AI AutoPilot Summit purchase confirmation and next optional step.",
      },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  const cfg = getCommasConfig();
  const summary = useEntitlementSummary();
  const access = summary.status === "ok" ? derivedAccess(summary.scopes) : null;

  const verifiedGaOnly = Boolean(access && access.hasGa && !access.hasVip);
  const verifiedVipNoVault = Boolean(access && access.hasVip && !access.hasVault);

  const video = verifiedGaOnly
    ? {
        url: cfg.sectionVideos.thankYouGa,
        label: "General Admission welcome and VIP invitation",
        envKey: "VITE_SUMMIT_VIDEO_THANK_YOU_GA",
      }
    : verifiedVipNoVault
      ? {
          url: cfg.sectionVideos.thankYouVip,
          label: "VIP welcome and Vault invitation",
          envKey: "VITE_SUMMIT_VIDEO_THANK_YOU_VIP",
        }
      : {
          url: cfg.sectionVideos.confirmedThankYou,
          label: "A message from the NuAmenti family",
          envKey: "VITE_SUMMIT_VIDEO_THANK_YOU",
        };

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Thank you, family</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your purchase is confirmed. Choose your next step.
      </h1>

      <FunnelVideoSlot url={video.url} label={video.label} envKey={video.envKey} className="mt-7" />

      {verifiedGaOnly ? <VipUpgradeNextStep /> : null}
      {verifiedVipNoVault ? <VaultNextStep /> : null}

      {!verifiedGaOnly && !verifiedVipNoVault ? (
        <section className="mt-5 rounded-md border border-[color:var(--gold)]/60 bg-[color:var(--surface)] p-5">
          <p className="font-heading text-foreground">
            We are checking the exact ticket level tied to your secure session.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep your FanBasis receipt and use the secure link in your NuAmenti email. A page URL by
            itself never proves a purchase.
          </p>
        </section>
      ) : null}

      <ProductThankYou
        verified={verifiedGaOnly}
        eyebrow="Verified · General Admission"
        headline="Thank you, family — your General Admission seat is confirmed."
        body="You are set for both live days: Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern. Your ticket stays complete whether you add VIP or not."
        videoUrl={null}
        videoLabel="General Admission welcome"
      />

      <ProductThankYou
        verified={verifiedVipNoVault}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — your VIP access is confirmed."
        body="You have both live Summit days, 30-day recordings, priority questions, and the VIP Build Lab immediately after Day 2 on Sunday from 4:15–5:45 PM Eastern."
        videoUrl={null}
        videoLabel="VIP welcome"
      />

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both Summit days run live online from 1:00–4:00 PM Eastern. The room opens at 12:45 PM
          Eastern.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href="/calendar/day1.ics"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 1 · Sat Aug 29
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 2 · Sun Aug 30
          </a>
        </div>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Bring this to Day 1</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, skill, offer, or clear idea.</li>
          <li>· The tasks that take too much time.</li>
          <li>· Your current prices, goals, and basic business numbers.</li>
          <li>· A laptop and your logo or brand files if you have them.</li>
        </ul>
      </section>

      <TestimonialSection
        page="confirmed"
        eyebrow="From the family"
        heading="What people say after they register"
      />

      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Reply to your receipt or email Info@NuAmenti.com.
      </p>
    </main>
  );
}

const noThanks = (
  <Link
    to="/next-steps"
    className="inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-3 text-sm text-foreground hover:bg-secondary sm:w-auto"
  >
    No thanks
  </Link>
);

function VipUpgradeNextStep() {
  const vip = UPSELLS.vip_upgrade;

  return (
    <>
      <OneClickUpgradeButton
        product="vip_upgrade"
        priceCents={vip.priceCents}
        declineSlot={noThanks}
        fallback={
          <Link
            to="/offer/vip-upgrade"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            Add VIP · {formatUsd(vip.priceCents)}
          </Link>
        }
      />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Your General Admission ticket remains active either way.
      </p>
    </>
  );
}

function VaultNextStep() {
  const vault = UPSELLS.vault;

  return (
    <>
      <OneClickUpgradeButton
        product="vault"
        priceCents={vault.priceCents}
        declineSlot={noThanks}
        fallback={
          <Link
            to="/offer/implementation-vault"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
          >
            Add the Vault · {formatUsd(vault.priceCents)}
          </Link>
        }
      />
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Your VIP access remains active either way.
      </p>
    </>
  );
}
