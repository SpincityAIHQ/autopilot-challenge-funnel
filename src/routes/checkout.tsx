import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  TIERS,
  TIER_MAP,
  formatUsd,
  isTierId,
  type AdmissionTierId,
} from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";

const searchSchema = z.object({
  tier: z.enum(["ga", "vip"]).optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Checkout — AI AutoPilot Summit" },
      {
        name: "description",
        content: "Secure your seat for the AI AutoPilot Summit, live online Aug 24–25, 2026.",
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
  const initialTier: AdmissionTierId = isTierId(search.tier) ? search.tier : "ga";
  const [tier, setTier] = useState<AdmissionTierId>(initialTier);

  const cfg = useMemo(() => getCommasConfig(), []);
  const t = TIER_MAP[tier];
  const checkoutUrl = resolveCheckoutUrl(tier, cfg);
  const canSubmit = isHandoffAllowed(tier, cfg);
  const buttonLabel = canSubmit
    ? `Continue to secure checkout · ${formatUsd(t.priceCents)}`
    : "Registration opening soon";

  function onTierChange(next: string) {
    if (!isTierId(next)) return;
    setTier(next);
    navigate({ to: "/checkout", search: { tier: next } });
  }

  function handleContinue() {
    if (!canSubmit || !checkoutUrl) return;
    window.location.href = checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Checkout · AI AutoPilot Summit</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Meet us at the Summit
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Aug 24–25, 2026 · live online. You'll finish payment on a secure FanBasis
        page.
      </p>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Your ticket</h2>
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
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">How communication works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure FanBasis checkout collects only your order details. NuAmenti
          communication preferences (email, SMS, calls) are confirmed
          separately after purchase — never bundled into buying a ticket.
        </p>
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
            <dt className="font-heading text-base text-foreground">Total</dt>
            <dd className="font-mono text-base text-foreground">
              {formatUsd(t.priceCents)}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleContinue}
          aria-disabled={!canSubmit}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-heading text-base font-semibold text-primary-foreground transition ${
            canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
          }`}
        >
          {buttonLabel}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          By continuing, you agree to the{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>, and{" "}
          <Link to="/refund-policy" className="underline hover:text-foreground">Refund Policy</Link>.
        </p>
      </section>
    </main>
  );
}
