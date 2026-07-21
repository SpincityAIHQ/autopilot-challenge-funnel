import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  TIERS,
  TIER_MAP,
  GA_BUMP_COPY,
  formatUsd,
  isTierId,
  FOUNDER_DISCLAIMER,
} from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { useFounderSeatsRemaining } from "@/hooks/use-founder-seats";
import { VideoSlot } from "@/components/VideoSlot";

const searchSchema = z.object({
  tier: z.enum(["ga", "vip", "bundle", "founder"]).optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Checkout — The AUTOPILOT Challenge" },
      {
        name: "description",
        content: "Secure your seat for the 2-day live Challenge.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: Checkout,
});

function Checkout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const initialTier: import("@/lib/tiers").TierId = isTierId(search.tier) ? search.tier : "ga";
  const [tier, setTier] = useState<import("@/lib/tiers").TierId>(initialTier);

  const cfg = useMemo(() => getCommasConfig(), []);
  const seats = useFounderSeatsRemaining();
  const t = TIER_MAP[tier];
  const checkoutUrl = resolveCheckoutUrl(tier, cfg);
  const handoffAllowed = isHandoffAllowed(tier, cfg);

  // Founder-only additional gate: must have verified seats remaining > 0.
  const founderBlocked =
    tier === "founder" &&
    (seats.status !== "ok" || seats.remaining <= 0);

  const canSubmit = handoffAllowed && !founderBlocked;

  let buttonLabel = "Registration opening soon";
  if (canSubmit) {
    buttonLabel = `Continue to secure payment · ${formatUsd(t.priceCents)}`;
  } else if (tier === "founder" && seats.status === "ok" && seats.remaining <= 0) {
    buttonLabel = "Founder Seats sold out";
  }

  function onTierChange(next: string) {
    if (!isTierId(next)) return;
    setTier(next);
    navigate({ to: "/checkout", search: { tier: next } });
  }

  function handleContinue() {
    if (!canSubmit || !checkoutUrl) return;
    // Redirect to Commas hosted checkout. We do NOT collect card data,
    // buyer identity, or marketing consent on this page — Commas does.
    window.location.href = checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        The AUTOPILOT Challenge
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Commas securely collects your buyer details, payment, and consent
        preferences on the next screen. This page is a review-only summary.
      </p>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Your tier</h2>
        <div className="mt-4 grid gap-2">
          {TIERS.map((row) => (
            <label
              key={row.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                tier === row.id
                  ? "border-[color:var(--gold)] bg-secondary/60"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={row.id}
                checked={tier === row.id}
                onChange={(e) => onTierChange(e.target.value)}
                className="mt-1 accent-[color:var(--gold)]"
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-heading text-foreground">{row.name}</span>
                  <span className="font-mono text-sm text-foreground">
                    {formatUsd(row.priceCents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{row.headline}</p>
              </div>
            </label>
          ))}
        </div>

        {tier === "ga" ? (
          <p className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
            {GA_BUMP_COPY}
          </p>
        ) : null}

        {tier === "founder" ? (
          <p className="mt-4 text-xs text-muted-foreground">{FOUNDER_DISCLAIMER}</p>
        ) : null}
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-muted-foreground">{t.name}</dt>
            <dd className="font-mono text-foreground">{formatUsd(t.priceCents)}</dd>
          </div>
          <div className="gold-rule my-2" />
          <div className="flex items-baseline justify-between">
            <dt className="font-heading text-base text-foreground">Subtotal</dt>
            <dd className="font-mono text-base text-foreground">{formatUsd(t.priceCents)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Optional add-ons (like the GA $22 recordings bump) and marketing
          consent are shown inside secure Commas checkout.
        </p>
      </section>

      <VideoSlot url={cfg.sectionVideos?.checkout ?? null} label="Watch: what happens next in Commas" className="mt-8" />

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleContinue}
          className="w-full rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          aria-disabled={!canSubmit}
        >
          {buttonLabel}
        </button>
        {!canSubmit ? (
          <p className="text-xs text-muted-foreground">
            {tier === "founder" && seats.status === "ok" && seats.remaining <= 0
              ? "All 33 Founder Seats are claimed."
              : "Registration for this tier hasn't opened yet. Check back soon."}
          </p>
        ) : null}
        {tier === "founder" ? (
          <p className="text-xs text-muted-foreground">{FOUNDER_DISCLAIMER}</p>
        ) : null}
        <Link to="/" className="text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to the Challenge
        </Link>
      </div>
    </main>
  );
}
