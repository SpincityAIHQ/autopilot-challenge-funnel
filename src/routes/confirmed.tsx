import { createFileRoute, Link } from "@tanstack/react-router";
import { getCommasConfig } from "@/lib/challenge-config";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import { TestimonialSection } from "@/components/TestimonialSection";
import { ProductThankYou } from "@/components/ProductThankYou";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";

/**
 * The next paid option is shown only after the secure session confirms what
 * the buyer already owns. A URL by itself never unlocks an offer or resource.
 */
export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "Payment Check — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Your Summit payment is being checked for the live sessions on Saturday August 29 and Sunday August 30, 1:00–4:00 PM Eastern.",
      },
      { property: "og:title", content: "AI AutoPilot Summit next step" },
      {
        property: "og:description",
        content: "Payment check for the AI AutoPilot 2-Day Summit.",
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
  const access =
    summary.status === "ok" ? derivedAccess(summary.scopes) : null;

  const verifiedGaOnly = Boolean(access && access.hasGa && !access.hasVip);
  const verifiedVipNoVault = Boolean(
    access && access.hasVip && !access.hasVault,
  );

  const confirmationVideo = verifiedGaOnly
    ? {
        url: cfg.sectionVideos.thankYouGa,
        label: "A note from the family — General Admission welcome",
        envKey: "VITE_SUMMIT_VIDEO_THANK_YOU_GA",
      }
    : verifiedVipNoVault
      ? {
          url: cfg.sectionVideos.thankYouVip,
          label: "A note from the family — VIP welcome",
          envKey: "VITE_SUMMIT_VIDEO_THANK_YOU_VIP",
        }
      : {
          url: cfg.sectionVideos.confirmedThankYou,
          label: "A note from the family — payment check",
          envKey: "VITE_SUMMIT_VIDEO_THANK_YOU",
        };

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">We are checking your payment</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Thank you, family. Your next step is being prepared.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Keep your FanBasis receipt. When your payment is confirmed, NuAmenti
        sends your access email with the right links and resources. Check your
        inbox, Promotions, and Spam folders.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        A page link alone does not prove a purchase. Use the secure link inside
        your NuAmenti email to open anything you bought.
      </p>
      <p className="mt-3 text-sm">
        <Link
          to="/communication-preferences"
          className="text-[color:var(--emerald-signal)] underline decoration-dotted underline-offset-4 hover:opacity-80"
        >
          Manage your email and text choices →
        </Link>
      </p>

      <FunnelVideoSlot
        url={confirmationVideo.url}
        label={confirmationVideo.label}
        envKey={confirmationVideo.envKey}
        className="mt-8"
      />

      <ProductThankYou
        verified={verifiedGaOnly}
        eyebrow="Verified · General Admission"
        headline="Thank you, family — your General Admission seat is confirmed."
        body="You are set for both live days: Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern. The room opens at 12:45 PM both days."
        videoUrl={null}
        videoLabel="A note from the family — General Admission welcome"
      />

      <ProductThankYou
        verified={verifiedVipNoVault}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — your VIP access is confirmed."
        body="You have both live Summit days, 30-day recordings, priority questions, and the VIP Build Lab on Thursday, September 3 from 7:00–9:00 PM Eastern."
        videoUrl={null}
        videoLabel="A note from the family — VIP welcome"
      />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both Summit days run live online from 1:00–4:00 PM Eastern. The room
          opens at 12:45 PM Eastern.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 1 — Sat Aug 29 · 1–4 PM ET
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 2 — Sun Aug 30 · 1–4 PM ET
          </a>
        </div>
        {verifiedVipNoVault ? (
          <p className="mt-4 text-sm text-muted-foreground">
            VIP Build Lab: Thursday, September 3 · 7:00–9:00 PM Eastern. Your
            VIP email will include the private Lab link and calendar reminder.
          </p>
        ) : null}
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          Bring this to the Summit
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, skill, offer, or clear idea.</li>
          <li>· A list of the tasks that take too much time.</li>
          <li>· Your current prices, goals, and basic business numbers.</li>
          <li>· A laptop and focused time on both days.</li>
          <li>· Your logo, photos, and brand files if you have them.</li>
          <li>· Never share passwords or private client data in a group chat.</li>
        </ul>
      </section>

      {verifiedGaOnly ? <VipUpgradeNextStep /> : null}
      {verifiedVipNoVault ? <VaultNextStep /> : null}

      <TestimonialSection
        page="confirmed"
        eyebrow="From the family"
        heading="What people say after they register"
      />

      <section className="mt-10">
        <h2 className="font-heading text-lg text-foreground">Questions?</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Reply to your receipt or email Info@NuAmenti.com. A real person will
          help you.
        </p>
      </section>

      <Link
        to="/"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to the Summit
      </Link>
    </main>
  );
}

function VipUpgradeNextStep() {
  const upgrade = UPSELLS.vip_upgrade;
  return (
    <section className="mt-10 surface-raised border-[color:var(--gold)] p-6">
      <p className="eyebrow">Optional next step</p>
      <h2 className="mt-2 font-heading text-xl text-foreground">
        Add the VIP Implementation Experience for {formatUsd(upgrade.priceCents)}?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {upgrade.summary} Your General Admission ticket stays active if you
        skip it.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/offer/vip-upgrade"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          See the VIP Experience
        </Link>
        <Link
          to="/next-steps"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          No thanks — continue with General Admission
        </Link>
      </div>
    </section>
  );
}

function VaultNextStep() {
  const vault = UPSELLS.vault;
  return (
    <section className="mt-10 surface-raised border-[color:var(--gold)] p-6">
      <p className="eyebrow">Optional next step</p>
      <h2 className="mt-2 font-heading text-xl text-foreground">
        {vault.name} — {formatUsd(vault.priceCents)}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{vault.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your VIP access stays active if you skip the Vault.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/offer/implementation-vault"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          See the Vault
        </Link>
        <Link
          to="/next-steps"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          No thanks — continue
        </Link>
      </div>
    </section>
  );
}
