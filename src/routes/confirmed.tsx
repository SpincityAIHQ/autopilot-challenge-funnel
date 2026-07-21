import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { VideoSlot } from "@/components/VideoSlot";
import { getCommasConfig } from "@/lib/challenge-config";
import { getConfirmationContent } from "@/lib/funnel-content";
import { isTierId, type TierId } from "@/lib/tiers";

const searchSchema = z.object({
  tier: z.enum(["ga", "vip", "bundle", "founder"]).optional(),
});

export const Route = createFileRoute("/confirmed")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Order received — The AUTOPILOT Challenge" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Thanks. Check your email for your receipt and official Challenge access details.",
      },
      { property: "og:url", content: "/confirmed" },
    ],
    links: [{ rel: "canonical", href: "/confirmed" }],
  }),
  component: Confirmed,
});

function Confirmed() {
  const search = Route.useSearch();
  const tier: TierId | null = isTierId(search.tier) ? search.tier : null;
  const content = getConfirmationContent(tier);
  const cfg = getCommasConfig();
  const v = cfg.sectionVideos;
  const videoUrl = tier
    ? (v?.confirmedVideos?.[tier] ?? v?.confirmed ?? null)
    : (v?.confirmed ?? null);
  const includesVipHours =
    tier === "vip" || tier === "bundle" || tier === "founder";
  const day1Calendar = includesVipHours
    ? "/calendar/day1-vip.ics"
    : "/calendar/day1.ics";
  const day2Calendar = includesVipHours
    ? "/calendar/day2-vip.ics"
    : "/calendar/day2.ics";
  const shareText = encodeURIComponent(
    "The AUTOPILOT Challenge — build a monetizable site, marketing assets, and an AI sales system in 8 live hours. Aug 1–2, 2026.",
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Order received</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {content
          ? `Thanks. We're checking your ${content.shortName} order.`
          : "Thanks. We're checking your order."}
      </h1>
      <p className="mt-4 text-muted-foreground">
        Check your email for your FanBasis receipt. We will send your official
        access email after payment is verified. This page alone does not unlock
        the event.
      </p>
      {content ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Your receipt and access email are the final record of what you bought.
          If the ticket shown here does not match your receipt, follow the
          receipt and contact the SpinCity Team.
        </p>
      ) : null}

      <VideoSlot
        url={videoUrl}
        label={content?.videoLabel ?? "Watch: what happens before Day 1"}
        className="mt-8"
      />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          {content?.title ?? "Do these four things now"}
        </h2>
        {content ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {content.included}
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              {content.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {content.notices.length ? (
              <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
                {content.notices.map((notice) => (
                  <p key={notice} className="mt-2 first:mt-0">
                    {notice}
                  </p>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Add both four-hour live sessions to your calendar.</li>
            <li>Save your FanBasis receipt and official access email.</li>
            <li>Make sure the ticket name and price match what you chose.</li>
            <li>Pick one business or offer to build during Day 1.</li>
          </ol>
        )}
      </section>

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">
          Save your live hours
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The main build runs 12–4 PM Eastern both days. VIP, Bundle, and
          Founder calendars also include the group VIP hour from 4–5 PM.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={day1Calendar}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 1 — Sat Aug 1
          </a>
          <a
            href={day2Calendar}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Download Day 2 — Sun Aug 2
          </a>
        </div>
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">What to bring</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· A laptop and four clear work hours each day.</li>
          <li>· One real business, idea, or offer you are ready to sell.</li>
          <li>
            · Your logo, photos, brand files, and videos if you have them.
          </li>
          <li>· Your account logins and a payment, booking, or lead link.</li>
          <li>
            · Never paste passwords, card details, API keys, or private client
            data into a public chat or shared worksheet.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg text-foreground">
          What happens next
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            · Your official confirmation and access come by email after payment
            is verified.
          </li>
          <li>· Your join link and workbook arrive before Day 1.</li>
          <li>
            · Questions? Reply to your payment receipt or write
            Info@NuAmenti.com.
          </li>
        </ul>
      </section>

      <section className="mt-10 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          Tell a builder friend
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Share the challenge, but never share your private access link.
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
