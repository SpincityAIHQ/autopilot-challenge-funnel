import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { VideoSlot } from "@/components/VideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";
import {
  getConfirmationContent,
  CONFIRMATION_CONTENT,
  type ConfirmationTier,
} from "@/lib/funnel-content";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import { TestimonialSection } from "@/components/TestimonialSection";

const searchSchema = z.object({
  tier: z.enum(["ga", "vip"]).optional(),
});

function isConfirmationTier(v: unknown): v is ConfirmationTier {
  return v === "ga" || v === "vip";
}

export const Route = createFileRoute("/confirmed")({
  validateSearch: (input) => searchSchema.parse(input),
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
  const search = Route.useSearch();
  const tier: ConfirmationTier | null = isConfirmationTier(search.tier)
    ? search.tier
    : null;
  const content = getConfirmationContent(tier);
  const cfg = getCommasConfig();
  const thankYouUrl = cfg.sectionVideos.confirmedThankYou ?? null;
  const vault = UPSELLS.vault;
  const vipUpgrade = UPSELLS.vip_upgrade;
  const showGaUpgradeChoice =
    tier === "ga" && CONFIRMATION_CONTENT.ga.showVipUpgrade;
  const showVaultChoice =
    tier === "vip" && CONFIRMATION_CONTENT.vip.showVaultOffer;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">We're verifying your payment</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {content?.headline ??
          "Thank you, family. We're verifying your payment now."}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your FanBasis receipt confirms payment was received. The official
        NuAmenti verification + access email is the authority for entry, links,
        and resources — it usually arrives within a few hours. Check inbox,
        Promotions, and Spam. Nothing on this page proves purchase or unlocks
        the Summit on its own.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Note: your post-payment redirect is a FanBasis / Commas operator
        setting — the exact return URL is configured on the checkout page, not
        in this app.
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
        label={content?.videoLabel ?? "Watch: a note from the family"}
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

      {content ? (
        <section className="mt-10 surface-raised p-6">
          <h2 className="font-heading text-lg text-foreground">What you have</h2>
          <p className="mt-3 text-sm text-muted-foreground">{content.included}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {content.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {content.notices.length ? (
            <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
              {content.notices.map((n) => (
                <p key={n} className="mt-2 first:mt-0">{n}</p>
              ))}
            </div>
          ) : null}
        </section>
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

      {showGaUpgradeChoice ? (
        <section className="mt-10 surface-raised p-6 border-[color:var(--gold)]">
          <p className="eyebrow">Your first choice — one time only</p>
          <h2 className="mt-2 font-heading text-xl text-foreground">
            Add the VIP Implementation Experience for {formatUsd(vipUpgrade.priceCents)}?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {vipUpgrade.summary} Your GA ticket remains valid either way.
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
      ) : null}

      {showVaultChoice ? (
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
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {vault.bullets.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
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
      ) : null}

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
