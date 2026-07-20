import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "You're in — The AUTOPILOT Challenge" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Post-registration confirmation and calendar downloads." },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Thank you</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        You're in.
      </h1>
      <p className="mt-4 text-muted-foreground">
        If your payment goes through with Commas, your access and inclusions are
        confirmed by the provider — not by this page. Watch your inbox for the
        official confirmation from SpincityHQ / NuAmenti.
      </p>

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save both days to your calendar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Two separate .ics files, one per day. Times are Eastern (America/New_York).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar.day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 1 — Sat Aug 1
          </a>
          <a
            href="/calendar.day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 2 — Sun Aug 2
          </a>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg text-foreground">What happens next</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>· Your official confirmation email will come from us, not this page.</li>
          <li>· Join link and workbook are delivered before Day 1.</li>
          <li>· Questions? Reply to your receipt or write Info@NuAmenti.com.</li>
        </ul>
        <Link
          to="/"
          className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to the Challenge
        </Link>
      </section>
    </main>
  );
}
