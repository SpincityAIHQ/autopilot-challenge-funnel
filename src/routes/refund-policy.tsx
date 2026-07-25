import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — AI AutoPilot Summit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Refund policy placeholder. Legal review pending." },
      { property: "og:url", content: "/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">
      <Link to="/" className="text-xs hover:text-foreground">← Home</Link>
      <p className="eyebrow mt-4">Refund Policy</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Refund Policy</h1>

      <div className="mt-4 rounded-md border border-[color:var(--gold-soft)] bg-secondary/40 p-4 text-sm text-foreground">
        <strong className="font-heading">Placeholder — pending legal review.</strong>{" "}
        This text is not final and has not been reviewed by counsel.
      </div>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          The AI AutoPilot Summit is a live online event on Aug 24–25, 2026.
          Refund windows and terms for each product (GA $22, VIP $77, VIP
          Upgrade $55, Implementation Vault $199, Strategy &amp; Build
          Intensive $1,000, and the application-based Mentorship $8,000) will
          be finalized here before public checkout opens.
        </p>
        <p>
          The Strategy &amp; Build Intensive is capped at 10 total slots with
          atomic inventory; refund of an Intensive releases the slot back to
          the pool.
        </p>
        <p>
          For refund questions, contact <a className="underline" href="mailto:Info@NuAmenti.com">Info@NuAmenti.com</a>.
        </p>
      </div>

    </main>
  );
}
