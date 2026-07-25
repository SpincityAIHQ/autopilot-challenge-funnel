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
import { CONSENT_COPY } from "@/lib/consent";

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
  const [phone, setPhone] = useState("");
  const [consents, setConsents] = useState({
    email: false,
    sms: false,
    ai_call: false,
  });

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
    // Consent + phone stay on this side of the wall for now; on the receipt
    // webhook we'll match by email and persist consents with copy version.
    // Nothing here fulfills anything — the webhook does.
    try {
      window.sessionStorage.setItem(
        "nu.checkout.pending",
        JSON.stringify({ tier, phone, consents, at: new Date().toISOString() }),
      );
    } catch {
      // sessionStorage unavailable — proceed anyway.
    }
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
        <h2 className="font-heading text-lg text-foreground">Optional phone</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Providing a phone number is optional and is NOT marketing consent.
        </p>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className="mt-3 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground"
        />
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Stay in touch (optional)</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Each channel is separate, optional, and revocable. Marketing consent is
          never required to buy a ticket.
        </p>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          {(["email", "sms", "ai_call"] as const).map((k) => (
            <label key={k} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consents[k]}
                onChange={(e) =>
                  setConsents((prev) => ({ ...prev, [k]: e.target.checked }))
                }
                className="mt-1 accent-[color:var(--gold)]"
              />
              <span>{CONSENT_COPY[k]}</span>
            </label>
          ))}
        </div>
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
