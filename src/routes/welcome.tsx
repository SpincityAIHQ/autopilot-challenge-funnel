import { createFileRoute } from "@tanstack/react-router";
import { AuditCallout } from "@/components/AuditCallout";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Everything confirmed. Your Summit details and next steps.",
      },
    ],
    links: [{ rel: "canonical", href: "/welcome" }],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Thank you, family</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Everything is confirmed.
      </h1>
      <p className="mt-3 text-muted-foreground">
        You have everything you need. Save the dates and watch your inbox for access details.
      </p>

      <section className="mt-8 rounded-md border border-[color:var(--emerald-signal)]/40 bg-[color:var(--surface)] p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">AI AutoPilot 2-Day Summit</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          August 29–30, 1:00–4:00 PM ET both days. Room opens at 12:45.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your access link and calendar invite arrive within 24 hours.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Add Day 1 to calendar
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Add Day 2 to calendar
          </a>
        </div>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          Your Private Strategy &amp; Build Intensive
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Scheduling instructions and your prep brief arrive within 24 hours at the email on your
          receipt.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Come with one bottleneck in mind. We spend two hours building one real, working asset
          around it.
        </p>
        <p className="mt-3 text-sm text-foreground">
          Your $1,000 credits toward the AI AutoPilot Accelerator.
        </p>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Need us?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Email{" "}
          <a className="text-foreground underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>{" "}
          any time.
        </p>
      </section>

      <AuditCallout />
    </main>
  );
}
