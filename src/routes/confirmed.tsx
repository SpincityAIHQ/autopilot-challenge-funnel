import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "Payment confirmation pending — The AUTOPILOT Challenge" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Thanks — check your verified receipt from Commas. Your Challenge access is granted only from a verified webhook and email.",
      },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  const cfg = getCommasConfig();
  const shareText = encodeURIComponent(
    "The AUTOPILOT Challenge — 2 days, one working automation. Aug 1–2, 2026.",
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Thanks</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Payment confirmation pending
      </h1>
      <p className="mt-4 text-muted-foreground">
        Thanks — check your verified receipt from Commas. Your Challenge access
        is granted only after our system verifies the payment webhook and the
        official confirmation email is sent from SpincityHQ / NuAmenti. This
        page does not grant access on its own.
      </p>

      <VideoSlot url={cfg.sectionVideos?.confirmed ?? null} label="Watch: what to expect before Day 1" className="mt-8" />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save both days to your calendar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Two separate .ics files, one per day. Times are Eastern (America/New_York).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 1 — Sat Aug 1
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 2 — Sun Aug 2
          </a>
        </div>
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">What to bring</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· A laptop and whatever tools you already use.</li>
          <li>· One specific job in your business you'd like a machine to take.</li>
          <li>· Two hours of focus each day. No side tabs, no side quests.</li>
          <li>· A note-taking surface — paper, doc, or the workbook.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg text-foreground">What happens next</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>· Your official confirmation email will come from us, not this page.</li>
          <li>· Join link and workbook are delivered before Day 1.</li>
          <li>· Questions? Reply to your Commas receipt or write Info@NuAmenti.com.</li>
        </ul>
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Tell a builder friend</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Share the challenge — but never your access link. Access is personal
          and non-transferable.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
          >
            Share on X
          </a>
          <a
            href={`sms:?&body=${shareText}`}
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
          >
            Send by text
          </a>
        </div>
      </section>

      <Link
        to="/"
        className="mt-10 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to the Challenge
      </Link>
    </main>
  );
}
