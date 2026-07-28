import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — AI AutoPilot Summit (Pre-Launch Draft)" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Pre-launch draft privacy notice for the AI AutoPilot Summit. Describes current app behavior only. Pending counsel review.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">
      <Link to="/" className="text-xs hover:text-foreground">
        ← Home
      </Link>
      <p className="eyebrow mt-4">Pre-Launch Draft · Privacy</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Privacy Notice</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: 2026-07-25
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          This notice describes how SpincityHQ LLC dba NuAmenti ("we") handles information collected
          through the AI AutoPilot Summit funnel today. Public checkout remains disabled until
          operator-approved final policy language is posted and accepted at checkout.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Who processes what</h2>
        <p>
          Payment card details and order data are collected and processed by Shopify on the
          SpincityHQ checkout — never by this website. On verified payment, Shopify provides the
          order fields we need to create your Summit registration (name, email, optional phone,
          product, amount, currency, and order ID).
        </p>
        <p>
          Optional communication consent (email, SMS, AI-assisted or prerecorded calls) is captured
          separately by NuAmenti on the
          <Link to="/communication-preferences" className="ml-1 underline hover:text-foreground">
            communication preferences page
          </Link>
          , not inside Shopify. Marketing consent is never a condition of purchase. Transactional
          access messages about your Summit ticket are separate from marketing consent and continue
          as long as your ticket is active.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Access to Summit resources</h2>
        <p>
          Summit resources are locked behind a single-use magic link sent to your registered email.
          Opening the link exchanges it for a short- lived, HttpOnly session cookie scoped to your
          active entitlements. Refunds and revocations immediately remove access.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">Your choices</h2>
        <p>
          You can revoke any communication channel at any time by resubmitting the preferences form
          unchecked, replying STOP to a text, or writing Sebastian@spincityhq.com. Deletion requests
          for personal data are handled by the same email.
        </p>

        <p className="mt-8 text-xs">
          SpincityHQ LLC · Atlanta, GA ·{" "}
          <a className="underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>
          . No income, sales, or business-outcome guarantees are made. This notice is a pre-launch
          draft pending counsel review and will be replaced with the final version before public
          checkout opens.
        </p>
      </div>
    </main>
  );
}
