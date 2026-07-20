import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — The AUTOPILOT Challenge" },
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
          Because The AUTOPILOT Challenge is a live event with limited capacity
          (and a hard cap of 33 Founder Seats), refund windows and terms will be
          finalized before public checkout opens.
        </p>
        <p>
          Founder Seat inclusions that ship later (signed founding-edition book,
          AI+AI=AI 2 founding-edition pre-order) are covered by separate
          shipping and fulfillment terms.
        </p>
        <p>
          For refund questions, contact <a className="underline" href="mailto:Info@NuAmenti.com">Info@NuAmenti.com</a>.
        </p>
      </div>
    </main>
  );
}
