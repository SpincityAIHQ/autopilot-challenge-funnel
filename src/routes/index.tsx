import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandSignature } from "@/components/BrandFrame";
import { Countdown } from "@/components/Countdown";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { TestimonialSection } from "@/components/TestimonialSection";
import { LandingReservationForm } from "@/components/reserve/LandingReservationForm";
import { captureAttribution } from "@/lib/attribution";
import { getCommasConfig } from "@/lib/challenge-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot 2-Day Summit — SpinCityHQ & NuAmenti" },
      {
        name: "description",
        content:
          "Build a business system powered by AI agents, apps, workflows, and loops. Live online Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern.",
      },
      {
        property: "og:title",
        content: "AI AutoPilot 2-Day Summit — SpinCityHQ & NuAmenti",
      },
      {
        property: "og:description",
        content:
          "Stop just prompting. Build the business, hire the AI team, and put repeat work on autopilot.",
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
  const [reservationOpen, setReservationOpen] = useState(false);
  useEffect(() => captureAttribution(), []);

  return (
    <main className="min-h-screen">
      <Hero
        heroVideoUrl={cfg.sectionVideos.hero ?? null}
        reservationOpen={reservationOpen}
        onReservationOpenChange={setReservationOpen}
      />
      <Outputs />
      <Agenda />
      <OperatingLoop />
      <AgentTeam />
      <FitCheck />
      <TestimonialSection page="landing" />
      <Faq />
      <FinalCta onReserve={() => setReservationOpen(true)} />
      <Footer />
    </main>
  );
}

function Hero({
  heroVideoUrl,
  reservationOpen,
  onReservationOpenChange,
}: {
  heroVideoUrl: string | null;
  reservationOpen: boolean;
  onReservationOpenChange: (open: boolean) => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pb-24 sm:pt-16">
      <BrandSignature />

      <div className="mt-10 max-w-5xl">
        <p className="eyebrow">Live online · Sat Aug 29 + Sun Aug 30 · 1:00–4:00 PM Eastern</p>
        <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
          BUILD THE BUSINESS.
          <span className="block text-[color:var(--emerald-signal)]">HIRE THE AI TEAM.</span>
          <span className="block text-[color:var(--gold)]">PUT THE WORK ON AUTOPILOT.</span>
        </h1>
      </div>

      <FunnelVideoSlot
        url={heroVideoUrl}
        label="Watch the official Summit invitation"
        envKey="VITE_SUMMIT_VIDEO_HERO"
        className="mt-7 max-w-4xl"
      />

      <LandingReservationForm open={reservationOpen} onOpenChange={onReservationOpenChange} />

      <div className="mt-6 max-w-3xl border-l-2 border-[color:var(--emerald-signal)]/35 pl-4">
        <p className="font-heading text-lg text-muted-foreground sm:text-xl">
          In two live days, you will choose the niche you want to serve, build the core business
          system, and learn how to hire AI agents that research, analyze, do the math, market,
          follow up, and improve the work.
        </p>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          This is not just prompting. You will build connected workflows, loops, and internal tools
          your business can use again and again.
        </p>
      </div>

      <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        <article className="surface-raised border-[color:var(--gold)]/40 p-5">
          <p className="label-mono">Day 1 · Saturday, August 29</p>
          <p className="mt-2 font-display text-lg text-[color:var(--gold)]">1:00–4:00 PM Eastern</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Build the business foundation. Room opens at 12:45 PM Eastern.
          </p>
        </article>
        <article className="surface-raised border-[color:var(--emerald-signal)]/40 p-5">
          <p className="label-mono">Day 2 · Sunday, August 30</p>
          <p className="mt-2 font-display text-lg text-[color:var(--emerald-signal)]">
            1:00–4:00 PM Eastern
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hire the AI team and connect the work. Room opens at 12:45 PM Eastern.
          </p>
        </article>
      </div>

      <div className="mt-8 max-w-md">
        <p className="label-mono mb-3">Day 1 begins in</p>
        <Countdown />
      </div>
      <div className="mt-6 gold-rule max-w-md" />
    </section>
  );
}

function Outputs() {
  const outputs = [
    ["Niche + Offer Map", "Choose who you help, the problem you solve, and what you sell."],
    [
      "Business Infrastructure Map",
      "See the pages, apps, tools, data, and handoffs your business needs.",
    ],
    [
      "AI Readiness Blueprint",
      "Map the goals, rules, facts, numbers, and next steps your AI tools need.",
    ],
    ["AI Agent Team Chart", "Name the AI jobs, what each agent owns, and where a human approves."],
    [
      "Internal Business App Plan",
      "Plan or begin one internal business app that keeps the work in one place.",
    ],
    ["30-Day Build Order", "Know what to build first, second, and third after the Summit."],
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">What you leave with</p>
      <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
        A clear plan for a business that can run more work without you doing every step by hand.
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {outputs.map(([title, body], index) => (
          <article
            key={title}
            className={`surface-raised p-5 ${
              index === 2 || index === 3 ? "border-[color:var(--emerald-signal)]/35" : ""
            }`}
          >
            <h3 className="font-display text-sm text-[color:var(--gold)]">{title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Income is not guaranteed. Results depend on the decisions you make and the work you continue
        after the Summit.
      </p>
    </section>
  );
}

function Agenda() {
  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two days · one connected build</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        What we build, hour by hour
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Sat Aug 29 · 1:00–4:00 PM ET</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
            BUILD THE BUSINESS FOUNDATION
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>· Choose the niche and costly problem you want to solve.</li>
            <li>· Map the customer, offer, price, and business numbers.</li>
            <li>· Design your business infrastructure.</li>
            <li>· Plan your internal business app.</li>
            <li>
              · Map the goals, rules, facts, numbers, and next steps your AI system will need.
            </li>
          </ul>
        </article>
        <article className="surface-raised border-[color:var(--emerald-signal)]/35 p-6">
          <p className="label-mono">Day 2 · Sun Aug 30 · 1:00–4:00 PM ET</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--emerald-signal)]">
            HIRE THE AI TEAM
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>· Build AI agent roles, jobs, tools, and rules.</li>
            <li>· Connect agents into workflows and improvement loops.</li>
            <li>· Set human approval points and limits.</li>
            <li>· Build marketing, follow-up, sales, and monetization paths.</li>
            <li>· Finish your 30-day build order.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function OperatingLoop() {
  const steps = [
    ["Research", "Learn the market, customer, competitors, and facts."],
    ["Analyze", "Compare the information and find what matters most."],
    ["Do the Math", "Run prices, budgets, goals, costs, and return numbers."],
    ["Act", "Create the page, message, report, task, or follow-up."],
    ["Check", "Review the result, catch errors, and ask for approval."],
    ["Improve", "Use the result to make the next run better."],
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">Workflows and loops</p>
      <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
        A prompt gives one answer. A loop keeps the work moving.
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(([title, body], index) => (
          <article key={title} className="surface-raised p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--gold)]/45 font-mono text-xs text-[color:var(--gold)]">
                {index + 1}
              </span>
              <h3 className="font-display text-base text-foreground">{title}</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgentTeam() {
  const roles = [
    ["Research Agent", "Finds facts, trends, customers, and competitors."],
    ["Numbers Agent", "Runs prices, budgets, forecasts, and business math."],
    ["Build Agent", "Helps create apps, pages, documents, and systems."],
    ["Marketing Agent", "Plans content, campaigns, offers, and distribution."],
    ["Sales Agent", "Researches leads, prepares outreach, and follows up."],
    ["Operations Agent", "Tracks tasks, checks work, and keeps the process moving."],
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">Your AI workforce</p>
      <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
        Give AI a job, not a random prompt.
      </h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Each agent needs a job, a goal, tools, rules, and a way to report back. You keep control of
        the important decisions.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(([title, body]) => (
          <article key={title} className="surface p-5">
            <h3 className="font-display text-sm text-[color:var(--emerald-signal)]">{title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FitCheck() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Who this is for</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="surface-raised border-[color:var(--emerald-signal)]/30 p-5">
          <h3 className="font-heading text-lg text-foreground">Join us if…</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You own a business or have a skill you want to sell.</li>
            <li>· You want AI to take repeat work off your plate.</li>
            <li>· You want a real system, not a pile of prompts.</li>
            <li>· You are ready to make decisions and build live.</li>
          </ul>
        </article>
        <article className="surface p-5">
          <h3 className="font-heading text-lg text-foreground">Skip this if…</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You want a magic money button.</li>
            <li>· You only want a passive watch-later course.</li>
            <li>· You will not bring a real business, skill, or offer.</li>
            <li>· You are not ready to test and improve your system.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function Faq() {
  const rows = [
    [
      "Do I need to code?",
      "No. We use plain language and visual tools. You learn the business logic first.",
    ],
    [
      "Is this a prompting class?",
      "No. Prompts are one small part. We build apps, agent jobs, workflows, loops, numbers, marketing, and approval rules.",
    ],
    [
      "What is the AI Readiness Blueprint?",
      "It maps the goals, rules, facts, numbers, and next steps your future AI system will need.",
    ],
    [
      "What will I leave with?",
      "A niche and offer map, infrastructure map, AI readiness blueprint, agent-team chart, internal app plan, and 30-day build order.",
    ],
    [
      "When is the Summit?",
      "Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern. The room opens at 12:45 PM.",
    ],
    [
      "Are recordings included?",
      "General Admission is built for live participation. A recording and deeper implementation option appears after registration.",
    ],
  ] as const;

  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">FAQ</p>
      <div className="mt-6 space-y-4">
        {rows.map(([question, answer]) => (
          <article key={question} className="surface p-5">
            <h3 className="font-heading text-foreground">{question}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ onReserve }: { onReserve: () => void }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center">
      <p className="eyebrow">SpinCityHQ &amp; NuAmenti present</p>
      <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Stop doing every business task by hand.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Join us live August 29 and 30 and build the system your AI team can run.
      </p>
      <a
        href="#reserve-seat"
        onClick={onReserve}
        className="mt-7 inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
      >
        Reserve General Admission
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
        <p>SpinCityHQ &amp; NuAmenti · SpincityHQ LLC · Atlanta, GA · Sebastian@spincityhq.com</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/refund-policy" className="hover:text-foreground">
            Refund policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
