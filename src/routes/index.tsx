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
      {
        title: "AI AutoPilot 2-Day Summit — SpinCityHQ & NuAmenti",
      },
      {
        name: "description",
        content:
          "Build the foundation for a business that uses AI agents, apps, workflows, and loops to handle research, numbers, follow-up, marketing, and daily work.",
      },
      {
        property: "og:title",
        content: "AI AutoPilot 2-Day Summit — SpinCityHQ & NuAmenti",
      },
      {
        property: "og:description",
        content:
          "Stop just prompting. Build the business system, hire the AI team, and put repeatable work on autopilot. Live online Aug 24–25, 2026.",
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
      <OperatingLoop />
      <AgentTeam />
      <WhyDifferent />
      <FitCheck />
      <TestimonialSection page="landing" />
      <Faq />
      <BuildPath />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero({ heroVideoUrl }: { heroVideoUrl: string | null }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pb-24 sm:pt-16">
      <BrandSignature />

      <div className="mt-10 max-w-5xl">
        <p className="eyebrow">Live online · Aug 24–25, 2026</p>
        <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
          BUILD THE BUSINESS.
          <span className="block text-[color:var(--emerald-signal)]">
            HIRE THE AI TEAM.
          </span>
          <span className="block text-[color:var(--gold)]">
            PUT THE WORK ON AUTOPILOT.
          </span>
        </h1>
        <p className="mt-6 max-w-3xl font-heading text-lg text-muted-foreground sm:text-xl">
          In two live days, you will choose the niche you want to serve, build
          the core business system, and learn how to hire AI agents that
          research, analyze, do the math, market, follow up, and improve the
          work.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
          This is not just prompting. You will build connected workflows,
          loops, and internal tools your business can use again and again.
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
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-heading text-base font-semibold text-primary-foreground shadow-[0_0_28px_rgba(218,177,72,0.18)] transition hover:opacity-90"
        >
          Reserve Your Seat
        </Link>
      </div>
      <div className="mt-6 gold-rule max-w-md" />
    </section>
  );
}

function Promise() {
  const outputs = [
    {
      title: "Niche + Offer Map",
      body: "Choose who you want to help, the problem you will solve, and what you will sell.",
    },
    {
      title: "Business Infrastructure Map",
      body: "See the pages, apps, tools, data, and handoffs your business needs to run.",
    },
    {
      title: "AI Business GPS",
      body: "Give every AI tool the same goals, rules, facts, numbers, and next steps.",
    },
    {
      title: "AI Agent Team Chart",
      body: "Name the AI jobs, what each agent owns, and where a human must approve.",
    },
    {
      title: "Starter Internal App Plan",
      body: "Plan or begin one simple app that helps your team run the work in one place.",
    },
    {
      title: "30-Day Build Order",
      body: "Know what to build first, second, and third after the Summit ends.",
    },
  ];

  return (
    <section
      className="mx-auto max-w-5xl px-5 py-16"
      aria-labelledby="promise-h"
    >
      <p className="eyebrow">What you leave with</p>
      <h2
        id="promise-h"
        className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl"
      >
        A clear plan for a business that can run more work without you doing
        every step by hand.
      </h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        You bring a real business, skill, or offer. We help you turn it into a
        system that AI agents can understand, follow, and improve.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {outputs.map((item, index) => (
          <article
            key={item.title}
            className={`surface-raised p-5 ${
              index === 2 || index === 3
                ? "border-[color:var(--emerald-signal)]/35"
                : ""
            }`}
          >
            <p className="font-display text-sm text-[color:var(--gold)]">
              {item.title}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        No income promise. No magic button. The result depends on the business
        you bring and the work you keep doing after the Summit.
      </p>
    </section>
  );
}

function Agenda() {
  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two days · one connected build</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        What we build, day by day
      </h2>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Build the foundation</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
            BUSINESS FIRST
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>· Choose the niche and problem you want to serve.</li>
            <li>· Map the customer, offer, tasks, and numbers.</li>
            <li>· Build your business infrastructure map.</li>
            <li>· Plan or begin your internal business app.</li>
            <li>
              · Set up your AI Business GPS so every tool knows the goal,
              rules, facts, and next move.
            </li>
            <li>· Pick the first jobs to take off your plate.</li>
          </ul>
        </article>

        <article className="surface-raised border-[color:var(--emerald-signal)]/35 p-6">
          <p className="label-mono">Day 2 · Hire the AI team</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--emerald-signal)]">
            AGENTS + GROWTH
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>· Build your AI team chart and job descriptions.</li>
            <li>· Learn where and how to hire or build skilled AI agents.</li>
            <li>· Connect agents into workflows that pass work forward.</li>
            <li>· Build loops that check results and improve the next run.</li>
            <li>· Set up marketing, follow-up, and monetization.</li>
            <li>· Leave with your 30-day build order.</li>
          </ul>
        </article>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Exact session start times are sent to registrants by email.
      </p>
    </section>
  );
}

function OperatingLoop() {
  const steps = [
    {
      title: "Research",
      body: "Learn the market, customer, competitors, and facts.",
    },
    {
      title: "Analyze",
      body: "Compare the information and find what matters most.",
    },
    {
      title: "Do the Math",
      body: "Run prices, budgets, goals, costs, and return numbers.",
    },
    {
      title: "Act",
      body: "Create the page, message, report, task, or follow-up.",
    },
    {
      title: "Check",
      body: "Review the result, catch errors, and ask for approval.",
    },
    {
      title: "Improve",
      body: "Use the result to make the next run better.",
    },
  ];

  return (
    <section id="experience" className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">Workflows and loops</p>
      <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
        A prompt gives one answer. A loop keeps the work moving.
      </h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        We show you how to connect the steps so your AI team can research,
        think, act, check the work, and improve without waiting for you to start
        every task.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="surface-raised p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--gold)]/45 font-mono text-xs text-[color:var(--gold)]">
                {index + 1}
              </span>
              <h3 className="font-display text-base text-foreground">
                {step.title}
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{step.body}</p>
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
        Each agent needs a job, a goal, tools, rules, and a way to report back.
        We show you how to structure agents like a real team while you keep
        control of the important decisions.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(([title, body]) => (
          <article
            key={title}
            className="surface p-5 transition hover:border-[color:var(--emerald-signal)]/35"
          >
            <h3 className="font-display text-sm text-[color:var(--emerald-signal)]">
              {title}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WhyDifferent() {
  const points = [
    {
      title: "Real business first",
      body: "We start with your niche, offer, customer, numbers, and daily work.",
    },
    {
      title: "Systems, not tool tricks",
      body: "We connect apps, agents, workflows, and loops into one work path.",
    },
    {
      title: "Human control stays clear",
      body: "You decide what AI can do, what it cannot touch, and what needs approval.",
    },
    {
      title: "Build while you learn",
      body: "You do not leave with notes only. You leave with maps, roles, and a build order.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Why this Summit</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Not another AI tool tour.
      </h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Most classes show you prompts and tools. We show you how the work fits
        together so your business can use AI every day.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {points.map((point) => (
          <article key={point.title} className="surface-raised p-5">
            <h3 className="font-heading text-lg text-foreground">
              {point.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{point.body}</p>
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
        <div className="surface-raised border-[color:var(--emerald-signal)]/30 p-5">
          <h3 className="font-heading text-lg text-foreground">
            This is for you if…
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You own a business or have a skill you want to sell.</li>
            <li>· You want AI to take repeat work off your plate.</li>
            <li>· You want a real system, not a pile of prompts.</li>
            <li>· You are ready to make decisions and build live.</li>
          </ul>
        </div>
        <div className="surface p-5">
          <h3 className="font-heading text-lg text-foreground">
            Skip this if…
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· You want a magic money button.</li>
            <li>· You want a passive watch-later course.</li>
            <li>· You will not bring a real business, skill, or offer.</li>
            <li>· You are not ready to test and improve your system.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const rows = [
    {
      q: "Do I need to know how to code?",
      a: "No. We use plain language and visual tools. You will learn the business logic first, then use AI builders and apps to put it together.",
    },
    {
      q: "Is this just a prompting class?",
      a: "No. Prompts are one small part. We focus on business maps, internal apps, agent jobs, workflows, loops, numbers, marketing, and human approval.",
    },
    {
      q: "What is an AI Business GPS?",
      a: "It is the shared set of goals, rules, facts, numbers, and next steps that keeps your AI tools and agents pointed at the same business outcome.",
    },
    {
      q: "What will I leave with?",
      a: "A niche and offer map, business infrastructure map, AI Business GPS, agent team chart, starter internal app plan, and a 30-day build order.",
    },
    {
      q: "Can AI run every part of my business?",
      a: "Not every part should run without a human. We show you what can be automated, what needs review, and where you must stay in control.",
    },
    {
      q: "Where is the Summit?",
      a: "It is 100% live online. Access details and session times are sent to registrants by email.",
    },
    {
      q: "Are recordings included?",
      a: "General Admission is built for live participation. A recording and deeper implementation option is offered after your seat is confirmed.",
    },
    {
      q: "What happens after I pay?",
      a: "You receive a FanBasis receipt and a NuAmenti welcome email. Check your inbox, Promotions, and Spam folders.",
    },
    {
      q: "What is the refund policy?",
      a: "Read the current terms on the Refund Policy page before you pay.",
    },
  ];

  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">FAQ</p>
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <article key={row.q} className="surface p-5">
            <p className="font-heading text-foreground">{row.q}</p>
            <p className="mt-2 text-sm text-muted-foreground">{row.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BuildPath() {
  const path = [
    ["Before the Summit", "Bring one business, skill, offer, or clear idea."],
    ["Day 1", "Build the business foundation, internal app plan, and AI Business GPS."],
    ["Day 2", "Set the AI team, workflows, marketing, and money path."],
    ["After the Summit", "Follow your 30-day build order and keep improving the loops."],
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Your build path</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {path.map(([title, body], index) => (
          <article key={title} className="surface-raised p-5">
            <p className="font-mono text-xs text-[color:var(--gold)]">
              0{index + 1}
            </p>
            <h3 className="mt-3 font-heading text-lg text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section
      id="registration"
      className="mx-auto max-w-4xl px-5 py-20 text-center"
    >
      <p className="eyebrow">SpinCityHQ &amp; NuAmenti present</p>
      <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Stop doing every business task by hand.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Build the system. Hire the AI team. Keep the human control.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/checkout"
          className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-heading text-base font-semibold text-primary-foreground shadow-[0_0_28px_rgba(218,177,72,0.18)] transition hover:opacity-90"
        >
          Reserve Your Seat
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
        <p>
          SpinCityHQ &amp; NuAmenti · SpincityHQ LLC · Atlanta, GA ·
          Info@NuAmenti.com
        </p>
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
