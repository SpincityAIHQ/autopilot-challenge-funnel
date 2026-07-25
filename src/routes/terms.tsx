import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — AI AutoPilot Summit (Pre-Launch Draft)" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Pre-launch draft terms of service for the AI AutoPilot Summit. Describes current app behavior only. Pending counsel review.",
      },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">
      <Link to="/" className="text-xs hover:text-foreground">
        ← Home
      </Link>
      <p className="eyebrow mt-4">Pre-Launch Draft · Terms</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Terms</h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
        Last updated: 2026-07-25
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          These pre-launch draft terms describe how the AI AutoPilot Summit
          funnel operates today. Public checkout remains disabled until
          operator-approved final terms are posted and accepted at checkout.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">
          What you get
        </h2>
        <p>
          The Summit is a two-day live online event on August 24–25, 2026.
          Exact session start times are announced to registrants closer to the
          event. GA, VIP, Vault, Strategy &amp; Build Intensive, and
          Mentorship are separate products with their own inclusions listed
          on the sales page.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">
          No guarantees
        </h2>
        <p>
          No income, sales, or specific business-outcome guarantees are made.
          What you build during and after the Summit depends on the work you
          bring and the effort you continue after the sessions end.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">
          Payments and provider roles
        </h2>
        <p>
          Payments are processed by FanBasis on their hosted checkout. Their
          terms and privacy policy also apply to the payment step. Our
          fulfillment matches verified payments to your registration, grants
          entitlements, and delivers access through a single-use magic link.
        </p>

        <h2 className="mt-6 font-heading text-base text-foreground">
          Conduct
        </h2>
        <p>
          By registering you agree to attend the live sessions as scheduled
          and follow the participation guidelines shared before Day 1.
        </p>

        <p className="mt-8 text-xs">
          SpincityHQ LLC · Atlanta, GA ·{" "}
          <a className="underline" href="mailto:Info@NuAmenti.com">
            Info@NuAmenti.com
          </a>
          . This is a pre-launch draft pending counsel review and will be
          replaced with the final version before public checkout opens.
        </p>
      </div>
    </main>
  );
}
