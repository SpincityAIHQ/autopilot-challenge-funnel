import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — AI AutoPilot Summit (Pre-Launch Draft)" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Pre-launch draft refund policy for the AI AutoPilot Summit. Final refund terms pending counsel review; checkout is disabled until posted.",
      },
      { property: "og:url", content: "/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">
      <Link to="/" className="text-xs hover:text-foreground">
        ← Home
      </Link>
      <p className="eyebrow mt-4">Pre-Launch Draft · Refund Policy</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Refund Policy</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: 2026-07-25
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          The AI AutoPilot Summit is a two-day live online event on August 24–25, 2026. This is a
          pre-launch draft. Public checkout remains disabled until the operator-approved final
          refund window and terms for each product are posted here and accepted at checkout.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Products in scope</h2>
        <p>
          This policy applies to every product offered by the AI AutoPilot Summit funnel. The exact
          price of any given purchase — including any add-on, upgrade, or private engagement — is
          the amount shown and accepted on the SpincityHQ checkout page you completed for that
          purchase, and appears on your receipt. Nothing on this page sets or overrides that price.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Current behavior</h2>
        <p>
          Fulfillment matches verified payments to your registration and entitlements. If a payment
          is later reversed by the payment provider or our operations team using our internal
          reversal path, the matching entitlement is revoked and (for the Intensive) the slot is
          released back to the pool. Independent purchases are not affected by the reversal of a
          separate purchase.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">How to request a refund</h2>
        <p>
          Refund questions and requests: write{" "}
          <a className="underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>{" "}
          with your order details. The final refund window per product will be posted here before
          public checkout opens.
        </p>

        <p className="mt-8 text-xs">
          SpincityHQ LLC · Atlanta, GA ·{" "}
          <a className="underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>
          . No income, sales, or business-outcome guarantees are made. This is a pre-launch draft
          pending counsel review.
        </p>
      </div>
    </main>
  );
}
