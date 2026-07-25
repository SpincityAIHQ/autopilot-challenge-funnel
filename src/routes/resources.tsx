import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Summit Resources — verified access required" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Resources,
});

const RESOURCES = [
  { slug: "action-guide", name: "Digital Summit Action Guide", tier: "ga" },
  { slug: "ai-readiness-scorecard", name: "AI Readiness Scorecard", tier: "ga" },
  { slug: "buyer-offer-canvas", name: "Buyer + Offer Canvas", tier: "ga" },
  { slug: "vip-proposal-kit", name: "VIP Proposal + Outreach Kit", tier: "vip" },
  { slug: "vip-vault", name: "VIP Resource Vault", tier: "vip" },
  { slug: "company-brain", name: "Company Brain Starter Kit", tier: "vault" },
  { slug: "prompt-stack", name: "AI Sales + Follow-up Prompt Stack", tier: "vault" },
  { slug: "site-blueprint", name: "Lovable Funnel + Site Blueprint", tier: "vault" },
  { slug: "campaign-calendar", name: "30-Day Campaign Calendar", tier: "vault" },
  { slug: "proposal-builder", name: "Corporate Proposal Builder", tier: "vault" },
  { slug: "autonomy-map", name: "Autonomy Map + SOP Templates", tier: "vault" },
  { slug: "affiliate-directory", name: "Tool Stack + Affiliate Directory", tier: "vault" },
];

function Resources() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Resource hub</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Verified access required
      </h1>
      <p className="mt-3 text-muted-foreground">
        Every resource below unlocks only through a secure link we email you
        after verified payment. URL parameters never unlock anything.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <li key={r.slug} className="surface p-4">
            <p className="label-mono">{r.tier.toUpperCase()}</p>
            <p className="mt-1 font-heading text-foreground">{r.name}</p>
            <Link
              to="/resources/$slug"
              params={{ slug: r.slug }}
              className="mt-2 inline-block text-xs text-muted-foreground underline hover:text-foreground"
            >
              Preview
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        Missing your access email? Check Promotions and Spam, then write
        Info@NuAmenti.com.
      </p>
    </main>
  );
}
