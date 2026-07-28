import { createFileRoute } from "@tanstack/react-router";
import { AuditCallout } from "@/components/AuditCallout";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { SummitCalendarActions } from "@/components/SummitCalendarActions";

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
            SpincityHQ order confirmation for your records.
          </li>
          <li>
            <span className="font-heading text-foreground">2. Watch your email and phone.</span>{" "}
            Your access link, calendar details, and ticket-specific resources arrive from
            Sebastian@spincityhq.com within 24 hours. Check Spam, Promotions, and Updates if you do
            not see them.
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
          <a className="text-foreground underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>
        </p>
      </section>

      <SummitCalendarActions />

      <FunnelVideoSlot
        url={cfg.sectionVideos.auditIntro}
        label="Why your 3-minute pre-Summit audit matters"
        envKey="VITE_SUMMIT_VIDEO_AUDIT"
        className="mt-7"
        autoplay={false}
      />

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
        body="You have both live Summit days, 30-day recordings, the VIP Build Lab, the MVP App Builder, AI Business GPS, and Internal Agent Builder Skill."
        videoUrl={null}
        videoLabel="VIP welcome"
      />

      <ProductThankYou
        verified={verifiedEmerald}
        eyebrow="Verified · Emerald Key Holder"
        headline="Thank you, family — your Emerald Key Holder access is confirmed."
        body="You have everything in VIP plus the Secret Day 3 Vault Opener Class with Spin, two additional live implementation hours, 30 days of NuAmenti 3 Gold, and the full NuAmenti 3 Day recording. Your private room details arrive by email and text."
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
        Questions? Reply to your receipt or email Sebastian@spincityhq.com.
      </p>
    </main>
  );
}
