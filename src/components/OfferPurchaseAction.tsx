import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/tiers";
import { useQaReviewMode } from "@/hooks/use-qa-review";

type OneClickProduct = "vip_upgrade" | "vault";

type QuoteState =
  | { status: "idle" | "checking" | "fallback" }
  | {
      status: "available";
      card: { brand: string; last4: string };
      amountCents: number;
      successPath: string;
    }
  | { status: "processing"; cardLabel: string }
  | { status: "pending"; message: string }
  | { status: "error"; message: string };

interface OfferPurchaseActionProps {
  product: OneClickProduct;
  productName: string;
  priceCents: number;
  fallbackUrl: string | null;
  fallbackAllowed: boolean;
  qaHref: string;
  qaLabel: string;
}

/**
 * One-click saved-card upsell with a normal Commas checkout fallback.
 *
 * The browser receives only card brand + last four digits. Customer IDs,
 * payment-method IDs, buyer email, amount authority, and the Commas API key
 * stay server-side. Clicking the one-click button is the buyer's explicit
 * authorization for the exact displayed one-time amount.
 */
export function OfferPurchaseAction({
  product,
  productName,
  priceCents,
  fallbackUrl,
  fallbackAllowed,
  qaHref,
  qaLabel,
}: OfferPurchaseActionProps) {
  const qaReview = useQaReviewMode();
  const [state, setState] = useState<QuoteState>({ status: "idle" });

  useEffect(() => {
    if (qaReview || !fallbackAllowed) return;

    let alive = true;
    setState({ status: "checking" });

    void (async () => {
      try {
        const response = await fetch(
          `/api/public/one-click-offer?product=${encodeURIComponent(product)}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          },
        );
        const body = (await response.json().catch(() => null)) as
          | {
              available?: boolean;
              amountCents?: number;
              card?: { brand?: string; last4?: string };
              successPath?: string;
            }
          | null;

        if (!alive) return;
        if (
          response.ok &&
          body?.available === true &&
          typeof body.amountCents === "number" &&
          body.amountCents === priceCents &&
          typeof body.card?.brand === "string" &&
          typeof body.card?.last4 === "string" &&
          /^[0-9]{4}$/.test(body.card.last4) &&
          typeof body.successPath === "string" &&
          body.successPath.startsWith("/")
        ) {
          setState({
            status: "available",
            amountCents: body.amountCents,
            card: {
              brand: body.card.brand,
              last4: body.card.last4,
            },
            successPath: body.successPath,
          });
          return;
        }
        setState({ status: "fallback" });
      } catch {
        if (alive) setState({ status: "fallback" });
      }
    })();

    return () => {
      alive = false;
    };
  }, [fallbackAllowed, priceCents, product, qaReview]);

  async function chargeSavedCard(
    quote: Extract<QuoteState, { status: "available" }>,
  ) {
    const cardLabel = `${quote.card.brand} •••• ${quote.card.last4}`;
    setState({ status: "processing", cardLabel });

    try {
      const response = await fetch("/api/public/one-click-offer", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, confirmed: true }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            paid?: boolean;
            reason?: string;
            successPath?: string;
          }
        | null;

      if (
        response.ok &&
        body?.ok === true &&
        typeof body.successPath === "string" &&
        body.successPath.startsWith("/")
      ) {
        window.location.assign(body.successPath);
        return;
      }

      if (body?.reason === "already-charged") {
        window.location.assign(quote.successPath);
        return;
      }

      if (
        body?.paid === true ||
        body?.reason === "charge-processing" ||
        body?.reason === "charge-status-unknown"
      ) {
        setState({
          status: "pending",
          message:
            "Your charge may already be processing. Do not click again. Watch this page and your NuAmenti email while we confirm it.",
        });
        return;
      }

      setState({
        status: "error",
        message:
          "The saved-card charge did not complete. Use the secure checkout below instead.",
      });
    } catch {
      setState({
        status: "pending",
        message:
          "We could not confirm the charge status. Do not click again. Check your FanBasis receipt and NuAmenti email before retrying.",
      });
    }
  }

  if (qaReview) {
    return (
      <a
        href={qaHref}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 text-center font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      >
        {qaLabel}
      </a>
    );
  }

  if (!fallbackAllowed) {
    return <Disabled label={`${productName} checkout is being connected`} />;
  }

  if (state.status === "checking" || state.status === "idle") {
    return <Disabled label="Checking your saved payment method…" />;
  }

  if (state.status === "available") {
    const cardLabel = `${state.card.brand} •••• ${state.card.last4}`;
    return (
      <div>
        <button
          type="button"
          onClick={() => void chargeSavedCard(state)}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 text-center font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          Add {productName} · {formatUsd(state.amountCents)} with {cardLabel}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          One click authorizes a one-time charge of {formatUsd(state.amountCents)}
          to {cardLabel}. No subscription.
        </p>
      </div>
    );
  }

  if (state.status === "processing") {
    return (
      <Disabled
        label={`Charging ${state.cardLabel} · ${formatUsd(priceCents)}…`}
      />
    );
  }

  if (state.status === "pending") {
    return (
      <div
        className="rounded-md border border-[color:var(--gold)] bg-secondary/30 p-4 text-sm text-muted-foreground"
        role="status"
      >
        <strong className="text-foreground">Payment confirmation pending.</strong>{" "}
        {state.message}
      </div>
    );
  }

  return (
    <div>
      {state.status === "error" ? (
        <p className="mb-3 text-sm text-muted-foreground" role="alert">
          {state.message}
        </p>
      ) : null}
      {fallbackUrl ? (
        <a
          href={fallbackUrl}
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 text-center font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          Continue to secure checkout · {formatUsd(priceCents)}
        </a>
      ) : (
        <Disabled label={`${productName} checkout is being connected`} />
      )}
    </div>
  );
}

function Disabled({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-muted px-5 py-3.5 text-center font-heading text-base font-semibold text-muted-foreground"
    >
      {label}
    </button>
  );
}
