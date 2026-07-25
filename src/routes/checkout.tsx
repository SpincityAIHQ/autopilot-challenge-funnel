import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { TIER_MAP, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import { TestimonialSection } from "@/components/TestimonialSection";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { useQaReviewMode } from "@/hooks/use-qa-review";

/**
 * Sequential ascension funnel — checkout page.
 * Only General Admission ($22) is offered here. Any legacy ?tier=vip URL is
 * safely normalized to GA so visitors cannot skip the sequence. Deeper
 * implementation experiences are offered ONLY after verified GA purchase.
 */
const searchSchema = z.object({
  // Accept legacy + private-preview search values without changing the offer.
  tier: z.string().optional(),
  qaStage: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Reserve Your Seat — NuAmenti × Perfect AIM" },
      {
        name: "description",
        content:
          "Reserve your seat for the NuAmenti × Perfect AIM AI AutoPilot Summit, live online Aug 24–25, 2026.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: Checkout,
});

function Checkout() {
  const cfg = useMemo(() => getCommasConfig(), []);
  const t = TIER_MAP.ga;
  const checkoutUrl = resolveCheckoutUrl("ga", cfg);
  const gateAllowed = isHandoffAllowed("ga", cfg);
  const qaReview = useQaReviewMode();
  const [legalAck, setLegalAck] = useState(false);
  const canSubmit = qaReview || (gateAllowed && legalAck);
  const buttonLabel = qaReview
    ? "Continue funnel preview — no payment"
    : !gateAllowed
      ? "Checkout link being connected"
      : !legalAck
        ? "Acknowledge the policies to continue"
        : `Continue to secure checkout · ${formatUsd(t.priceCents)}`;

  function handleContinue() {
    if (qaReview) {
      window.location.href = "/confirmed?qaStage=ga";
      return;
    }
    if (!canSubmit || !checkoutUrl) return;
    window.location.href = checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">NuAmenti × Perfect AIM · AI AutoPilot Summit</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Meet us at the Summit
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Aug 24–25, 2026 · live online. You'll finish payment on a secure
        FanBasis page.
      </p>

      {qaReview ? (
        <section className="mt-6 rounded-md border border-[color:var(--emerald-signal)]/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Owner preview:</strong> walk the
          full funnel without charging a card, creating an order, or reserving
          a seat.
          <button
            type="button"
            onClick={handleContinue}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-heading text-base font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Continue to GA confirmation — no payment
          </button>
        </section>
      ) : null}

      <FunnelVideoSlot
        url={cfg.sectionVideos.checkout}
        label="Watch before you reserve your seat"
        envKey="VITE_SUMMIT_VIDEO_CHECKOUT"
        className="mt-8"
      />

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">{t.name}</h2>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t.headline}</p>
          <span className="font-mono text-lg text-foreground">
            {formatUsd(t.priceCents)}
          </span>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {t.bullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Deeper implementation experiences are offered one at a time only
          after each prior step is confirmed.
        </p>
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          How communication works
        </h2>
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
            <dd className="font-mono text-foreground">
              {formatUsd(t.priceCents)}
            </dd>
          </div>
          <div className="gold-rule my-2" />
          <div className="flex items-baseline justify-between">
            <dt className="font-heading text-base text-foreground">Total</dt>
            <dd className="font-mono text-base text-foreground">
              {formatUsd(t.priceCents)}
            </dd>
          </div>
        </dl>

        {!qaReview ? (
          <label className="mt-6 flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={legalAck}
              onChange={(e) => setLegalAck(e.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
              aria-describedby="legal-ack-copy"
            />
            <span id="legal-ack-copy">
              I have read and agree to the{" "}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms
              </Link>
              ,{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                to="/refund-policy"
                className="underline hover:text-foreground"
              >
                Refund Policy
              </Link>
              .
            </span>
          </label>
        ) : null}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleContinue}
          aria-disabled={!canSubmit}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-heading text-base font-semibold text-primary-foreground transition ${
            canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
          }`}
        >
          {buttonLabel}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          By continuing to a live checkout, you agree to the{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>
          ,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy
          </Link>
          , and{" "}
          <Link to="/refund-policy" className="underline hover:text-foreground">
            Refund Policy
          </Link>
          .
        </p>
      </section>

      <TestimonialSection
        page="checkout"
        eyebrow="From the family"
        heading="Why people reserved a seat"
      />
    </main>
  );
}
