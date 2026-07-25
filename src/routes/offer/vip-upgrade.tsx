import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";

const product = "vip_upgrade" as const;

export const Route = createFileRoute("/offer/vip-upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade GA → VIP · AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "GA registrants: upgrade to VIP for the price difference and unlock 30-day recordings, the VIP Implementation Lab, priority Q&A, and the outreach vault.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Upgrade GA → VIP · AI AutoPilot Summit" },
      {
        property: "og:description",
        content:
          "Add recordings, the VIP Implementation Lab, priority Q&A, and the outreach vault for $55.",
      },
    ],
  }),
  component: VipUpgradeOffer,
});

function VipUpgradeOffer() {
  const cfg = getCommasConfig();
  const upgrade = UPSELLS.vip_upgrade;
  const url = resolveCheckoutUrl(product, cfg);
  const canBuy = isHandoffAllowed(product, cfg);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Only for GA registrants</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Upgrade GA → VIP for {formatUsd(upgrade.priceCents)}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This upgrade requires a verified GA registration on the same email. If
        you already bought VIP, you don't need this — you already have it.
      </p>

      <VideoSlot url={cfg.sectionVideos.hero ?? null} label="VIP upgrade preview" className="mt-8" />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">{upgrade.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{upgrade.summary}</p>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {upgrade.bullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {canBuy && url ? (
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
              VIP upgrade opening soon
            </button>
          )}
          <Link
            to="/confirmed"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            No thanks — back to confirmation
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Fulfillment verifies your GA registration by email. If no GA record is
          found, the payment is reversed automatically.
        </p>
      </section>
    </main>
  );
}
