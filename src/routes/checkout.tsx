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
          "Join the AI AutoPilot 2-Day Summit and build the foundation for a business powered by AI agents, apps, workflows, and loops.",
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
        : `Continue to secure checkout · ${formatUsd(tier.priceCents)}`;

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
        Two live days to map your niche, build the core system, and structure
        your first AI agent team. Payment is completed on a secure FanBasis
        page.
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
        <h2 className="font-heading text-lg text-foreground">{tier.name}</h2>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted-foreground">{tier.headline}</p>
          <span className="font-mono text-lg text-foreground">
            {formatUsd(tier.priceCents)}
          </span>
        </div>
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

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-muted-foreground">{tier.name}</dt>
            <dd className="font-mono text-foreground">
              {formatUsd(tier.priceCents)}
            </dd>
          </div>
          <div className="gold-rule my-2" />
          <div className="flex items-baseline justify-between">
            <dt className="font-heading text-base text-foreground">Total</dt>
            <dd className="font-mono text-base text-foreground">
              {formatUsd(tier.priceCents)}
            </dd>
          </div>
        </dl>

        {!qaReview ? (
          <label className="mt-6 flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={legalAck}
              onChange={(event) => setLegalAck(event.target.checked)}
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
