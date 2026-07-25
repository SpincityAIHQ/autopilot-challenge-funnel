import { createFileRoute, Link } from "@tanstack/react-router";
import { getCommasConfig } from "@/lib/challenge-config";
import { ProductThankYou } from "@/components/ProductThankYou";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";

export const Route = createFileRoute("/next-steps")({
  head: () => ({
    meta: [
      { title: "Your next steps — AI AutoPilot Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Final calendars, inbox/text expectations, resource access instructions, and what to bring to the Summit.",
      },
      { property: "og:title", content: "Your next steps — AI AutoPilot Summit" },
      {
        property: "og:description",
        content: "Everything you need to prepare for Aug 24–25.",
      },
    ],
    links: [{ rel: "canonical", href: "/next-steps" }],
  }),
  component: NextSteps,
});

function NextSteps() {
  const cfg = getCommasConfig();
  const summary = useEntitlementSummary();
  const access =
    summary.status === "ok" ? derivedAccess(summary.scopes) : null;
  const verifiedIntensive = Boolean(access && access.hasIntensive);

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">You're set</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your next steps
      </h1>
      <p className="mt-3 text-muted-foreground">
        Save the dates, watch for our emails and texts, and gather what you'll
        bring to Day 1.
      </p>

      <FunnelVideoSlot
        url={cfg.sectionVideos.thankYouIntensive}
        label="A note from the family — Intensive welcome"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU_INTENSIVE"
        className="mt-8"
      />

      <ProductThankYou
        verified={verifiedIntensive}
        eyebrow="Verified · Strategy & Build Intensive"
        headline="Thank you, family — you purchased the Strategy & Build Intensive."
        body="Your private 1-on-1 is confirmed. Our team will reach out from Info@NuAmenti.com with a scheduling link so you can pick a time that works. If you don't see it within one business day, reply to your receipt from the same email."
        videoUrl={null}
        videoLabel="A note from the family — Intensive welcome"
      />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These calendar files are intentionally all-day placeholders until
          exact session times are locked. Exact start times are sent to
          registrants closer to the event via your access email.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 1 — Mon Aug 24, 2026
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 2 — Tue Aug 25, 2026
          </a>
        </div>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          Inbox + text expectations
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            · Look for the FanBasis receipt and the NuAmenti welcome email
            first.
          </li>
          <li>
            · Whitelist <span className="text-foreground">Info@NuAmenti.com</span>.
            Check Promotions and Spam.
          </li>
          <li>
            · SMS (if you opted in): reply <span className="text-foreground">HELP</span> for
            help or <span className="text-foreground">STOP</span> to opt out at any time.
          </li>
          <li>
            · Email: use the unsubscribe link in the footer to opt out of
            marketing emails. Transactional Summit access emails are separate.
          </li>
        </ul>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          Resource access
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Every resource lives behind a secure single-use link. Once our
          transactional email provider is configured, the link is delivered
          automatically after verified payment; until then, an operator
          issues the link directly. Opening it drops a private, HttpOnly
          session cookie for a few hours — during which you can browse the
          resources you actually own. Sharing or re-opening the link never
          works twice, and refunds revoke access immediately.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Missing your link? Write{" "}
          <span className="text-foreground">Info@NuAmenti.com</span> from
          the address you used at registration and we'll re-issue.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You can adjust email / SMS / AI-call marketing consent any time
          on your{" "}
          <Link to="/communication-preferences" className="underline">
            communication preferences
          </Link>
          . Transactional access messages remain separate.
        </p>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">What to bring</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, offer, or idea you're ready to map.</li>
          <li>· A laptop and focused hours across both days.</li>
          <li>
            · Your logo, photos, brand files, and short videos if you have them.
          </li>
          <li>
            · Never paste passwords or private client data into shared chats.
          </li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/resources"
          className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
        >
          Browse resource hub
        </Link>
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
        >
          ← Back to the Summit
        </Link>
      </div>
    </main>
  );
}
