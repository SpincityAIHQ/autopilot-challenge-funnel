import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { VideoSlot } from "@/components/VideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";
import { getConfirmationContent } from "@/lib/funnel-content";
import { UPSELLS, formatUsd, isTierId, type AdmissionTierId } from "@/lib/tiers";
import { CONFIRMATION_CONTENT } from "@/lib/funnel-content";

const searchSchema = z.object({
  tier: z.enum(["ga", "vip"]).optional(),
});

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
  const tier: AdmissionTierId | null = isTierId(search.tier) ? search.tier : null;
  const content = getConfirmationContent(tier);
  const cfg = getCommasConfig();
  const thankYouUrl = cfg.sectionVideos.confirmedThankYou ?? null;
  const vault = UPSELLS.vault;
  const showGaUpgradeChoice =
    tier === "ga" && CONFIRMATION_CONTENT.ga.showVipUpgrade;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">You're in</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {content?.headline ??
          "Thank you, family — we're checking your registration."}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Look for the FanBasis receipt and the NuAmenti welcome email. Your seat
        is confirmed after payment is verified. This page alone does not unlock
        the Summit. Note: your post-payment redirect is a FanBasis / Commas
        operator setting — the exact return URL is configured on the checkout
        page, not in this app.
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
          <p className="eyebrow">GA only — one decision</p>
          <h2 className="mt-2 font-heading text-xl text-foreground">
            Upgrade GA → VIP for {formatUsd(UPSELLS.vip_upgrade.priceCents)}, or keep GA and continue.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {UPSELLS.vip_upgrade.summary} Your GA ticket remains valid either way.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/offer/vip-upgrade"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Upgrade to VIP — {formatUsd(UPSELLS.vip_upgrade.priceCents)}
            </Link>
            <Link
              to="/offer/implementation-vault"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
            >
              Keep GA — continue to the Implementation Vault
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-10 surface-raised p-6 border-[color:var(--gold)]">
          <p className="eyebrow">Add now — save later</p>
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
              See the Vault — {formatUsd(vault.priceCents)}
            </Link>
            <Link
              to="/next-keynote"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
            >
              No thanks — take me to the next keynote
            </Link>
          </div>
        </section>
      )}

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
