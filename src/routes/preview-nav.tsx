import { createFileRoute } from "@tanstack/react-router";
import { getCommasConfig } from "@/lib/challenge-config";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed";

/**
 * Internal QA route — NOT linked from the public site.
 * Lets Spin click through every funnel state before promotion.
 */
export const Route = createFileRoute("/preview-nav")({
  head: () => ({
    meta: [
      { title: "Preview Nav — Internal QA" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewNav,
});

interface Row {
  label: string;
  href: string;
  desc: string;
}

const ROUTES: Row[] = [
  { label: "/", href: "/", desc: "Public landing and main VSL." },
  {
    label: "/?offer=ga",
    href: "/?offer=ga",
    desc: "Open the GA video explainer.",
  },
  {
    label: "/?offer=vip",
    href: "/?offer=vip",
    desc: "Open the VIP video explainer.",
  },
  {
    label: "/?offer=bundle",
    href: "/?offer=bundle",
    desc: "Open the Bundle video explainer.",
  },
  {
    label: "/?offer=founder",
    href: "/?offer=founder",
    desc: "Open the $1,111 Founder video explainer.",
  },
  {
    label: "/checkout?tier=ga",
    href: "/checkout?tier=ga",
    desc: "GA truth check and FanBasis handoff.",
  },
  {
    label: "/checkout?tier=vip",
    href: "/checkout?tier=vip",
    desc: "VIP truth check and FanBasis handoff.",
  },
  {
    label: "/checkout?tier=bundle",
    href: "/checkout?tier=bundle",
    desc: "Bundle truth check and FanBasis handoff.",
  },
  {
    label: "/checkout?tier=founder",
    href: "/checkout?tier=founder",
    desc: "Founder truth check and FanBasis handoff.",
  },
  {
    label: "/confirmed",
    href: "/confirmed",
    desc: "Neutral order-checking fallback.",
  },
  {
    label: "/confirmed?tier=ga",
    href: "/confirmed?tier=ga",
    desc: "GA next steps and confirmation VSL.",
  },
  {
    label: "/confirmed?tier=vip",
    href: "/confirmed?tier=vip",
    desc: "VIP next steps and confirmation VSL.",
  },
  {
    label: "/confirmed?tier=bundle",
    href: "/confirmed?tier=bundle",
    desc: "Bundle next steps and confirmation VSL.",
  },
  {
    label: "/confirmed?tier=founder",
    href: "/confirmed?tier=founder",
    desc: "Founder onboarding steps and confirmation VSL.",
  },
  { label: "/privacy", href: "/privacy", desc: "Privacy policy." },
  { label: "/terms", href: "/terms", desc: "Terms." },
  {
    label: "/refund-policy",
    href: "/refund-policy",
    desc: "Refund policy.",
  },
  {
    label: "/calendar/day1.ics",
    href: "/calendar/day1.ics",
    desc: "Day 1 core calendar · 12–4 PM ET.",
  },
  {
    label: "/calendar/day2.ics",
    href: "/calendar/day2.ics",
    desc: "Day 2 core calendar · 12–4 PM ET.",
  },
  {
    label: "/calendar/day1-vip.ics",
    href: "/calendar/day1-vip.ics",
    desc: "Day 1 VIP+ calendar · 12–5 PM ET.",
  },
  {
    label: "/calendar/day2-vip.ics",
    href: "/calendar/day2-vip.ics",
    desc: "Day 2 VIP+ calendar · 12–5 PM ET.",
  },
];

function PreviewNav() {
  const cfg = getCommasConfig();
  const v = cfg.sectionVideos;
  const env = import.meta.env as Record<string, string | undefined>;
  const videoChecks = [
    ["Main-page VSL", v?.hero],
    ["GA explainer", v?.offerVideos?.ga],
    ["VIP explainer", v?.offerVideos?.vip],
    ["Bundle explainer", v?.offerVideos?.bundle],
    ["Founder explainer", v?.offerVideos?.founder],
    ["Checkout truth-check", v?.checkout],
    ["GA confirmation", v?.confirmedVideos?.ga ?? v?.confirmed],
    ["VIP confirmation", v?.confirmedVideos?.vip ?? v?.confirmed],
    ["Bundle confirmation", v?.confirmedVideos?.bundle ?? v?.confirmed],
    ["Founder confirmation", v?.confirmedVideos?.founder ?? v?.confirmed],
  ] as const;
  const aiSpinReady =
    env.VITE_AI_SPIN_ENABLED === "true" &&
    env.VITE_AI_SPIN_LIMITS_VERIFIED === "true" &&
    Boolean(env.VITE_HEYGEN_LIVE_AVATAR_EMBED_URL);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <p className="eyebrow">Internal · QA</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Preview every funnel state
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Click through the offer explainers, checkout truth checks, and
        purchase-specific next steps before promotion.
      </p>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          Video readiness
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {videoChecks.map(([label, url]) => {
            const ready = Boolean(normalizeVideoEmbedUrl(url ?? null));
            return (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <span
                  className={
                    ready
                      ? "font-mono text-[color:var(--emerald-signal)]"
                      : "font-mono text-muted-foreground"
                  }
                >
                  {ready ? "READY" : "NEEDS VIDEO"}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">HeyGen Live AI Spin</span>
            <span
              className={
                aiSpinReady
                  ? "font-mono text-[color:var(--emerald-signal)]"
                  : "font-mono text-muted-foreground"
              }
            >
              {aiSpinReady ? "READY" : "NEEDS SETUP"}
            </span>
          </div>
        </div>
      </section>

      <ul className="mt-8 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
        {ROUTES.map((r) => (
          <li
            key={r.href}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <a
              href={r.href}
              className="font-mono text-sm text-[color:var(--gold)] hover:underline sm:min-w-[270px]"
            >
              {r.label}
            </a>
            <span className="text-sm text-muted-foreground">{r.desc}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
