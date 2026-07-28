import { createFileRoute, Link } from "@tanstack/react-router";
import { AuditCallout } from "@/components/AuditCallout";
import { OfferGate } from "@/components/OfferGate";
import { getCommasConfig } from "@/lib/challenge-config";
import { useIntensiveSlotsRemaining } from "@/hooks/use-intensive-slots";

export const Route = createFileRoute("/vault-welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Secure next steps for verified Emerald Key Holders.",
      },
    ],
    links: [{ rel: "canonical", href: "/vault-welcome" }],
  }),
  component: VaultWelcome,
});

function VaultWelcome() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Emerald Key Holder access</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your private Emerald next steps
      </h1>
      <OfferGate
        predicate={(access) => access.hasVault}
        ineligibleMessage="This private page opens only after an Emerald Vault Key purchase is verified."
      >
        <VaultWelcomeContent />
      </OfferGate>
    </main>
  );
}

function VaultWelcomeContent() {
  const cfg = getCommasConfig();
  const slots = useIntensiveSlotsRemaining();
  const intensiveUrl = cfg.urls.intensive;

  const seatLine =
    slots.status === "ok" ? `${slots.remaining} of 10 seats remaining` : "Limited seats";

  return (
    <>
      <p className="mt-6 text-sm text-[color:var(--emerald-signal)]">
        Thank you, family. Your Emerald Vault Key is confirmed.
      </p>

      {/* Section A — complete access */}
      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Your complete access</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            · <span className="text-foreground">MVP App Builder</span> — included with VIP; access
            arrives within 24 hours.
          </li>
          <li>
            · <span className="text-foreground">AI Business GPS</span> — included with VIP; access
            arrives within 24 hours.
          </li>
          <li>
            · <span className="text-foreground">Internal Agent Builder Skill</span> — included with
            VIP; access arrives within 24 hours.
          </li>
          <li>
            · <span className="text-foreground">NuAmenti 3 Gold access — 30 days</span> — included
            with Emerald; access begins August 10.
          </li>
          <li>
            · <span className="text-foreground">Full NuAmenti 3 Day recording</span> — included with
            Emerald; delivery details arrive by email.
          </li>
        </ul>
      </section>

      {/* Section B — Emerald-only Day 3 */}
      <section className="mt-8 rounded-lg border-2 border-[color:var(--gold)] bg-[color:var(--surface)] p-6 shadow-[0_0_40px_rgba(212,175,55,0.15)] sm:p-8">
        <p
          className="font-mono text-xs uppercase tracking-[0.2em]"
          style={{ color: "var(--gold)" }}
        >
          Emerald-only access
        </p>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl" style={{ color: "var(--gold)" }}>
          SECRET DAY 3 · VAULT OPENER CLASS WITH SPIN
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This is the Emerald difference: two more live hours with me. We open the Vault, connect
          the system to your business, and work through your implementation questions together. Your
          private date, time, and room link arrive by email and text after your purchase is
          verified.
        </p>
        <div className="mt-5">
          <a
            href="/calendar/vault-with-spin.ics"
            className="inline-flex items-center rounded-md border border-[color:var(--gold)] px-5 py-2.5 font-heading text-sm font-semibold hover:opacity-90"
            style={{ color: "var(--gold)" }}
          >
            Add to my calendar
          </a>
        </div>
      </section>

      {/* Section C — Strategy & Build Intensive */}
      <section className="mt-8 surface p-6">
        <p className="eyebrow">Optional next step</p>
        <h2 className="mt-2 font-display text-2xl text-foreground">
          Private Strategy &amp; Build Intensive — $1,000
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Two hours, private, one bottleneck, one working asset.
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-[color:var(--emerald-signal)]">
          {seatLine}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Your $1,000 credits toward the AI AutoPilot Accelerator.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {intensiveUrl ? (
            <a
              href={intensiveUrl}
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Claim my Intensive seat
            </a>
          ) : (
            <button
              disabled
              className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-2.5 font-heading text-sm font-semibold text-muted-foreground"
            >
              Booking opens soon
            </button>
          )}
          <Link
            to="/welcome"
            className="inline-flex items-center rounded-md border border-border px-5 py-2.5 font-heading text-sm text-foreground hover:bg-muted"
          >
            No thanks — take me to my resources
          </Link>
        </div>
      </section>

      {/* Section D — What happens next */}
      <section className="mt-8 rounded-md border border-[color:var(--emerald-signal)]/40 bg-[color:var(--surface)] p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">What happens next</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You're in. AI AutoPilot 2-Day Summit, August 29–30, 1:00–4:00 PM ET both days. Room opens
          at 12:45.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your access link and calendar invite arrive within 24 hours.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions:{" "}
          <a className="text-foreground underline" href="mailto:Sebastian@spincityhq.com">
            Sebastian@spincityhq.com
          </a>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Add Day 1 to calendar
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Add Day 2 to calendar
          </a>
        </div>
      </section>

      <AuditCallout />
    </>
  );
}
