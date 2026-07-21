import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — The AUTOPILOT Challenge" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "Privacy policy placeholder. Legal review pending.",
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
      <p className="eyebrow mt-4">Privacy Policy</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">
        Privacy Policy
      </h1>

      <div className="mt-4 rounded-md border border-[color:var(--gold-soft)] bg-secondary/40 p-4 text-sm text-foreground">
        <strong className="font-heading">
          Placeholder — pending legal review.
        </strong>{" "}
        This text is not final and has not been reviewed by counsel.
      </div>

      <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed">
        <p>
          SpincityHQ LLC ("we") collects the information FanBasis passes to us
          for verified paid registrations to The AUTOPILOT Challenge. Payment
          card information is collected and processed by FanBasis — never by
          this website.
        </p>
        <p className="mt-4">
          Marketing consent for email and for SMS is collected separately inside
          FanBasis and is optional. Transactional communications about your
          Challenge access are sent regardless.
        </p>
        <p className="mt-4">
          For questions, contact{" "}
          <a className="underline" href="mailto:Info@NuAmenti.com">
            Info@NuAmenti.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
