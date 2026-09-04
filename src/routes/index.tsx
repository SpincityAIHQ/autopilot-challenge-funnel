import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { RevealOnView } from "@/components/reserve/RevealOnView";
import { WingedPlaneMark } from "@/components/reserve/WingedPlaneMark";
import { captureAttribution } from "@/lib/attribution";
import { getCommasConfig } from "@/lib/challenge-config";
import { resolveReserveCheckoutUrl } from "@/lib/reserve-checkout";
import {
  CANONICAL_HOME_URL,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_URL,
  SUMMIT_DESCRIPTION,
  SUMMIT_TITLE,
} from "@/lib/site-meta";

/**
 * On-demand Summit: Course/Product schema. The live Event schema was removed
 * when the event finished (recorded Aug 29–31, 2026).
 */
const JSON_LD_COURSE = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "The AI AutoPilot Summit — On Demand",
  description: SUMMIT_DESCRIPTION,
  image: [SOCIAL_IMAGE_URL],
  url: CANONICAL_HOME_URL,
  provider: {
    "@type": "Organization",
    name: "SpinCityHQ x NuAmenti",
    url: CANONICAL_HOME_URL,
    logo: SOCIAL_IMAGE_URL,
    email: "Info@NuAmenti.com",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT20H",
  },
  offers: [
    { "@type": "Offer", name: "General Admission", price: "22", priceCurrency: "USD" },
    { "@type": "Offer", name: "Summit + VIP", price: "99", priceCurrency: "USD" },
    {
      "@type": "Offer",
      name: "Summit + VIP + Emerald Vault Key",
      price: "298",
      priceCurrency: "USD",
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SUMMIT_TITLE },
      { name: "description", content: SUMMIT_DESCRIPTION },
      {
        name: "robots",
        content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      },
      { property: "og:title", content: SUMMIT_TITLE },
      { property: "og:description", content: SUMMIT_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SpinCityHQ x NuAmenti" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: CANONICAL_HOME_URL },
      { property: "og:image", content: SOCIAL_IMAGE_URL },
      { property: "og:image:secure_url", content: SOCIAL_IMAGE_URL },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: SOCIAL_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SUMMIT_TITLE },
      { name: "twitter:description", content: SUMMIT_DESCRIPTION },
      { name: "twitter:image", content: SOCIAL_IMAGE_URL },
      { name: "twitter:image:alt", content: SOCIAL_IMAGE_ALT },
    ],
    links: [{ rel: "canonical", href: CANONICAL_HOME_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(JSON_LD_COURSE) }],
  }),
  component: Landing,
});

type Tier = {
  id: string;
  name: string;
  price: string;
  summary: string;
  bullets: readonly string[];
  cta: string;
  href: string | null;
  note: string;
  featured?: boolean;
  vault?: boolean;
};

function Landing() {
  const cfg = getCommasConfig();
  useEffect(() => captureAttribution(), []);

  const tiers: readonly Tier[] = [
    {
      id: "ga",
      name: "General Admission",
      price: "$22",
      summary: "The main stage, both days. The foundation.",
      bullets: [
        "Day 1 Main — Build the business before you automate it (5 hrs)",
        "Day 2 Main — Hire the AI team (5 hrs)",
        "Two activity books + the main-stage prompt library",
        "Community seat + Thursday Open Class, live, every week",
      ],
      cta: "Get General Admission",
      href: resolveReserveCheckoutUrl("ga"),
      note: "Shopify checkout · timestamped access",
    },
    {
      id: "vip",
      name: "Summit + VIP",
      price: "$99",
      summary: "Both after-hours rooms and the builders we use ourselves.",
      bullets: [
        "Everything in General Admission",
        "Day 1 VIP After Hours — Four businesses, one model",
        "Day 2 VIP After Hours — The money and the structure",
        "MVP App Builder · AI Business GPS · Internal Agent Builder Skill",
        "AI Agent Hiring + Workflow Kit · VIP implementation resources",
        "Priority questions on Thursdays",
      ],
      cta: "Get Summit + VIP",
      href: resolveReserveCheckoutUrl("ga_vip"),
      note: "Shopify checkout · unlocks both VIP rooms",
      featured: true,
    },
    {
      id: "vault",
      name: "Summit + VIP + Emerald Vault Key",
      price: "$298",
      summary: "The Monday intensive: structure, funding, apps, credit, syndication.",
      bullets: [
        "Everything in Summit + VIP",
        "The Emerald Vault Intensive (Aug 31) — separate the tools, fund the build, launch the app",
        "Guest sessions: corporate structure, venture funding, business credit, app launch, content syndication",
        "30 days of NuAmenti 3 Gold + the full NuAmenti 3 Day recording",
        "Vault activity book",
      ],
      cta: "Get the Vault Key",
      href: resolveReserveCheckoutUrl("ga_vip_vault"),
      note: "Shopify checkout · unlocks all three courses",
      vault: true,
    },
  ];

  const sessions = [
    {
      label: "Day 1 Main",
      badge: "GA",
      title: "Build the business before you automate it.",
      body: "Custom instructions that tell your AI the truth. One business, one brain. The 11 plugins. The Autopilot Trap and the Viable Systems Model. Meta ads on autopilot with real cost-per-lead targets.",
    },
    {
      label: "Day 1 VIP After Hours",
      badge: "VIP",
      title: "Four businesses, one model.",
      body: "Unifying several arms under one system. Government contracting and compliance agents. Local ads in a 10-mile radius. Turning what people search for into blogs, lead magnets, and faceless channels.",
    },
    {
      label: "Day 2 Main",
      badge: "GA",
      title: "Hire the AI team.",
      body: "Hooks that stop the scroll. One landing page per stage. AI citability. NotebookLM to HeyGen content. The Fractional CTO offer with a monthly retainer. MCP servers. The AID framework with an approval center.",
    },
    {
      label: "Day 2 VIP After Hours",
      badge: "VIP",
      title: "The money and the structure.",
      body: "Lead lists that enrich themselves. White-labeling systems for local businesses. Time-for-time pricing. Holding companies, resident agents, and nonprofits — with counsel in the room.",
    },
  ] as const;

  const access = [
    ["1", "Buy on Shopify", "Secure checkout. Use an email you check."],
    [
      "2",
      "Invite + unlock in 15 minutes",
      "Your community invite and your courses arrive by email and text.",
    ],
    [
      "3",
      "Watch, do the sheet, post it",
      "Timestamped sessions. One activity book per session. Post your result.",
    ],
    ["4", "Thursday, 4 PM Eastern", "Open Class, live, every week. Bring your questions."],
  ] as const;

  return (
    <ReserveFrame showHomeLink={false}>
      <style>{`
        .home-tiers { display: grid; gap: 20px; }
        .home-sessions { display: grid; gap: 20px; }
        .home-access { display: grid; gap: 16px; }
        .home-h1 { font-size: 27px; line-height: 1.15; }
        @media (min-width: 640px) { .home-access { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width: 900px) {
          .home-tiers { grid-template-columns: repeat(3, minmax(0,1fr)); align-items: start; }
          .home-sessions { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .home-access { grid-template-columns: repeat(4, minmax(0,1fr)); }
          .home-h1 { font-size: 46px; }
          .home-hero { grid-template-columns: 1.05fr 0.95fr; align-items: center; }
        }
        .home-span-2 { grid-column: 1 / -1; }
        .home-badge {
          font-family: "Space Mono", ui-monospace, monospace;
          font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
          border: 1px solid rgba(240,223,160,0.35); border-radius: 999px;
          padding: 3px 10px; color: #F0DFA0;
        }
        .home-badge--vip { border-color: rgba(15,191,127,0.55); color: #0FBF7F; }
        .home-ghost-btn {
          font-family: "Space Mono", ui-monospace, monospace;
          font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;
          color: #F0DFA0; border: 1px solid rgba(240,223,160,0.38);
          background: rgba(20,22,25,0.82); border-radius: 10px;
        }
        .home-ghost-btn:hover { border-color: rgba(240,223,160,0.72); }
        .home-ghost-btn:focus-visible { outline: 2px solid #F0DFA0; outline-offset: 3px; }
      `}</style>

      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 pt-6">
        <div className="flex items-center gap-3">
          <WingedPlaneMark className="h-10 w-auto" />
          <div>
            <p className="reserve-label" style={{ paddingTop: 0 }}>
              SpinCityHQ &amp; NuAmenti
            </p>
            <p className="reserve-note-15" style={{ opacity: 0.8 }}>
              Present · The AI AutoPilot Summit · on demand
            </p>
          </div>
        </div>
        <a href="#tiers" className="home-ghost-btn inline-flex min-h-11 items-center px-4 py-2">
          Three ways in
        </a>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20">
        {/* Hero */}
        <RevealOnView delayMs={0}>
          <section className="home-hero mt-12 grid gap-10">
            <div>
              <p className="reserve-eyebrow reserve-gold-text">
                Recorded live · Aug 29–31, 2026 · 20+ hours · inside The Ai.scended Masters
              </p>
              <h1 className="home-h1 reserve-display mt-5">
                Three days we already recorded.{" "}
                <span className="reserve-gold-text">Three ways in.</span>
              </h1>
              <p className="reserve-body-lg mt-5" style={{ opacity: 0.88 }}>
                Day 1: build the business. Day 2: hire the AI team. Two VIP after-hours rooms. The
                Emerald Vault Intensive on structure, funding, and apps. Every session timestamped,
                with an activity book, inside the community — where Thursday&apos;s Open Class is
                live every week.
              </p>
              <a
                href="#tiers"
                className="reserve-cta-primary mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-6 py-4 text-center reserve-body-lg sm:w-auto"
              >
                Pick your way in
              </a>
              <p className="reserve-note-15 mt-3" style={{ opacity: 0.7 }}>
                From $22 · unlocks in 15 minutes
              </p>
            </div>
            <div>
              <FunnelVideoSlot
                url={cfg.sectionVideos.hero ?? null}
                label="The AI AutoPilot Summit on demand"
                envKey="VITE_SUMMIT_VIDEO_HERO"
              />
            </div>
          </section>
        </RevealOnView>

        {/* Tiers */}
        <section id="tiers" className="mt-20 scroll-mt-8">
          <RevealOnView delayMs={0}>
            <p className="reserve-eyebrow reserve-gold-text">
              Three ways in · same room, more of it
            </p>
          </RevealOnView>
          <div className="home-tiers mt-8">
            {tiers.map((tier, i) => (
              <RevealOnView key={tier.id} delayMs={i * 80}>
                <article
                  className={`h-full p-6 ${
                    tier.vault
                      ? "reserve-card--vault"
                      : `reserve-card ${tier.featured ? "reserve-card--emerald" : ""}`
                  }`}
                >
                  {tier.featured ? (
                    <span className="home-badge home-badge--vip">Most chosen</span>
                  ) : null}
                  <h2 className="reserve-display mt-4 text-lg">{tier.name}</h2>
                  <p className={`reserve-mono-price mt-3 text-[40px] ${tier.vault ? "reserve-jewel" : ""}`}>
                    {tier.price}
                  </p>
                  <p className="reserve-body mt-2" style={{ opacity: 0.82 }}>
                    {tier.summary}
                  </p>
                  <ul className="reserve-body mt-5 space-y-2">
                    {tier.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                  {tier.href ? (
                    <a
                      href={tier.href}
                      target="_top"
                      className={`mt-6 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-4 text-center reserve-body-lg ${
                        tier.featured ? "reserve-cta-primary" : "reserve-gold-btn"
                      }`}
                    >
                      {tier.cta}
                    </a>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={`mt-6 flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-4 text-center reserve-body-lg ${
                        tier.featured ? "reserve-cta-primary" : "reserve-gold-btn"
                      }`}
                    >
                      Checkout coming soon
                    </span>
                  )}
                  <p className="reserve-note-15 mt-3 text-center" style={{ opacity: 0.7 }}>
                    {tier.note}
                  </p>
                </article>
              </RevealOnView>
            ))}
          </div>
          <p className="reserve-note-15 mt-8 text-center" style={{ opacity: 0.65 }}>
            Already own a lower tier? Your upgrade link is inside the community — you only pay the
            difference.
          </p>
        </section>

        {/* Sessions */}
        <section className="mt-20">
          <RevealOnView delayMs={0}>
            <p className="reserve-eyebrow reserve-gold-text">
              What&apos;s inside · five sessions, timestamped
            </p>
          </RevealOnView>
          <div className="home-sessions mt-8">
            {sessions.map((s, i) => (
              <RevealOnView key={s.label} delayMs={i * 60}>
                <article className="reserve-card h-full p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="reserve-label" style={{ paddingTop: 0 }}>
                      {s.label}
                    </p>
                    <span
                      className={`home-badge ${s.badge === "VIP" ? "home-badge--vip" : ""}`}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="reserve-body-lg mt-3 font-semibold">{s.title}</h3>
                  <p className="reserve-body mt-2" style={{ opacity: 0.8 }}>
                    {s.body}
                  </p>
                </article>
              </RevealOnView>
            ))}
            <RevealOnView delayMs={240} className="home-span-2">
              <article className="reserve-card--vault h-full p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="reserve-label" style={{ paddingTop: 0 }}>
                    The Emerald Vault Intensive · Monday
                  </p>
                  <span className="home-badge home-badge--vip">Vault Key</span>
                </div>
                <h3 className="reserve-body-lg mt-3 font-semibold">
                  Separate the tools, fund the build, launch the app.
                </h3>
                <p className="reserve-body mt-2" style={{ opacity: 0.82 }}>
                  Internal tools vs. client apps. CEO-pace scheduling with AI. Shopify plus agents.
                  GitHub to stretch your build credits. Guest engineers and counsel on founder
                  launches, venture funding, bank auditing and business credit, and the content
                  syndication stack. Guest segments are guest opinion, clearly labeled.
                </p>
              </article>
            </RevealOnView>
          </div>
        </section>

        {/* How access works */}
        <section className="mt-20">
          <RevealOnView delayMs={0}>
            <p className="reserve-eyebrow reserve-gold-text">How access works</p>
          </RevealOnView>
          <div className="home-access mt-8">
            {access.map(([n, title, body]) => (
              <article key={n} className="reserve-card h-full p-5">
                <p className="reserve-mono-price text-xl">{n}</p>
                <p className="reserve-body mt-2 font-semibold">{title}</p>
                <p className="reserve-note-15 mt-2" style={{ opacity: 0.78 }}>
                  {body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Receipts + Questions */}
        <section className="home-sessions mt-20">
          <article className="reserve-card p-6">
            <p className="reserve-eyebrow reserve-gold-text">Receipts</p>
            <p className="reserve-body mt-4" style={{ opacity: 0.8 }}>
              Receipts are being documented.
            </p>
          </article>
          <article className="reserve-card p-6">
            <p className="reserve-eyebrow reserve-gold-text">Questions</p>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="reserve-body font-semibold">Is this live?</dt>
                <dd className="reserve-body" style={{ opacity: 0.8 }}>
                  The sessions are recorded. Thursday&apos;s Open Class is live every week for
                  everyone in the community.
                </dd>
              </div>
              <div>
                <dt className="reserve-body font-semibold">Do I need to be technical?</dt>
                <dd className="reserve-body" style={{ opacity: 0.8 }}>
                  No. You need one real business, skill, offer, or idea.
                </dd>
              </div>
              <div>
                <dt className="reserve-body font-semibold">How long do I have access?</dt>
                <dd className="reserve-body" style={{ opacity: 0.8 }}>
                  [Access term — coming soon]
                </dd>
              </div>
              <div>
                <dt className="reserve-body font-semibold">Refunds?</dt>
                <dd className="reserve-body" style={{ opacity: 0.8 }}>
                  See the{" "}
                  <Link to="/refund-policy" className="underline">
                    refund policy
                  </Link>
                  .
                </dd>
              </div>
            </dl>
          </article>
        </section>

        {/* Accelerator band */}
        <section className="reserve-card--vault mt-20 p-6 sm:p-10">
          <p className="reserve-eyebrow reserve-gold-text">The next door</p>
          <h2 className="reserve-display mt-4 text-xl sm:text-2xl">
            The Q4 AI AutoPilot Accelerator
          </h2>
          <p className="reserve-body-lg mt-4" style={{ opacity: 0.85 }}>
            One play a day for 120 days, a Monday group call, CTO-level guidance. 20 seats. For
            owners who finished the Summit and want the daily rhythm.
          </p>
          <Link
            to="/accelerator"
            className="home-ghost-btn mt-6 inline-flex min-h-11 items-center px-5 py-3"
          >
            See the Accelerator
          </Link>
        </section>

        <footer className="mt-20 border-t border-[rgba(240,223,160,0.2)] pt-6">
          <p className="reserve-note-15" style={{ opacity: 0.75 }}>
            SpincityHQ LLC · Info@NuAmenti.com · Atlanta, GA
          </p>
          <nav className="mt-3 flex flex-wrap gap-5" aria-label="Legal">
            <Link to="/privacy" className="reserve-note-15 underline">
              Privacy
            </Link>
            <Link to="/terms" className="reserve-note-15 underline">
              Terms
            </Link>
            <Link to="/refund-policy" className="reserve-note-15 underline">
              Refund policy
            </Link>
          </nav>
        </footer>
      </main>
    </ReserveFrame>
  );
}
