import { createFileRoute, Link } from "@tanstack/react-router";
import { Countdown } from "@/components/Countdown";
import { TIERS, formatUsd, FOUNDER_DISCLAIMER, FOUNDER_HARD_CAP, GA_BUMP_COPY } from "@/lib/tiers";
import { getCommasConfig } from "@/lib/challenge-config";
import { VideoSlot } from "@/components/VideoSlot";
import { AiSpinAvatar } from "@/components/AiSpinAvatar";
import { useFounderSeatsRemaining } from "@/hooks/use-founder-seats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The AUTOPILOT Challenge — 2-Day Live Build · Aug 1–2, 2026" },
      {
        name: "description",
        content:
          "Two days. You leave with your Autonomy Map and your first working automated job — built live with me. Sat Aug 1 + Sun Aug 2, 2026, 12–2 PM ET.",
      },
      { property: "og:title", content: "The AUTOPILOT Challenge — Aug 1–2, 2026" },
      {
        property: "og:description",
        content:
          "Two days. Build one real automated job in your business, live.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

/**
 * Centralized Founder availability state for every Founder CTA on this
 * page (TierComparison, FounderSection, FinalCta). Fails closed whenever
 * sales are enabled and the verified seat count is anything other than a
 * finite positive number.
 */
export interface FounderCtaState {
  disabled: boolean;
  soldOut: boolean;
  availabilityLabel: string; // e.g. "33 seats total" | "SOLD OUT" | "Checking availability…"
  buttonLabel: (fallback: string) => string;
}

function useFounderCta(): FounderCtaState {
  const seats = useFounderSeatsRemaining();
  const cfg = getCommasConfig();
  // Verified zero is authoritative regardless of sales gate: never advertise
  // an available Founder seat if inventory says none remain.
  if (seats.status === "ok" && seats.remaining <= 0) {
    return {
      disabled: true,
      soldOut: true,
      availabilityLabel: "SOLD OUT",
      buttonLabel: () => "Founder Seats sold out",
    };
  }
  if (!cfg.salesEnabled) {
    return {
      disabled: false,
      soldOut: false,
      availabilityLabel: `${FOUNDER_HARD_CAP} seats total`,
      buttonLabel: (fallback) => fallback,
    };
  }
  if (seats.status !== "ok") {
    return {
      disabled: true,
      soldOut: false,
      availabilityLabel: "Checking availability…",
      buttonLabel: () => "Founder availability unavailable",
    };
  }
  return {
    disabled: false,
    soldOut: false,
    availabilityLabel: `${seats.remaining} of ${FOUNDER_HARD_CAP} seats remaining`,
    buttonLabel: (fallback) => fallback,
  };
}


function Landing() {
  const cfg = getCommasConfig();
  const v = cfg.sectionVideos ?? ({} as NonNullable<typeof cfg.sectionVideos>);
  const founder = useFounderCta();

  return (
    <main className="min-h-screen">
      <TopBar />
      <Hero heroVideoUrl={v.hero ?? null} />
      <AiSpinAvatar />
      <Promise />
      <Agenda dayOneVideoUrl={v.dayOne ?? null} dayTwoVideoUrl={v.dayTwo ?? null} />
      <LeaveWith />
      <AutonomyMap />
      <ChooseAccessIntro chooseAccessVideoUrl={v.chooseAccess ?? null} />
      <TierComparison founder={founder} gaBumpVideoUrl={v.gaBump ?? null} />

      <FounderSection founder={founder} />
      <WhyDifferent />
      <FitCheck />
      <ProofPlaceholder />
      <Faq />
      <Timeline />
      <FinalCta founder={founder} />
      <Footer />
    </main>
  );
}


function TopBar() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-5">
      <div className="font-display text-sm tracking-[0.28em] text-[color:var(--gold)]">
        AUTOPILOT
      </div>
      <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
        <a href="#agenda" className="hover:text-foreground">Agenda</a>
        <a href="#tiers" className="hover:text-foreground">Tiers</a>
        <a href="#faq" className="hover:text-foreground">FAQ</a>
      </nav>
    </header>
  );
}

function Hero({ heroVideoUrl }: { heroVideoUrl: string | null }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
      <p className="eyebrow">The AUTOPILOT Challenge</p>
      <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
        YOU'VE BEEN COMMENTING
        <span className="block text-[color:var(--gold)]">AUTOPILOT.</span>
        <span className="block">AUGUST 1<span className="text-[color:var(--gold)]">ST</span>, WE ACTUALLY BUILD IT.</span>
      </h1>
      <p className="mt-6 max-w-2xl font-heading text-lg text-muted-foreground sm:text-xl">
        2-Day Live Challenge · Sat Aug 1 + Sun Aug 2, 2026 · 12:00–2:00 PM ET both days.
      </p>

      <div className="mt-8 max-w-md">
        <p className="label-mono mb-3">Live in</p>
        <Countdown />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/checkout"
          search={{ tier: "ga" }}
          className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:opacity-90"
        >
          Reserve GA — $77
        </Link>
        <a
          href="#tiers"
          className="inline-flex items-center rounded-md border border-border bg-transparent px-5 py-3 font-heading text-base text-foreground transition hover:bg-secondary"
        >
          See all tiers
        </a>
      </div>
      <div className="mt-6 gold-rule max-w-md" />

      <VideoSlot url={heroVideoUrl} label="Watch: 60-second Challenge overview" className="mt-10 max-w-3xl" />
    </section>
  );
}

function ChooseAccessIntro({ chooseAccessVideoUrl }: { chooseAccessVideoUrl: string | null }) {
  return (
    <section className="mx-auto max-w-4xl px-5 pt-4 pb-2" aria-labelledby="choose-access-h">
      <p className="eyebrow">Choose your access</p>
      <h2 id="choose-access-h" className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Pick the seat that fits how you show up.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every tier includes both live days. Recordings, VIP Hours, and Founder benefits stack from there.
      </p>
      <VideoSlot url={chooseAccessVideoUrl} label="Watch: which tier is right for you" className="mt-6" />
    </section>
  );
}


function Promise() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16" aria-labelledby="promise-h">
      <p className="eyebrow">The promise</p>
      <h2 id="promise-h" className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Two days. You leave with your Autonomy Map — the three jobs in YOUR business AI can take this month — and your first working automated job, running, with your rules set.
      </h2>
      <p className="mt-4 font-heading text-lg text-[color:var(--gold)]">
        Not theory. Built, live, with me.
      </p>
    </section>
  );
}

function Agenda({
  dayOneVideoUrl,
  dayTwoVideoUrl,
}: {
  dayOneVideoUrl: string | null;
  dayTwoVideoUrl: string | null;
}) {
  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two-day agenda</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        What we do, day by day
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Sat Aug 1</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">MAP IT</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Identify the wall.</li>
            <li>· Research / Create / Distribute Autonomy Map.</li>
            <li>· Choose the three jobs AI can take this month.</li>
            <li>· Finish the map before you close the laptop.</li>
          </ul>
          <VideoSlot url={dayOneVideoUrl} label="Day 1 preview" className="mt-5" />
        </article>
        <article className="surface-raised p-6">
          <p className="label-mono">Day 2 · Sun Aug 2</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">BUILD IT</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Set the fence and rules.</li>
            <li>· Build one real automation, live.</li>
            <li>· Reliability math — will it actually hold?</li>
            <li>· Leave with a working first job.</li>
          </ul>
          <VideoSlot url={dayTwoVideoUrl} label="Day 2 preview" className="mt-5" />
        </article>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a
          href="/calendar/day1.ics"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-foreground hover:bg-secondary"
        >
          Add Day 1 to calendar
        </a>
        <a
          href="/calendar/day2.ics"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-foreground hover:bg-secondary"
        >
          Add Day 2 to calendar
        </a>
      </div>
    </section>
  );
}

function LeaveWith() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">What you leave with</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            k: "01",
            t: "Your Autonomy Map",
            d: "The three specific jobs AI can take in YOUR business this month.",
          },
          {
            k: "02",
            t: "One working automation",
            d: "Built live, with your rules set — running by Sunday evening.",
          },
          {
            k: "03",
            t: "Reliability math",
            d: "A plain-English way to know whether it'll actually hold up.",
          },
        ].map((x) => (
          <div key={x.k} className="surface p-5">
            <p className="font-mono text-xs text-[color:var(--gold-soft)]">{x.k}</p>
            <h3 className="mt-2 font-heading text-lg text-foreground">{x.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AutonomyMap() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">The map</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Research · Create · Distribute
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Research", d: "Inputs, signals, and the work of noticing." },
          { t: "Create", d: "Drafts, decisions, deliverables you'd normally hand-make." },
          { t: "Distribute", d: "Publishing, follow-ups, handoffs — the miles at the end." },
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

function TierComparison({
  founder,
  gaBumpVideoUrl,
}: {
  founder: FounderCtaState;
  gaBumpVideoUrl: string | null;
}) {
  return (
    <section id="tiers" className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">The tiers</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        Pick your seat
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => {
          const isFounder = t.id === "founder";
          const isGa = t.id === "ga";
          const founderDisabled = isFounder && founder.disabled;
          const buttonBase =
            "mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground transition";
          return (
            <article
              key={t.id}
              className={`surface-raised flex flex-col p-6 ${
                isFounder ? "ring-1 ring-[color:var(--gold)]" : ""
              }`}
            >
              <p className="label-mono">{t.name}</p>
              <div className="mt-2 font-display text-3xl text-foreground">
                {formatUsd(t.priceCents)}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.headline}</p>
              {isFounder ? (
                <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {founder.availabilityLabel}
                </p>
              ) : null}
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {t.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
                {isGa ? <li>· {GA_BUMP_COPY}</li> : null}
              </ul>
              {isGa ? (
                <VideoSlot
                  url={gaBumpVideoUrl}
                  label="Recordings add-on preview"
                  className="mt-4"
                />
              ) : null}

              {isFounder ? (
                <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                  {FOUNDER_DISCLAIMER}
                </p>
              ) : null}
              {founderDisabled ? (
                <button
                  type="button"
                  disabled
                  aria-disabled
                  className={`${buttonBase} cursor-not-allowed opacity-50`}
                >
                  {founder.buttonLabel(`Choose ${t.name}`)}
                </button>
              ) : (
                <Link
                  to="/checkout"
                  search={{ tier: t.id }}
                  className={`${buttonBase} hover:opacity-90`}
                >
                  Choose {t.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FounderSection({ founder }: { founder: FounderCtaState }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <div className="surface-raised p-8">
        <p className="eyebrow">
          Founder Seat ·{" "}
          <span
            className={
              founder.soldOut ? "text-[color:var(--emerald-signal)]" : undefined
            }
          >
            {founder.availabilityLabel}
          </span>
        </p>
        <h2 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
          The 33.
        </h2>
        <p className="mt-4 text-muted-foreground">
          The Bundle, plus 3 months NuAmenti Diamond at launch, the Founding Credits Wall,
          a signed founding-edition book, the private Founders room in the InnerCITY,
          the Founders Meetup at InvestFest (Sat Aug 8, Atlanta), and first MCP beta access.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{FOUNDER_DISCLAIMER}</p>
        {founder.disabled ? (
          <button
            type="button"
            disabled
            aria-disabled
            className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading font-semibold text-primary-foreground opacity-50"
          >
            {founder.buttonLabel("Claim a Founder Seat — $1,111")}
          </button>
        ) : (
          <Link
            to="/checkout"
            search={{ tier: "founder" }}
            className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Claim a Founder Seat — $1,111
          </Link>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{FOUNDER_DISCLAIMER}</p>
      </div>
    </section>
  );
}

function WhyDifferent() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Why this is different</p>
      <ul className="mt-6 space-y-3 text-muted-foreground">
        <li>· No theory day, no "just watch."</li>
        <li>· One real automation gets built during the Challenge, not after.</li>
        <li>· You leave with a map you can act on the next Monday, not a pile of PDFs.</li>
      </ul>
    </section>
  );
}

function FitCheck() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 grid gap-6 sm:grid-cols-2">
      <div className="surface p-6">
        <p className="eyebrow">Who this is for</p>
        <ul className="mt-4 space-y-2 text-muted-foreground text-sm">
          <li>· Operators tired of "AI ideas" that never ship.</li>
          <li>· Founders ready to hand one real job to a machine.</li>
          <li>· People who can complete two focused sessions — live when possible, or from included recordings (VIP+ and the GA recordings add-on).</li>
        </ul>
      </div>
      <div className="surface p-6">
        <p className="eyebrow">Who it isn't for</p>
        <ul className="mt-4 space-y-2 text-muted-foreground text-sm">
          <li>· People looking for a done-for-you agency.</li>
          <li>· Anyone expecting an income promise. There is none.</li>
          <li>· People who only watch and never build — you leave with a working automation, not notes.</li>
        </ul>
      </div>
    </section>
  );
}

function ProofPlaceholder() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <div className="surface p-6 text-center">
        <p className="eyebrow">Receipts</p>
        <p className="mt-3 font-heading text-lg text-foreground">
          Receipts are being documented.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          No testimonials, no counters, no fake activity — by design.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "What if I can't make it live?",
      a: "Show up if you can — the whole point is doing it together. VIP and above include recordings; on GA, an optional $22 recordings + completed-map template add-on is available inside secure Commas checkout.",
    },
    {
      q: "Will you charge my card here?",
      a: "No. Payment happens through Commas on the checkout page. This site never processes cards.",
    },
    {
      q: "Is the Founder Seat an investment?",
      a: FOUNDER_DISCLAIMER,
    },
    {
      q: "What tools do I need?",
      a: "A laptop, whatever tools you already use, and 2 hours a day. We'll build with what you have.",
    },
  ];
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">FAQ</p>
      <div className="mt-6 divide-y divide-[color:var(--hairline)]">
        {items.map((it) => (
          <details key={it.q} className="group py-4">
            <summary className="cursor-pointer list-none font-heading text-lg text-foreground">
              {it.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Timeline</p>
      <ol className="mt-6 space-y-4 border-l border-[color:var(--hairline)] pl-6 text-sm">
        <li>
          <p className="label-mono">Aug 1–2</p>
          <p className="text-foreground">The AUTOPILOT Challenge — live.</p>
        </li>
        <li>
          <p className="label-mono">Aug 7–9</p>
          <p className="text-foreground">InvestFest week, Atlanta.</p>
        </li>
        <li>
          <p className="label-mono">Aug 8</p>
          <p className="text-foreground">Founders Meetup at InvestFest — Atlanta.</p>
        </li>
        <li>
          <p className="label-mono">Aug 10</p>
          <p className="text-foreground">NuAmenti Gold / Diamond benefits activate for eligible tiers.</p>
        </li>
      </ol>
    </section>
  );
}

function FinalCta({ founder }: { founder: FounderCtaState }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center">
      <p className="eyebrow">One more time</p>
      <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        August 1<span className="text-[color:var(--gold)]">st</span>, we build.
      </h2>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/checkout"
          search={{ tier: "ga" }}
          className="rounded-md bg-primary px-6 py-3 font-heading font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Reserve GA — $77
        </Link>
        {founder.disabled ? (
          <button
            type="button"
            disabled
            aria-disabled
            className="rounded-md border border-[color:var(--gold)] px-6 py-3 font-heading font-semibold text-[color:var(--gold)] opacity-50"
          >
            {founder.buttonLabel("Founder Seat — $1,111")}
          </button>
        ) : (
          <Link
            to="/checkout"
            search={{ tier: "founder" }}
            className="rounded-md border border-[color:var(--gold)] px-6 py-3 font-heading font-semibold text-[color:var(--gold)] transition hover:bg-[color:var(--gold)]/10"
          >
            Founder Seat — $1,111
          </Link>
        )}
      </div>
      <p className="mx-auto mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        Founder · {founder.availabilityLabel}
      </p>
      <p className="mx-auto mt-4 max-w-xl text-xs text-muted-foreground">
        {FOUNDER_DISCLAIMER}
      </p>
    </section>
  );
}

function VideoEmbed({ url }: { url: string }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <p className="eyebrow">Challenge preview</p>
      <div className="mt-4 aspect-video overflow-hidden rounded-md border border-border">
        <iframe
          src={url}
          title="Challenge preview"
          loading="lazy"
          referrerPolicy="no-referrer"
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 py-12 text-sm text-muted-foreground">
      <div className="gold-rule" />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest">SPINCITYHQ LLC</p>
          <p className="mt-1">Info@NuAmenti.com · Atlanta, GA</p>
        </div>
        <nav className="flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/refund-policy" className="hover:text-foreground">Refunds</Link>
        </nav>
      </div>
    </footer>
  );
}
