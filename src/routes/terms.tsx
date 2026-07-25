import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — AI AutoPilot Summit" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "Terms of service placeholder. Legal review pending.",
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
      <p className="eyebrow mt-4">Terms</p>
      <h1 className="mt-3 font-display text-2xl text-foreground">Terms</h1>

      <div className="mt-4 rounded-md border border-[color:var(--gold-soft)] bg-secondary/40 p-4 text-sm text-foreground">
        <strong className="font-heading">
          Placeholder — pending legal review.
        </strong>{" "}
        This text is not final and has not been reviewed by counsel.
      </div>

      <div className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          By registering for the AI AutoPilot Summit you agree to attend the
          live sessions as-scheduled and follow the participation guidelines
          shared before Day 1.
        </p>

        <p>
          No income promises are made. No guarantees of specific business
          outcomes are made.
        </p>
        <p>
          Payments are processed by FanBasis. Their terms and privacy policy
          also apply.
        </p>
      </div>
    </main>
  );
}
