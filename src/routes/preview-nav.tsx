import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * Internal QA route — NOT linked from the public site.
 * Lets the founder click through every route in the funnel before wider
 * promotion. Noindex so it never leaks into search results.
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
  external?: boolean;
}

const ROUTES: Row[] = [
  { label: "/", href: "/", desc: "Public landing / sales page." },
  { label: "/checkout?tier=ga", href: "/checkout?tier=ga", desc: "Checkout shell — GA ($77)." },
  { label: "/checkout?tier=vip", href: "/checkout?tier=vip", desc: "Checkout shell — VIP ($177)." },
  { label: "/checkout?tier=bundle", href: "/checkout?tier=bundle", desc: "Checkout shell — Bundle ($333)." },
  { label: "/checkout?tier=founder", href: "/checkout?tier=founder", desc: "Checkout shell — Founder Seat ($1,111)." },
  { label: "/confirmed", href: "/confirmed", desc: "Neutral post-payment / verification-pending page." },
  { label: "/privacy", href: "/privacy", desc: "Privacy policy placeholder (noindex)." },
  { label: "/terms", href: "/terms", desc: "Terms placeholder (noindex)." },
  { label: "/refund-policy", href: "/refund-policy", desc: "Refund policy placeholder (noindex)." },
  { label: "/calendar/day1.ics", href: "/calendar/day1.ics", desc: "Day 1 calendar file (Sat Aug 1).", external: true },
  { label: "/calendar/day2.ics", href: "/calendar/day2.ics", desc: "Day 2 calendar file (Sun Aug 2).", external: true },
];

function PreviewNav() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Internal · QA</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Preview navigation
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Unlinked QA index of every route in the funnel. Not customer-facing.
      </p>

      <ul className="mt-8 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
        {ROUTES.map((r) => (
          <li key={r.href} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
            {r.external ? (
              <a
                href={r.href}
                className="font-mono text-sm text-[color:var(--gold)] hover:underline sm:min-w-[260px]"
              >
                {r.label}
              </a>
            ) : (
              <Link
                to={r.href}
                className="font-mono text-sm text-[color:var(--gold)] hover:underline sm:min-w-[260px]"
              >
                {r.label}
              </Link>
            )}
            <span className="text-sm text-muted-foreground">{r.desc}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
