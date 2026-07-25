import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import { TestimonialSection } from "@/components/TestimonialSection";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";

/**
 * Post-purchase confirmation.
 *
 * SECURITY: Downstream offer names, prices, and links are NEVER revealed
 * from `?tier=` (which is user-controlled). We only reveal the next
 * ascension choice after the entitlement-summary API confirms the buyer
 * holds the required prior scope from a verified HttpOnly session.
 *
 * Until then this page is a warm, generic "we're verifying your payment"
 * state with secure-access instructions and calendar files.
 */

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "Thank you, family — AI AutoPilot Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Thank you for registering. Check your email for your receipt and Summit access details.",
      },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  const cfg = getCommasConfig();
  const thankYouUrl = cfg.sectionVideos.confirmedThankYou ?? null;
  const summary = useEntitlementSummary();
  const access =
    summary.status === "ok" ? derivedAccess(summary.scopes) : null;

  // Reveal rules — session-driven only. Never derived from a URL param.
  //   GA (no VIP)  → show VIP Implementation Experience next-step block.
  //   VIP (no Vault) → show Vault next-step block.
  //   Everything else → no downstream offer content.
  const showGaUpgradeChoice = Boolean(access && access.hasGa && !access.hasVip);
  const showVaultChoice = Boolean(
    access && access.hasVip && !access.hasVault,
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">We're verifying your payment</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Thank you, family — we're verifying your payment.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your FanBasis receipt is proof of payment. The official NuAmenti
        verification + access email is the authority for entry, links, and
        resources. It is sent once our operator has verified your payment —
        we do not advertise an automatic SLA. Check inbox, Promotions, and
        Spam. Nothing on this page unlocks the Summit or any add-on on its
        own.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Your post-purchase return URL is configured by our operator on the
        FanBasis checkout page — not by this app. A redirect back to this
        site is not authentication. Only the secure link in your NuAmenti
        access email establishes the verified session used to unlock any
        add-on.
      </p>
      <p className="mt-3 text-sm">
        <Link
          to="/communication-preferences"
          className="text-[color:var(--emerald-signal)] underline decoration-dotted underline-offset-4 hover:opacity-80"
        >
          Manage your communication preferences →
        </Link>
      </p>

      <VideoSlot
        url={thankYouUrl}
        label="Watch: a note from the family"
        className="mt-8"
      />
      {!thankYouUrl ? (
        <div
          className="mt-8 aspect-video rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)] p-6"
          aria-label="Thank-you video placeholder"
        >
          <p className="label-mono">Thank-you video</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Your personal welcome from the family lands here on event day.
          </p>
        </div>
      ) : null}

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Summit runs live online across both days. Exact session start
          times are sent to registrants closer to the event.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 1 — Mon Aug 24, 2026
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 2 — Tue Aug 25, 2026
          </a>
        </div>
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Prepare to build</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, offer, or idea you're ready to map.</li>
          <li>· A laptop and focused hours across both days.</li>
          <li>· Your logo, photos, brand files, and short videos if you have them.</li>
          <li>· Never paste passwords or private client data into shared chats.</li>
        </ul>
      </section>

      {showGaUpgradeChoice ? <VipUpgradeNextStep /> : null}
      {showVaultChoice ? <VaultNextStep /> : null}

      <TestimonialSection
        page="confirmed"
        eyebrow="From the family"
        heading="What people say after they register"
      />

      <section className="mt-10">
        <h2 className="font-heading text-lg text-foreground">Questions?</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Reply to your receipt or write Info@NuAmenti.com. We're a family —
          real humans answer.
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
    <section className="mt-10 surface-raised p-6 border-[color:var(--gold)]">
      <p className="eyebrow">Your first choice — one time only</p>
      <h2 className="mt-2 font-heading text-xl text-foreground">
        Add the VIP Implementation Experience for {formatUsd(upgrade.priceCents)}?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {upgrade.summary} Your GA ticket remains valid either way.
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
          No thanks — continue with GA
        </Link>
      </div>
    </section>
  );
}

function VaultNextStep() {
  const vault = UPSELLS.vault;
  return (
    <section className="mt-10 surface-raised p-6 border-[color:var(--gold)]">
      <p className="eyebrow">Add now — build faster</p>
      <h2 className="mt-2 font-heading text-xl text-foreground">
        {vault.name} — {formatUsd(vault.priceCents)}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{vault.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        The Vault does not include admission or recordings; your VIP ticket
        remains valid whether you add the Vault or not.
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
