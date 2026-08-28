import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandSignature } from "@/components/BrandFrame";
import { Countdown } from "@/components/Countdown";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { TestimonialSection } from "@/components/TestimonialSection";
import { LandingReservationForm } from "@/components/reserve/LandingReservationForm";
import { captureAttribution } from "@/lib/attribution";
import { getCommasConfig } from "@/lib/challenge-config";
import {
  CANONICAL_HOME_URL,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_URL,
  SUMMIT_DESCRIPTION,
  SUMMIT_TITLE,
} from "@/lib/site-meta";

const JSON_LD_EVENT = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "AI AutoPilot 2-Day Summit",
  description: SUMMIT_DESCRIPTION,
  image: [SOCIAL_IMAGE_URL],
  url: CANONICAL_HOME_URL,
  startDate: "2026-08-29T11:00:00-04:00",
  endDate: "2026-08-30T16:00:00-04:00",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "VirtualLocation",
    url: CANONICAL_HOME_URL,
  },
  organizer: {
    "@type": "Organization",
    name: "SpinCityHQ x NuAmenti",
    url: CANONICAL_HOME_URL,
    logo: SOCIAL_IMAGE_URL,
    email: "Sebastian@spincityhq.com",
  },
  subEvent: [
    {
      "@type": "Event",
      name: "AI AutoPilot 2-Day Summit — Day 1: Ignite + Architect the Business",
      startDate: "2026-08-29T11:00:00-04:00",
      endDate: "2026-08-29T16:00:00-04:00",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "VirtualLocation",
        url: CANONICAL_HOME_URL,
      },
    },
    {
      "@type": "Event",
      name: "Marching Orders: VSM for Autonomous Agentic Businesses with AKU",
      startDate: "2026-08-29T13:00:00-04:00",
      endDate: "2026-08-29T14:30:00-04:00",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "VirtualLocation",
        url: CANONICAL_HOME_URL,
      },
    },
    {
      "@type": "Event",
      name: "AI AutoPilot 2-Day Summit — Day 2: Build, Connect + Deploy",
      startDate: "2026-08-30T11:00:00-04:00",
      endDate: "2026-08-30T16:00:00-04:00",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "VirtualLocation",
        url: CANONICAL_HOME_URL,
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SUMMIT_TITLE },
      {
        name: "description",
        content: SUMMIT_DESCRIPTION,
      },
      {
        name: "robots",
        content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      },
      {
        property: "og:title",
        content: SUMMIT_TITLE,
      },
      {
        property: "og:description",
        content: SUMMIT_DESCRIPTION,
      },
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(JSON_LD_EVENT),
      },
    ],
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
      <EconomicOutcomes />
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
        <p className="eyebrow">Live online · Sat Aug 29 + Sun Aug 30 · 11:00 AM–4:00 PM Eastern</p>
        <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
          BUILD THE BUSINESS.
          <span className="block text-[color:var(--gold)]">OWN THE SOFTWARE.</span>
          <span className="block text-[color:var(--emerald-signal)]">HIRE THE AI TEAM.</span>
          <span className="block text-[color:var(--gold)]">PUT REPEATABLE WORK ON AUTOPILOT.</span>
        </h1>
        <p className="mt-5 font-display text-sm tracking-[0.13em] text-foreground sm:text-base">
          RECLAIM THE HOURS. PROTECT THE MONEY. KEEP THE REWARD.
        </p>
        <p className="mt-4 max-w-4xl text-base text-muted-foreground sm:text-lg">
          A paid, two-day working Summit—not another AI tool tour. Bring one real business
          bottleneck. Set up the LLM cockpit, architect the business, and build and test a
          controlled workflow designed to reclaim time, protect money, and improve service.
        </p>
      </div>

      <div
        role="note"
        className="mt-6 max-w-4xl rounded-md border border-[color:var(--gold)]/55 bg-[color:var(--surface)] px-4 py-3"
      >
        <p className="font-mono text-xs font-semibold tracking-[0.12em] text-[color:var(--gold)]">
          SCHEDULE UPDATED · BOTH DAYS NOW 11:00 AM–4:00 PM ET · DOORS OPEN 10:45 AM
        </p>
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
          This is a live, two-day business build where AI meets the infrastructure that makes a
          company move: strategy, marketing, sales, follow-up, operations, and automation.
        </p>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          You will not sit through another tool tour. You will configure your LLM workspace, map the
          business, design the AI team, and test a connected workflow using live activity timers and
          partner working breaks.
        </p>
      </div>

      <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        <article className="surface-raised border-[color:var(--gold)]/40 p-5">
          <p className="label-mono">Day 1 · Saturday, August 29</p>
          <p className="mt-2 font-display text-lg text-[color:var(--gold)]">
            11:00 AM–4:00 PM Eastern
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ignite the operator. Learn the language. Architect the business. Room opens at 10:45 AM
            Eastern.
          </p>
        </article>
        <article className="surface-raised border-[color:var(--emerald-signal)]/40 p-5">
          <p className="label-mono">Day 2 · Sunday, August 30</p>
          <p className="mt-2 font-display text-lg text-[color:var(--emerald-signal)]">
            11:00 AM–4:00 PM Eastern
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Build the AI team. Connect the money path. Deploy the workflow. Room opens at 10:45 AM
            Eastern.
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

function EconomicOutcomes() {
  const outcomes = [
    [
      "Reclaim the hours",
      "Identify repeated work, measure how often it happens, and decide what AI should remove from your plate.",
    ],
    [
      "Protect the money",
      "Give every tool an economic test: subscription, setup, oversight, risk, and the value it must return.",
    ],
    [
      "Keep the reward",
      "Build capacity that can improve service, protect margin, and create more room for the people and family you are building for.",
    ],
  ] as const;

  return (
    <section className="border-y border-border bg-[color:var(--surface)]/45">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">The economic standard</p>
        <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
          The automation must pay rent.
        </h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          No tool earns a place because it looks impressive. It must remove named work, return more
          value than its subscription, setup, and oversight cost, and improve the experience for
          customers or students.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {outcomes.map(([title, body]) => (
            <article key={title} className="surface-raised p-5">
              <h3 className="font-display text-sm text-[color:var(--gold)]">{title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          These are measurable goals, not guaranteed outcomes. Results depend on the business,
          implementation, and follow-through.
        </p>
      </div>
    </section>
  );
}

function Outputs() {
  const outputs = [
    [
      "Time + Money Baseline",
      "Name the repeated work, current cost, frequency, and hours you want the system to return.",
    ],
    [
      "LLM Business Cockpit",
      "Choose the right model, learn the key terms, organize your workspace, and set safe-use rules.",
    ],
    [
      "Customer + Offer Economics Map",
      "Clarify the customer or use case, costly problem, offer, price logic, and value path.",
    ],
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
      "VSM Autonomy Prescription",
      "Name what not to automate, what to fix first, what agents may own, what stays human, and when to escalate.",
    ],
    [
      "Internal Business App Plan",
      "Plan or prototype one owned internal app layer that keeps the business logic and work connected.",
    ],
    ["Measured Workflow", "Build or map one loop with a clear before, after, owner, and score."],
    ["30-Day Build Order", "Know what to build first, second, and third after the Summit."],
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">What you leave with</p>
      <h2 className="mt-3 max-w-4xl font-heading text-2xl text-foreground sm:text-3xl">
        A business operating blueprint designed to return time, protect money, and increase capacity
        without you doing every step by hand.
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
  const dayOne = [
    [
      "11:00 AM–1:00 PM",
      "SPIN · ENERGY, MINDSET + AI BUSINESS LITERACY",
      "Open with the Summit roadmap and economic promise, bring every founder up to speed on AI-for-business language, learn the keywords and model roles, and configure the LLM workspace with safe-use best practices.",
    ],
    [
      "1:00–2:30 PM",
      "AKU · MARCHING ORDERS: VSM FOR AUTONOMOUS AGENTIC BUSINESSES",
      "Use Stafford Beer's Viable System Model to diagnose organizational readiness, define human and agent authority, and complete a live VSM Autonomy Audit on one real business process.",
    ],
    [
      "2:30–4:00 PM",
      "SPIN · MARKETING + ADVERTISING DEPLOYMENT LAB",
      "Turn the build into demand: set up the marketing and advertising route, select the tools and sites, connect the content-to-lead path, and define the time-and-money scorecard.",
    ],
  ] as const;

  const dayTwo = [
    [
      "11:00–12:00",
      "RE-IGNITE + HIRE THE AI TEAM",
      "Run the system check, turn repeated work into clear agent roles, and choose what stays human.",
    ],
    [
      "12:00–1:00",
      "GIVE EVERY AGENT A JOB",
      "Set each agent's goal, tools, inputs, rules, reporting format, limits, and approval gate.",
    ],
    [
      "1:00–2:00",
      "CONNECT THE MONEY PATH",
      "Join marketing, lead capture, sales, follow-up, fulfillment, and measurement into one operating route.",
    ],
    [
      "2:00–3:00",
      "LIVE DEPLOYMENT SPRINT",
      "Build, connect, or test one real workflow with an activity timer, partner working break, and live troubleshooting.",
    ],
    [
      "3:00–4:00",
      "MEASURE + LAUNCH",
      "Create the economic receipt, test the human controls, lock the scorecard, and finish the 30-day deployment order.",
    ],
  ] as const;

  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two days · named faculty · one connected build</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Watch less. Build more. Leave with the next 30 days already ordered.
      </h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Every block ends with something built, chosen, tested, or measured. Short resets, visible
        activity timers, and partner working breaks keep the room moving together.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Sat Aug 29 · 11:00 AM–4:00 PM ET</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
            IGNITE + ARCHITECT THE BUSINESS
          </h3>
          <ol className="mt-5 space-y-4">
            {dayOne.map(([time, title, body]) => (
              <li key={time} className="border-l border-[color:var(--gold)]/35 pl-4">
                <p className="font-mono text-xs text-[color:var(--gold)]">{time} ET</p>
                <h4 className="mt-1 font-display text-sm text-foreground">{title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </article>
        <article className="surface-raised border-[color:var(--emerald-signal)]/35 p-6">
          <p className="label-mono">Day 2 · Sun Aug 30 · 11:00 AM–4:00 PM ET</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--emerald-signal)]">
            BUILD + CONNECT + DEPLOY
          </h3>
          <ol className="mt-5 space-y-4">
            {dayTwo.map(([time, title, body]) => (
              <li key={time} className="border-l border-[color:var(--emerald-signal)]/35 pl-4">
                <p className="font-mono text-xs text-[color:var(--emerald-signal)]">{time} ET</p>
                <h4 className="mt-1 font-display text-sm text-foreground">{title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </article>
      </div>
      <article className="surface-raised mt-5 border-[color:var(--gold)]/45 p-6">
        <p className="label-mono">Guest faculty spotlight · Day 1 · 1:00–2:30 PM ET</p>
        <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
          AKU · MARCHING ORDERS: VSM FOR AUTONOMOUS AGENTIC BUSINESSES
        </h3>
        <p className="mt-4 max-w-4xl text-muted-foreground">
          Most businesses begin with “What can we automate?” AKU begins with the harder, more useful
          question: “Is the business structurally ready to become autonomous?” This 90-minute
          working session uses Stafford Beer’s Viable System Model to map agents to operations,
          coordination, control, audit, intelligence, and policy—without surrendering human
          authority.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="surface p-5">
            <p className="font-display text-sm text-[color:var(--gold)]">60-MINUTE LECTURE</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Escape the Autopilot Trap, translate VSM Systems 1–5 and System 3* into agentic
              architecture, test automation readiness, and design bounded autonomy with explicit
              human and AI decision rights.
            </p>
          </div>
          <div className="surface border-[color:var(--emerald-signal)]/35 p-5">
            <p className="font-display text-sm text-[color:var(--emerald-signal)]">
              30-MINUTE LIVE VSM AUTONOMY AUDIT
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Pressure-test one real process, classify automate versus supervise versus human
              control, identify missing infrastructure, and set feedback, audit, exception, and
              escalation rules.
            </p>
          </div>
        </div>
        <p className="mt-5 border-l-2 border-[color:var(--emerald-signal)]/45 pl-4 text-sm text-muted-foreground">
          <span className="font-heading text-foreground">You leave with:</span> the VSM Autonomy
          Prescription—what not to automate, what to fix first, what to delegate, what to keep
          human, what to monitor, and when to escalate.
        </p>
      </article>
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
        A prompt gives one answer. An operating loop keeps work moving—and makes the result
        measurable.
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
      "What does “own the software” mean?",
      "You own the business logic, context, workflows, data choices, and internal app layer you build. Third-party LLMs and tools remain their providers' platforms.",
    ],
    [
      "What does “hire the AI team” mean?",
      "You design controlled agent roles with clear jobs, tools, rules, handoffs, limits, and human approval points. It does not mean unsupervised replacement of your team.",
    ],
    [
      "What will I leave with?",
      "A niche and offer map, infrastructure map, AI readiness blueprint, agent-team chart, internal app plan, and 30-day build order.",
    ],
    [
      "When is the Summit?",
      "Saturday, August 29 and Sunday, August 30 from 11:00 AM–4:00 PM Eastern. The room opens at 10:45 AM both days.",
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
        Your business should reward the people who built it.
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Join the live working Summit. Build the system. Hire the AI team. Put repeatable work on
        autopilot—and create more capacity for your customers, your team, and your family.
      </p>
      <a
        href="#reserve-seat"
        onClick={onReserve}
        className="mt-7 inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 font-heading text-base font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
      >
        Take My General Admission Seat
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
