import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Countdown } from "@/components/Countdown";
import {
  TIERS,
  formatUsd,
  FOUNDER_DISCLAIMER,
  FOUNDER_HARD_CAP,
  GA_BUMP_COPY,
  isTierId,
  type TierId,
} from "@/lib/tiers";
import { getCommasConfig } from "@/lib/challenge-config";
import { VideoSlot } from "@/components/VideoSlot";
import { AiSpinAvatar } from "@/components/AiSpinAvatar";
import { OfferExplainerDialog } from "@/components/OfferExplainerDialog";
import { useFounderSeatsRemaining } from "@/hooks/use-founder-seats";

const searchSchema = z.object({
  offer: z.enum(["ga", "vip", "bundle", "founder"]).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "The AUTOPILOT Challenge — 2-Day Live Build · Aug 1–2, 2026" },
      {
        name: "description",
        content:
          "Build a monetizable website, launch-ready marketing assets, and an AI-powered lead and sales system with us in two four-hour live days. Aug 1–2, 2026, 12–4 PM ET.",
      },
      {
        property: "og:title",
        content: "The AUTOPILOT Challenge — Aug 1–2, 2026",
      },
      {
        property: "og:description",
        content:
          "Leave with a live monetizable site, launch marketing assets, and an automated path from lead to sale.",
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const cfg = getCommasConfig();
  const v = cfg.sectionVideos ?? ({} as NonNullable<typeof cfg.sectionVideos>);
  const founder = useFounderCta();
  const selectedTier: TierId | null = isTierId(search.offer)
    ? search.offer
    : null;

  function openOffer(tier: TierId) {
    navigate({ to: "/", search: { offer: tier }, replace: true });
  }

  function onExplainerOpenChange(open: boolean) {
    if (!open) navigate({ to: "/", search: {}, replace: true });
  }

  return (
    <main className="min-h-screen">
      <TopBar />
      <Hero heroVideoUrl={v.hero ?? null} onChoose={openOffer} />
      <Promise />
      <Agenda />
      <LeaveWith />
      <AutonomyMap />
      <ChooseAccessIntro />
      <TierComparison founder={founder} onChoose={openOffer} />
      <AiSpinAvatar />

      <FounderSection founder={founder} onChoose={openOffer} />
      <WhyDifferent />
      <FitCheck />
      <Faq />
      <Timeline />
      <FinalCta founder={founder} onChoose={openOffer} />
      <Footer />
      <OfferExplainerDialog
        tier={selectedTier}
        videoUrl={selectedTier ? (v.offerVideos?.[selectedTier] ?? null) : null}
        onOpenChange={onExplainerOpenChange}
      />
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
        <a href="#agenda" className="hover:text-foreground">
          Agenda
        </a>
        <a href="#tiers" className="hover:text-foreground">
          Tiers
        </a>
        <a href="#faq" className="hover:text-foreground">
          FAQ
        </a>
      </nav>
    </header>
  );
}

function Hero({
  heroVideoUrl,
  onChoose,
}: {
  heroVideoUrl: string | null;
  onChoose: (tier: TierId) => void;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
      <p className="eyebrow">The AUTOPILOT Challenge</p>
      <h1 className="rise-in mt-4 font-display text-3xl leading-tight text-foreground sm:text-5xl md:text-6xl">
        BUILD A BUSINESS
        <span className="block text-[color:var(--gold)]">
          THAT CAN SELL—AND RUN.
        </span>
        <span className="block">IN TWO DAYS. TOGETHER.</span>
      </h1>
      <p className="mt-6 max-w-2xl font-heading text-lg text-muted-foreground sm:text-xl">
        Bring your business, idea, or offer. We will build a monetizable
        website, create your launch marketing assets, and connect an AI-powered
        lead and sales system with you—live.
      </p>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Sat Aug 1 + Sun Aug 2, 2026 · 12:00–4:00 PM ET both days · 8 live build
        hours.
      </p>

      <div className="mt-8 max-w-md">
        <p className="label-mono mb-3">Live in</p>
        <Countdown />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onChoose("ga")}
          className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:opacity-90"
        >
          Choose GA — $77
        </button>
        <a
          href="#tiers"
          className="inline-flex items-center rounded-md border border-border bg-transparent px-5 py-3 font-heading text-base text-foreground transition hover:bg-secondary"
        >
          Compare Challenge Options
        </a>
      </div>
      <div className="mt-6 gold-rule max-w-md" />

      <VideoSlot
        url={heroVideoUrl}
        label="Watch: what we build in 8 live hours"
        className="mt-10 max-w-3xl"
      />
    </section>
  );
}

function ChooseAccessIntro() {
  return (
    <section
      className="mx-auto max-w-4xl px-5 pt-4 pb-2"
      aria-labelledby="choose-access-h"
    >
      <p className="eyebrow">Choose your access</p>
      <h2
        id="choose-access-h"
        className="mt-3 font-heading text-2xl text-foreground sm:text-3xl"
      >
        Pick the seat that fits how you show up.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every ticket includes both live build days and the workbook. Higher
        tiers add replays, group VIP sessions, and NuAmenti benefits.
      </p>
    </section>
  );
}

function Promise() {
  return (
    <section
      className="mx-auto max-w-4xl px-5 py-16"
      aria-labelledby="promise-h"
    >
      <p className="eyebrow">The promise</p>
      <h2
        id="promise-h"
        className="mt-3 font-heading text-2xl text-foreground sm:text-3xl"
      >
        By Sunday, your business will have a place to sell, assets to market it,
        and a system to follow up.
      </h2>
      <p className="mt-4 text-muted-foreground">
        You will leave with a live monetizable site, a launch-ready marketing
        pack, and a working path that can capture a lead and move that person
        toward booking or buying.
      </p>
      <p className="mt-4 font-heading text-lg text-[color:var(--gold)]">
        Automated where it should be. Human where it matters.
      </p>
      <div className="mt-6 rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)] p-5 text-sm text-muted-foreground">
        <p className="font-heading text-foreground">Clear expectation</p>
        <p className="mt-2">
          This is a hands-on build. Come ready to make choices, share your
          business details, and connect your accounts. If you do not have every
          photo, video, or design yet, we will use AI to make a strong working
          version. You leave with the business assets. We do not promise how
          much money they will make.
        </p>
      </div>
    </section>
  );
}

function Agenda() {
  return (
    <section id="agenda" className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">Two-day agenda</p>
      <h2 className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
        What we do, day by day
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="surface-raised p-6">
          <p className="label-mono">Day 1 · Sat Aug 1</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
            BUILD THE OFFER + SITE
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              · Lock in who you help, what you sell, and what you want buyers to
              do.
            </li>
            <li>· Use AI to write the offer, page copy, and sales message.</li>
            <li>
              · Build the site with your brand, images, video, and call to
              action.
            </li>
            <li>· Add a way to pay, book, or join your list.</li>
            <li>
              · Publish the working site and map the jobs it needs AI to run.
            </li>
          </ul>
        </article>
        <article className="surface-raised p-6">
          <p className="label-mono">Day 2 · Sun Aug 2</p>
          <h3 className="mt-2 font-display text-xl text-[color:var(--gold)]">
            BUILD THE MARKETING + AUTOPILOT
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              · Create the copy, social posts, ad creative, email, and video
              assets needed to launch.
            </li>
            <li>· Connect the site to your lead, booking, or payment flow.</li>
            <li>
              · Build the follow-up system that moves people toward the offer.
            </li>
            <li>
              · Set the rules for what AI handles and where you approve the
              work.
            </li>
            <li>
              · Test the full path on desktop and mobile, then leave ready to
              promote.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function LeaveWith() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <p className="eyebrow">What you leave with</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            k: "01",
            t: "A live monetizable site",
            d: "Your offer, sales message, brand, and a clear way to pay, book, or become a lead.",
          },
          {
            k: "02",
            t: "Launch marketing assets",
            d: "The copy, social posts, email, ad creative, and video assets needed to start promoting.",
          },
          {
            k: "03",
            t: "A lead + sales system",
            d: "A working path that captures interest, follows up, and sends people toward your offer.",
          },
          {
            k: "04",
            t: "Your Autonomy Map",
            d: "The jobs AI will research, create, and distribute while you stay in control.",
          },
        ].map((x) => (
          <div key={x.k} className="surface p-5">
            <p className="font-mono text-xs text-[color:var(--gold-soft)]">
              {x.k}
            </p>
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
          {
            t: "Research",
            d: "AI learns your customer, market, offer, and the facts your business needs.",
          },
          {
            t: "Create",
            d: "AI helps make the website, copy, designs, videos, emails, and campaign assets.",
          },
          {
            t: "Distribute",
            d: "AI helps publish, follow up, and move people back to your offer.",
          },
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
  onChoose,
}: {
  founder: FounderCtaState;
  onChoose: (tier: TierId) => void;
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
                  {founder.buttonLabel(
                    t.id === "founder"
                      ? "Claim a Founder Seat — $1,111"
                      : `Choose ${t.name} — ${formatUsd(t.priceCents)}`,
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onChoose(t.id)}
                  className={`${buttonBase} hover:opacity-90`}
                >
                  {t.id === "bundle"
                    ? "Choose the Bundle — $333"
                    : t.id === "founder"
                      ? "Claim a Founder Seat — $1,111"
                      : `Choose ${t.name} — ${formatUsd(t.priceCents)}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FounderSection({
  founder,
  onChoose,
}: {
  founder: FounderCtaState;
  onChoose: (tier: TierId) => void;
}) {
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
          The Bundle, plus 3 months NuAmenti Diamond at launch, the Founding
          Credits Wall, a signed founding-edition book, the private Founders
          room in the InnerCITY, the Founders Meetup at InvestFest (Sat Aug 8,
          Atlanta), and first MCP beta access.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {FOUNDER_DISCLAIMER}
        </p>
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
          <button
            type="button"
            onClick={() => onChoose("founder")}
            className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Claim a Founder Seat — $1,111
          </button>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {FOUNDER_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}

function WhyDifferent() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Why this is different</p>
      <ul className="mt-6 space-y-3 text-muted-foreground">
        <li>
          · You do not leave with notes. You leave with a site and a launch
          campaign.
        </li>
        <li>
          · AI speeds up the research, writing, design, video, and setup work.
        </li>
        <li>
          · We connect the pieces into one business system and test it together.
        </li>
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
          <li>
            · You have a business, an offer, or an idea you are ready to sell.
          </li>
          <li>
            · You can bring a laptop and make decisions during the live build.
          </li>
          <li>
            · You can bring your logins, brand files, photos, and videos if you
            have them.
          </li>
          <li>· You are ready to promote what we build after Day 2.</li>
        </ul>
      </div>
      <div className="surface p-6">
        <p className="eyebrow">Who it isn't for</p>
        <ul className="mt-4 space-y-2 text-muted-foreground text-sm">
          <li>· This is not a passive class where you only watch.</li>
          <li>· This is not a private done-for-you agency package.</li>
          <li>· This is not a promise of sales or income.</li>
          <li>· Some outside tools may have their own fees.</li>
          <li>
            · Your system will still need your judgment, testing, and updates as
            it grows.
          </li>
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "What if I can't make it live?",
      a: "VIP and above include recordings. GA buyers can add recordings and the completed Autonomy Map template for $22 during checkout. Recordings help you catch up, but you still have to complete the build work.",
    },
    {
      q: "Will you charge my card here?",
      a: "No. You will finish payment on a secure FanBasis checkout page. This website does not see or store your card details.",
    },
    {
      q: "What will we finish in two days?",
      a: "You will leave with a live monetizable site, launch marketing assets, and a working lead and sales follow-up system. Your site will be ready to promote and ready for people to pay, book, or join your list.",
    },
    {
      q: "What does monetizable mean?",
      a: "It means the site has a clear offer and a real next step: pay, book, apply, or join your list. It does not mean sales or income are guaranteed.",
    },
    {
      q: "Is the Founder Seat an investment?",
      a: FOUNDER_DISCLAIMER,
    },
    {
      q: "What tools do I need?",
      a: "Bring a laptop, your offer or business idea, and the logins for the tools you use. Bring your logo, photos, and videos if you have them. If you do not, we will use AI to make strong starter assets. Some outside tools may require a paid plan.",
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
          <p className="text-foreground">
            Founders Meetup at InvestFest — Atlanta.
          </p>
        </li>
        <li>
          <p className="label-mono">Aug 10</p>
          <p className="text-foreground">
            NuAmenti Gold / Diamond benefits activate for eligible tiers.
          </p>
        </li>
      </ol>
    </section>
  );
}

function FinalCta({
  founder,
  onChoose,
}: {
  founder: FounderCtaState;
  onChoose: (tier: TierId) => void;
}) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center">
      <p className="eyebrow">One more time</p>
      <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Two days. One business. Ready to sell.
      </h2>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => onChoose("ga")}
          className="rounded-md bg-primary px-6 py-3 font-heading font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Choose GA — $77
        </button>
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
          <button
            type="button"
            onClick={() => onChoose("founder")}
            className="rounded-md border border-[color:var(--gold)] px-6 py-3 font-heading font-semibold text-[color:var(--gold)] transition hover:bg-[color:var(--gold)]/10"
          >
            Founder Seat — $1,111
          </button>
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
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/refund-policy" className="hover:text-foreground">
            Refunds
          </Link>
        </nav>
      </div>
    </footer>
  );
}
