import { Link } from "@tanstack/react-router";

/**
 * Small callout inviting confirmed buyers to complete the pre-Summit
 * alignment audit. Same visual family as the surface cards on /confirmed
 * and /next-steps. No tracking, no third-party embeds.
 */
export function AuditCallout() {
  return (
    <section className="mt-6 rounded-md border border-[color:var(--emerald-signal)]/50 bg-[color:var(--surface)] p-5">
      <p className="eyebrow">3 minutes · shapes the room</p>
      <h2 className="mt-2 font-heading text-lg text-foreground">
        Take the pre-Summit alignment audit
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ten quick questions. Your answers directly change what gets taught on
        Day 1 and Day 2 — the bottleneck, the tool stack, and the autonomy
        goal you want us to hit.
      </p>
      <Link
        to="/audit"
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Start the 3-minute audit
      </Link>
    </section>
  );
}
