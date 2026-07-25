import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Countdown } from "@/components/Countdown";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { BrandSignature } from "@/components/BrandFrame";
import { TestimonialSection } from "@/components/TestimonialSection";
import { getCommasConfig } from "@/lib/challenge-config";
import { captureAttribution } from "@/lib/attribution";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NuAmenti × Perfect AIM — AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "Two days, live online, with NuAmenti × Perfect AIM. Map your AI-powered revenue and operating system, then build the first working piece together.",
      },
      {
        property: "og:title",
        content: "NuAmenti × Perfect AIM — AI AutoPilot Summit",
      },
      {
        property: "og:description",
        content:
          "Map It. Build It. Put AI to work with human authority and perfect aim. Live online Aug 24–25, 2026.",
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
      <Hero heroVideoUrl={cfg.sectionVideos.hero ?? null} />
      <Promise />
      <Agenda />
      <MapItBuildIt />
      <WhyDifferent />
      <FitCheck />
      <TestimonialSection page="landing" />
      <Faq />
      <Timeline />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero({ heroVideoUrl }: { heroVideoUrl: string | null }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pb-24 sm:pt-16">
      <BrandSignature />

      <div className="mt-10 max-w-4xl">
        <p className="eyebrow">Live online · Aug 24–25, 2026</p>
        <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
          MAP IT.
          <span className="block text-[color:var(--emerald-signal)]">BUILD IT.</span>
          <span className="block text-[color:var(--gold)]">AIM IT AT REVENUE.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-heading text-lg text-muted-foreground sm:text-xl">
          Two live days with the NuAmenti × Perfect AIM family. Map the
          AI-powered revenue and operating system for your business, then build
          the first working piece together.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Human authority. Governed automation. Clear commercial aim.
        </p>
      </div>

      <FunnelVideoSlot
        url={heroVideoUrl}
        label="Watch the official Summit invitation"
        envKey="VITE_SUMMIT_VIDEO_HERO"
        className="mt-10 max-w-4xl"
      />

      <div className="mt-8 max-w-md">
        <p className="label-mono mb-3">Summit week begins in</p>
        <Countdown />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/checkout"
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-heading text-base font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:opacity-90"
        >
          Reserve Your Seat
        </Link>
      </div>
      <div className="mt-6 gold-rule max-w-md" />
    </section>
  );
}

function Promise() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16" aria-labelledby="promise-h">
      <p className="eyebrow">The promise</p>
      <h2 id="promise-h" className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Two days to leave with a starter AI Autonomy Map and a first
        AI-assisted workflow prototype you can keep building.
      </h2>
      <p className="mt-4 text-muted-foreground">
        You bring a real business, offer, or idea. Together we identify three
        workflow candidates for AI assist this month, set the rules, and start
        building one of them live.
      </p>

      <p className="mt-4 font-heading text-lg text-[color:var(--emerald-signal)]">
        Automated where it should be. Human where it matters. Aimed at a real
        business outcome.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        No income promises. No guaranteed business outcomes. What you build
        depends on the work you bring and continue after the Summit.
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
            <li>· Complete your starter Research / Create / Distribute Autonomy Map.</li>
            <li>· Choose three workflow candidates for AI assist this month.</li>
            <li>· Finish the map together, live.</li>
          </ul>
        </article>
        <article className="surface-raised border-[color:var(--emerald-signal)]/30 p-6">
          <p className="label-mono">Day 2 · Tue Aug 25</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--emerald-signal)]">BUILD IT</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Set the fence — rules for what AI does and doesn't touch.</li>
            <li>· Start building one real AI-assisted workflow, live with the family.</li>
            <li>· Talk through reliability — how the workflow holds up outside the room.</li>
            <li>· Leave with a first AI-assisted workflow prototype to keep refining.</li>
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
    <section id="experience" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">The NuAmenti operating map</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Research · Create · Distribute
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Research", d: "AI learns your customer, market, offer, and the facts your business needs." },
          { t: "Create", d: "AI helps make the content, copy, designs, videos, and campaign assets." },
          { t: "Distribute", d: "AI helps publish, follow up, and move people back to your offer." },
        ].map((x, index) => (
          <div key={x.t} className="surface-raised p-6">
            <div
              className="mb-3 h-10 w-10 rounded-full"
              style={{
                background:
                  index === 1
                    ? "radial-gradient(circle at 30% 30%, var(--emerald-signal), color-mix(in oklab, var(--emerald-signal) 55%, transparent) 60%, transparent 70%)"
                    : "radial-gradient(circle at 30% 30%, var(--gold), var(--gold-soft) 60%, transparent 70%)",
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

function WhyDifferent() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Why this Summit</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Implementation, not information.
      </h2>
      <p className="mt-4 text-muted-foreground">
        You leave with a completed starter Autonomy Map and a first
        AI-assisted workflow prototype for the business you brought. Not a
        course library. Not a hype tape. Real work, built with the family, on
        the actual business in front of you — and yours to keep refining after
        the Summit.
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
      q: "How do I register?",
      a: "Reserve your seat above. General Admission opens the door to both live days. Deeper implementation options are offered to registrants after your seat is confirmed.",
    },
    {
      q: "What happens after I pay?",
      a: "You get a FanBasis receipt and a NuAmenti welcome email. Your seat is confirmed only after payment is verified — a URL alone never proves purchase or unlocks resources.",
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
    <section id="registration" className="mx-auto max-w-4xl px-5 py-16 text-center">
      <p className="eyebrow">NuAmenti × Perfect AIM</p>
      <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Map it. Build it. Aim it.
      </h2>
      <p className="mt-3 text-muted-foreground">
        Reserve your seat and bring the business you are ready to move.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/checkout"
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-heading text-base font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Join the Summit
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
        <p>NuAmenti × Perfect AIM · SpincityHQ LLC · Atlanta, GA · Info@NuAmenti.com</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/refund-policy" className="hover:text-foreground">Refund policy</Link>
        </div>
      </div>
    </footer>
  );
}
