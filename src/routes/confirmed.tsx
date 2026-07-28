import { createFileRoute } from "@tanstack/react-router";
import { AuditCallout } from "@/components/AuditCallout";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";

import { ProductThankYou } from "@/components/ProductThankYou";
import { TestimonialSection } from "@/components/TestimonialSection";
import { derivedAccess, useEntitlementSummary } from "@/hooks/use-entitlement-summary";
import { getCommasConfig } from "@/lib/challenge-config";

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      { title: "Your Next Step — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Your AI AutoPilot Summit purchase confirmation and next optional step.",
      },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  const cfg = getCommasConfig();
  const summary = useEntitlementSummary();
  const access = summary.status === "ok" ? derivedAccess(summary.scopes) : null;

  const verifiedGaOnly = Boolean(access && access.hasGa && !access.hasVip);
  const verifiedVipNoVault = Boolean(access && access.hasVip && !access.hasVault);
  const verifiedEmerald = Boolean(access && access.hasGa && access.hasVip && access.hasVault);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Thank you, family</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your purchase is confirmed.
      </h1>

      <FunnelVideoSlot
        url={cfg.sectionVideos.confirmedThankYou}
        label="Your Summit confirmation and next steps"
        envKey="VITE_SUMMIT_VIDEO_THANK_YOU"
        className="mt-7"
      />

      <section className="mt-6 rounded-md border border-[color:var(--emerald-signal)]/40 bg-[color:var(--surface)] p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">What happens next</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You're in. AI AutoPilot 2-Day Summit, August 29–30, 1:00–4:00 PM ET both days. Room opens
          at 12:45.
        </p>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-heading text-foreground">1. Check your receipt.</span> Keep the
            Commas payment receipt for your records.
          </li>
          <li>
            <span className="font-heading text-foreground">2. Watch your email and phone.</span>{" "}
            Your access link, calendar details, and ticket-specific resources arrive within 24
            hours. Check Spam, Promotions, and Updates if you do not see them.
          </li>
          <li>
            <span className="font-heading text-foreground">3. Save both live dates.</span> Saturday,
            August 29 and Sunday, August 30. Room opens at 12:45 PM Eastern; training begins at 1:00
            PM.
          </li>
          <li>
            <span className="font-heading text-foreground">4. Prepare your build.</span> Bring a
            laptop, one business or offer, the tasks taking too much time, and your basic prices and
            goals.
          </li>
        </ol>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions:{" "}
          <a className="text-foreground underline" href="mailto:Info@NuAmenti.com">
            Info@NuAmenti.com
          </a>
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

      <AuditCallout />

      <ProductThankYou
        verified={verifiedGaOnly}
        eyebrow="Verified · General Admission"
        headline="Thank you, family — your General Admission seat is confirmed."
        body="You are set for both live days: Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern."
        videoUrl={null}
        videoLabel="General Admission welcome"
      />

      <ProductThankYou
        verified={verifiedVipNoVault}
        eyebrow="Verified · VIP Implementation Experience"
        headline="Thank you, family — your VIP access is confirmed."
        body="You have both live Summit days, 30-day recordings, priority questions, and the VIP Build Lab immediately after Day 2 on Sunday from 4:15–5:45 PM Eastern."
        videoUrl={null}
        videoLabel="VIP welcome"
      />

      <ProductThankYou
        verified={verifiedEmerald}
        eyebrow="Verified · Emerald Key Holder"
        headline="Thank you, family — your Emerald Key Holder access is confirmed."
        body="You have General Admission, VIP, the MVP App Builder, the AI Business GPS, 30 days of NuAmenti 3 Gold, and the full NuAmenti 3 Day recording."
        videoUrl={null}
        videoLabel="Emerald Key Holder welcome"
      />

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Bring this to Day 1</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, skill, offer, or clear idea.</li>
          <li>· The tasks that take too much time.</li>
          <li>· Your current prices, goals, and basic business numbers.</li>
          <li>· A laptop and your logo or brand files if you have them.</li>
        </ul>
      </section>

      <TestimonialSection
        page="confirmed"
        eyebrow="From the family"
        heading="What people say after they register"
      />

      <p className="mt-8 text-sm text-muted-foreground">
        Questions? Reply to your receipt or email Info@NuAmenti.com.
      </p>
    </main>
  );
}
