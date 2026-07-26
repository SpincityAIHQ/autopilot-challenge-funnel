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
 * implementation experiences are offered only after verified GA purchase.
 */
const searchSchema = z.object({
  tier: z.string().optional(),
  qaStage: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Reserve Your Seat — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "Join the AI AutoPilot 2-Day Summit, live Saturday August 29 and Sunday August 30 from 1:00–4:00 PM Eastern.",
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
  const tier = TIER_MAP.ga;
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
        : `Reserve General Admission · ${formatUsd(tier.priceCents)}`;

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
      <p className="eyebrow">
        SpinCityHQ &amp; NuAmenti present · AI AutoPilot 2-Day Summit
      </p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Start building your AI-powered business
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saturday, August 29 and Sunday, August 30 · 1:00–4:00 PM Eastern ·
        live online. The room opens at 12:45 PM both days.
      </p>

      <FunnelVideoSlot
        url={cfg.sectionVideos.checkout}
        label="Watch before you reserve your seat"
        envKey="VITE_SUMMIT_VIDEO_CHECKOUT"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)]/70 bg-[color:var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-mono">General Admission</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Both live Summit days
            </p>
          </div>
          <p className="font-display text-2xl text-[color:var(--gold)]">
            {formatUsd(tier.priceCents)}
          </p>
        </div>

        {qaReview ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Owner preview:</strong> this
            continues through the complete funnel without charging a card,
            creating an order, or reserving a seat.
          </p>
        ) : (
          <label className="mt-4 flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={legalAck}
              onChange={(event) => setLegalAck(event.target.checked)}
              className="mt-1 accent-[color:var(--gold)]"
              aria-describedby="legal-ack-copy"
            />
            <span id="legal-ack-copy">
              I agree to the{" "}
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
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleContinue}
          aria-disabled={!canSubmit}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3.5 font-heading text-base font-semibold text-primary-foreground transition ${
            canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
          }`}
        >
          {buttonLabel}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Your first payment is completed securely on FanBasis.
        </p>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">What you get</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tier.headline}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {tier.bullets.map((bullet) => (
            <li key={bullet}>· {bullet}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Deeper build support is offered one step at a time only after each
          earlier step is confirmed.
        </p>
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          How communication works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure FanBasis checkout collects your order details. NuAmenti email,
          text, and call preferences are confirmed separately after purchase.
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
