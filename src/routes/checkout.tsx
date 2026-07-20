import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  TIERS,
  TIER_MAP,
  GA_BUMP_CENTS,
  GA_BUMP_LABEL,
  computeTotalCents,
  formatUsd,
  isTierId,
  FOUNDER_DISCLAIMER,
} from "@/lib/tiers";
import { getCommasConfig, resolveCheckoutUrl } from "@/lib/challenge-config";

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
  const [bump, setBump] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailMkt, setEmailMkt] = useState(false);
  const [smsMkt, setSmsMkt] = useState(false);
  const [agreedPolicies, setAgreedPolicies] = useState(false);

  const cfg = useMemo(() => getCommasConfig(), []);
  const t = TIER_MAP[tier];
  const total = computeTotalCents(tier, bump);
  const bumpApplies = tier === "ga" && bump;
  const checkoutUrl = resolveCheckoutUrl(tier, bump, cfg);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    fullName.trim().length >= 2 &&
    emailValid &&
    agreedPolicies &&
    checkoutUrl !== null;

  const buttonLabel = checkoutUrl
    ? `Continue to secure payment · ${formatUsd(total)}`
    : "Registration opening soon";

  function onTierChange(next: string) {
    if (!isTierId(next)) return;
    setTier(next);
    if (next !== "ga") setBump(false);
    navigate({ to: "/checkout", search: { tier: next } });
  }

  function handleContinue() {
    if (!canSubmit || !checkoutUrl) return;
    // Redirect to Commas hosted checkout. We do NOT collect card data here.
    window.location.href = checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        The AUTOPILOT Challenge
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Card details are collected by Commas on the next screen. This page is a
        secure summary — we never process payments here.
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
          <label className="mt-4 flex items-start gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={bump}
              onChange={(e) => setBump(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
            />
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm text-foreground">Add: {GA_BUMP_LABEL}</span>
                <span className="font-mono text-sm text-foreground">
                  + {formatUsd(GA_BUMP_CENTS)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Available only with GA.
              </p>
            </div>
          </label>
        ) : null}

        {tier === "founder" ? (
          <p className="mt-4 text-xs text-muted-foreground">{FOUNDER_DISCLAIMER}</p>
        ) : null}
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Your details</h2>
        <div className="mt-4 space-y-3">
          <Field
            id="full_name"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            required
            autoComplete="name"
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <Field
            id="phone"
            label="Phone (optional)"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            hint="Providing a phone number is NOT consent to SMS marketing."
          />
        </div>
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label={t.name} value={formatUsd(t.priceCents)} />
          {bumpApplies ? (
            <Row label={`Bump · ${GA_BUMP_LABEL}`} value={`+ ${formatUsd(GA_BUMP_CENTS)}`} />
          ) : null}
          <div className="gold-rule my-2" />
          <Row label="Total" value={formatUsd(total)} strong />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Transactional access to the Challenge is separate from any marketing consent.
        </p>
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Consent</h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={emailMkt}
              onChange={(e) => setEmailMkt(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
            />
            <span className="text-muted-foreground">
              I agree to receive marketing emails from SpincityHQ / NuAmenti.
              This is optional. Unchecking still confirms my Challenge access.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={smsMkt}
              onChange={(e) => setSmsMkt(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
            />
            <span className="text-muted-foreground">
              I agree to receive marketing text messages. Message and data rates
              may apply. This is separate from providing my phone number.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreedPolicies}
              onChange={(e) => setAgreedPolicies(e.target.checked)}
              required
              className="mt-1 accent-[color:var(--gold)]"
            />
            <span className="text-muted-foreground">
              I've reviewed the{" "}
              <Link to="/terms" className="underline">Terms</Link>,{" "}
              <Link to="/privacy" className="underline">Privacy</Link>, and{" "}
              <Link to="/refund-policy" className="underline">Refund Policy</Link>.
            </span>
          </label>
        </div>
      </section>

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
        {!checkoutUrl ? (
          <p className="text-xs text-muted-foreground">
            Registration for this tier hasn't opened yet. Check back soon.
          </p>
        ) : null}
        <Link to="/" className="text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back to the Challenge
        </Link>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono block">
        {label}
        {required ? <span className="ml-1 text-[color:var(--gold)]">*</span> : null}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[color:var(--gold)]"
      />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={strong ? "font-heading text-base text-foreground" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd className={`font-mono ${strong ? "text-base text-foreground" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
