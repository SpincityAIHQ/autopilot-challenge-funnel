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
      { title: "Your Next Steps — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Save the dates, check your NuAmenti email, gather your business information, and prepare for the AI AutoPilot 2-Day Summit.",
      },
      {
        property: "og:title",
        content: "Your next steps — AI AutoPilot 2-Day Summit",
      },
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
        Save the dates, watch for your NuAmenti email, and gather the business
        information you will bring to Day 1.
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
        headline="Thank you, family — your private Strategy & Build Intensive is confirmed."
        body="Our team will email you from Info@NuAmenti.com with the scheduling link. Reply to your receipt if you need help."
        videoUrl={null}
        videoLabel="A note from the family — Intensive welcome"
      />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add both days to your calendar now. Exact start times are sent by
          email before the Summit.
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
          Watch your inbox
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· Keep your FanBasis receipt.</li>
          <li>
            · Look for the NuAmenti welcome email from{" "}
            <span className="text-foreground">Info@NuAmenti.com</span>.
          </li>
          <li>· Check Promotions and Spam if you do not see it.</li>
          <li>
            · If you joined text updates, reply HELP for help or STOP to leave.
          </li>
        </ul>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          Your secure resources
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your NuAmenti email contains a private access link. That link opens
          only the resources tied to your purchase. Do not share it.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Missing your link? Email{" "}
          <span className="text-foreground">Info@NuAmenti.com</span> from the
          same address you used to buy.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Change your email, text, or call choices on the{" "}
          <Link to="/communication-preferences" className="underline">
            communication preferences page
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          Bring this to Day 1
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, skill, offer, or clear idea.</li>
          <li>· A list of the tasks that take too much time.</li>
          <li>· Your current prices, goals, and basic numbers.</li>
          <li>· A laptop and focused time on both days.</li>
          <li>· Your logo and brand files if you have them.</li>
          <li>· Never share passwords or private client data in group chats.</li>
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
