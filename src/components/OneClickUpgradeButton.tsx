import { type ReactNode, useEffect, useState } from "react";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import {
  ONE_CLICK_DO_NOT_RETRY_MESSAGE,
  ONE_CLICK_NEXT_PATH,
  oneClickButtonLabel,
  oneClickDisclosure,
  secureCheckoutLabel,
  type OneClickAvailability,
  type OneClickProduct,
  type SavedCardDisplay,
} from "@/lib/one-click";

/**
 * The primary button that sits directly under a funnel video.
 *
 * It shows a saved-card one-click charge when — and only when — the server
 * confirms one is possible. In every other case it renders the ordinary Commas
 * checkout handoff, so the buyer is never stranded:
 *
 *   Commas has a saved card  →  "Add VIP · $77 with Visa •••• 4242"
 *   anything else            →  "Continue to Secure Checkout · $77"
 *
 * The component never learns the API key, the customer id, or the payment
 * method id. It receives a card brand and last four digits and nothing more.
 *
 * A charge takes two deliberate taps: the first arms the confirmation, the
 * second sends it. `confirm: true` is required by the server as well.
 */
export function OneClickUpgradeButton({
  product,
  priceCents,
  fallback,
  declineSlot,
}: {
  product: OneClickProduct;
  priceCents: number;
  /** The normal Commas checkout element used whenever one-click is off. */
  fallback: ReactNode;
  /** The "No thanks" control, rendered beside the primary button. */
  declineSlot?: ReactNode;
}) {
  const qaReview = useQaReviewMode();
  const [availability, setAvailability] = useState<OneClickAvailability | null>(null);
  const [checked, setChecked] = useState(false);
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "done" | "declined" | "hold" | "fallback">(
    "idle",
  );

  useEffect(() => {
    // The owner walkthrough must never reach a charging endpoint.
    if (qaReview) {
      setChecked(true);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/one-click-upgrade?product=${encodeURIComponent(product)}`,
          { method: "GET", credentials: "same-origin", cache: "no-store" },
        );
        if (!alive) return;
        if (!res.ok) {
          setChecked(true);
          return;
        }
        const body = (await res.json()) as OneClickAvailability;
        if (!alive) return;
        setAvailability(body);
      } catch {
        // Fail closed to the secure-checkout fallback.
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product, qaReview]);

  async function submitCharge() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/one-click-upgrade", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, confirm: true }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fallback?: boolean;
        doNotRetry?: boolean;
      };

      if (res.ok && body.ok) {
        window.location.href = ONE_CLICK_NEXT_PATH[product];
        setOutcome("done");
        return;
      }
      if (body.doNotRetry || res.status === 202 || res.status === 409) {
        setOutcome("hold");
        return;
      }
      if (res.status === 402) {
        setOutcome("declined");
        return;
      }
      setOutcome("fallback");
    } catch {
      // A network failure after the request left the browser is ambiguous:
      // the charge may have gone through. Never re-arm the button.
      setOutcome("hold");
    } finally {
      setSubmitting(false);
    }
  }

  // Still deciding, or one-click is not on the table: show the normal checkout.
  const card: SavedCardDisplay | null = availability?.card ?? null;
  const oneClickOn =
    !qaReview &&
    checked &&
    Boolean(availability?.oneClickAvailable) &&
    Boolean(card) &&
    outcome !== "declined" &&
    outcome !== "fallback";

  if (availability?.awaitingConfirmation || outcome === "hold") {
    return (
      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <p role="status" className="font-heading text-sm text-foreground">
          {ONE_CLICK_DO_NOT_RETRY_MESSAGE}
        </p>
      </section>
    );
  }

  if (!oneClickOn || !card) {
    return (
      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          {fallback}
          {declineSlot}
        </div>
        {outcome === "declined" ? (
          <p role="alert" className="mt-3 text-center text-xs text-[color:var(--gold)]">
            That card was declined and nothing was charged. You can complete this on the secure
            checkout page.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            void submitCharge();
          }}
          className={`inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground transition ${
            submitting ? "cursor-wait opacity-60" : "hover:opacity-90"
          }`}
        >
          {submitting
            ? "Charging…"
            : armed
              ? `Confirm ${oneClickButtonLabel(product, priceCents, card)}`
              : oneClickButtonLabel(product, priceCents, card)}
        </button>
        {declineSlot}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {oneClickDisclosure(priceCents, card)}
      </p>

      {armed && !submitting ? (
        <p className="mt-2 text-center text-xs text-[color:var(--gold)]">
          Tap once more to authorize. Nothing has been charged yet.
        </p>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer text-center text-xs text-muted-foreground underline">
          Use the secure checkout page instead
        </summary>
        <div className="mt-3">{fallback}</div>
      </details>
    </section>
  );
}
