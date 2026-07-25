import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Countdown } from "@/components/Countdown";
import { VideoSlot } from "@/components/VideoSlot";
import {
  TIERS,
  UPSELLS,
  formatUsd,
  type AdmissionTierId,
} from "@/lib/tiers";
import { getCommasConfig } from "@/lib/challenge-config";
import { captureAttribution } from "@/lib/attribution";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot Summit — Aug 24–25, 2026 · Live Online" },
      {
        name: "description",
        content:
          "Two days, live online. Map and build your AI-powered revenue and operating system with the NuAmenti family. GA $22 · VIP $77.",
      },
      { property: "og:title", content: "AI AutoPilot Summit — Aug 24–25, 2026" },
      {
        property: "og:description",
        content:
          "Map It · Build It. Live online with the NuAmenti family — Aug 24–25, 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  const cfg = getCommasConfig();
  useEffect(() => captureAttribution(), []);

  return (
    <main className="min-h-screen">
      <TopBar />
      <Hero heroVideoUrl={cfg.sectionVideos.hero ?? null} />
      <Promise />
      <Agenda />
      <MapItBuildIt />
      <TierComparison />
      <VaultTeaser />
      <IntensiveTeaser />
      <WhyDifferent />
      <FitCheck />
      <Faq />
      <Timeline />
      <FinalCta />
      <Footer />
    </main>
  );
}

function TopBar() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-5">
      <div className="font-display text-sm tracking-[0.28em] text-[color:var(--gold)]">
        AI AUTOPILOT SUMMIT
      </div>
      <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
        <a href="#agenda" className="hover:text-foreground">Agenda</a>
        <a href="#tiers" className="hover:text-foreground">Tickets</a>
        <a href="#faq" className="hover:text-foreground">FAQ</a>
      </nav>
    </header>
  );
}

function Hero({ heroVideoUrl }: { heroVideoUrl: string | null }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
      <p className="eyebrow">Live online · Aug 24–25, 2026</p>
      <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
        MAP IT.
        <span className="block text-[color:var(--gold)]">BUILD IT.</span>
        <span className="block">TOGETHER, WITH THE FAMILY.</span>
      </h1>
      <p className="mt-6 max-w-2xl font-heading text-lg text-muted-foreground sm:text-xl">
        Two days with the NuAmenti family. Map the AI-powered revenue and
        operating system for your business, then build the first working
        piece — live.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Live online · session start times sent to registrants by email.
      </p>

      <div className="mt-8 max-w-md">
        <p className="label-mono mb-3">Doors open in</p>
        <Countdown />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/checkout"
          search={{ tier: "ga" }}
          className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:opacity-90"
        >
          Get GA — $22
        </Link>
        <Link
          to="/checkout"
          search={{ tier: "vip" }}
          className="inline-flex items-center rounded-md border border-[color:var(--gold)] bg-transparent px-5 py-3 font-heading text-base text-[color:var(--gold)] transition hover:bg-secondary"
        >
          Go VIP — $77
        </Link>
      </div>
      <div className="mt-6 gold-rule max-w-md" />

      <VideoSlot
        url={heroVideoUrl}
        label="Watch: what we build together"
        className="mt-10 max-w-3xl"
      />
    </section>
  );
}

function Promise() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16" aria-labelledby="promise-h">
      <p className="eyebrow">The promise</p>
      <h2 id="promise-h" className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        By Sunday evening, you'll have a clear AI Autonomy Map and one working
        AI-powered job in your business.
      </h2>
      <p className="mt-4 text-muted-foreground">
        We show up as a family. You bring a real business, offer, or idea.
        Together we identify the three jobs AI can take off your plate this
        month, set the rules, and turn one of them on — live.
      </p>
      <p className="mt-4 font-heading text-lg text-[color:var(--gold)]">
        Automated where it should be. Human where it matters.
      </p>
    </section>
  );
}

function Agenda() {
  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two days · Aug 24 + Aug 25, 2026</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        What we do, day by day
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Mon Aug 24</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">MAP IT</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Identify the wall — where your time and revenue are stuck.</li>
            <li>· Complete your Research / Create / Distribute Autonomy Map.</li>
            <li>· Choose the three jobs AI can take on this month.</li>
            <li>· Finish the map together, live.</li>
          </ul>
        </article>
        <article className="surface-raised p-6">
          <p className="label-mono">Day 2 · Tue Aug 25</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">BUILD IT</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Set the fence — rules for what AI does and doesn't touch.</li>
            <li>· Build one real automation live with the family.</li>
            <li>· Do the reliability math on how the job holds up.</li>
            <li>· Leave with a working first job, running.</li>
          </ul>
        </article>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Session start times sent to registrants closer to the event.
      </p>
    </section>
  );
}

function MapItBuildIt() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">The map</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Research · Create · Distribute
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Research", d: "AI learns your customer, market, offer, and the facts your business needs." },
          { t: "Create", d: "AI helps make the content, copy, designs, videos, and campaign assets." },
          { t: "Distribute", d: "AI helps publish, follow up, and move people back to your offer." },
        ].map((x) => (
          <div key={x.t} className="surface-raised p-6">
            <div
              className="mb-3 h-10 w-10 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, var(--gold), var(--gold-soft) 60%, transparent 70%)",
              }}
              aria-hidden
            />
            <h3 className="font-display text-lg text-foreground">{x.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TierComparison() {
  return (
    <section id="tiers" className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">Pick your seat</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        GA gets you in. VIP goes deeper.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TIERS.map((t) => (
          <article key={t.id} className="surface-raised flex flex-col p-6">
            <p className="label-mono">{t.name}</p>
            <div className="mt-2 font-display text-3xl text-foreground">
              {formatUsd(t.priceCents)}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.headline}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
              {t.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            <Link
              to="/checkout"
              search={{ tier: t.id as AdmissionTierId }}
              className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Continue — {formatUsd(t.priceCents)}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        No income promises. No fake scarcity. Every seat is a real seat.
      </p>
    </section>
  );
}

function VaultTeaser() {
  const v = UPSELLS.vault;
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">After you register</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        {v.name} — {formatUsd(v.priceCents)}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Offered as an optional add-on right after you register. Admission is
        purchased separately.
      </p>
      <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {v.bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>
    </section>
  );
}

function IntensiveTeaser() {
  const i = UPSELLS.intensive;
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">After the Summit</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        {i.name} — {formatUsd(i.priceCents)}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">{i.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/intensive"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          See the Intensive
        </Link>
        <Link
          to="/mentorship"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          8-Week Mentorship (application)
        </Link>
      </div>
    </section>
  );
}

function WhyDifferent() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Why this Summit</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Implementation, not information.
      </h2>
      <p className="mt-4 text-muted-foreground">
        You leave with a completed map and a working AI-powered job in your
        business. Not a course library. Not a hype tape. Real work, built with
        the family, on the actual business you brought.
      </p>
    </section>
  );
}

function FitCheck() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Who this is for</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="surface p-5">
          <h3 className="font-heading text-lg text-foreground">You'll thrive if…</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You have a business, an offer, or a clear idea.</li>
            <li>· You want AI to take real jobs off your plate.</li>
            <li>· You will show up live and do the work.</li>
          </ul>
        </div>
        <div className="surface p-5">
          <h3 className="font-heading text-lg text-foreground">Skip this if…</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You want a passive watch-later course.</li>
            <li>· You expect income promises or done-for-you work.</li>
            <li>· You aren't ready to make decisions about your own business.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const rows = [
    {
      q: "Where is it?",
      a: "100% live online. Details are sent to registrants by email.",
    },
    {
      q: "Are recordings included?",
      a: "GA is live only. VIP includes 30-day recordings. You can also add the Implementation Vault for the full toolkit.",
    },
    {
      q: "What happens after I pay?",
      a: "You get a FanBasis receipt and a NuAmenti welcome email. Your seat is confirmed only after payment is verified.",
    },
    {
      q: "Refund policy?",
      a: "See the /refund-policy page for the current terms.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">FAQ</p>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.q} className="surface p-5">
            <p className="font-heading text-foreground">{r.q}</p>
            <p className="mt-2 text-sm text-muted-foreground">{r.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">The runway</p>
      <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
        <li>· <span className="text-foreground">Aug 7–9, 2026</span> — InvestFest networking (Atlanta).</li>
        <li>· <span className="text-foreground">Aug 10, 2026</span> — NuAmenti 3 Launch.</li>
        <li>· <span className="text-foreground">Aug 24–25, 2026</span> — AI AutoPilot Summit (live online).</li>
      </ul>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 text-center">
      <h2 className="font-display text-3xl text-foreground sm:text-4xl">
        Meet us at the Summit.
      </h2>
      <p className="mt-3 text-muted-foreground">Choose your seat and let's build.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/checkout"
          search={{ tier: "ga" }}
          className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Get GA — $22
        </Link>
        <Link
          to="/checkout"
          search={{ tier: "vip" }}
          className="inline-flex items-center rounded-md border border-[color:var(--gold)] px-5 py-3 font-heading text-base text-[color:var(--gold)] transition hover:bg-secondary"
        >
          Go VIP — $77
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
        <p>SpincityHQ LLC · Atlanta, GA · Info@NuAmenti.com</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/refund-policy" className="hover:text-foreground">Refund policy</Link>
        </div>
      </div>
    </footer>
  );
}
