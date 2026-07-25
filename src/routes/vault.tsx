import { createFileRoute, Link } from "@tanstack/react-router";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot Implementation Vault — $199 add-on" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Optional Vault add-on for Summit registrants — the full implementation stack.",
      },
    ],
  }),
  component: Vault,
});

function Vault() {
  const v = UPSELLS.vault;
  const cfg = getCommasConfig();
  const url = resolveCheckoutUrl("vault", cfg);
  const canSubmit = isHandoffAllowed("vault", cfg);
  const label = canSubmit
    ? `Add the Vault — ${formatUsd(v.priceCents)}`
    : "Vault opening soon";

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Post-registration add-on</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {v.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admission (GA or VIP) is purchased separately. The Vault does not
        upgrade your ticket automatically.
      </p>
      <div className="mt-6 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(v.priceCents)}
      </div>
      <p className="mt-4 text-muted-foreground">{v.summary}</p>
      <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {v.bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (canSubmit && url) window.location.href = url;
          }}
          className={`inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground transition ${
            canSubmit ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
          }`}
        >
          {label}
        </button>
        <Link
          to="/keynote"
          className="inline-flex items-center rounded-md border border-border px-5 py-3 text-base text-foreground hover:bg-secondary"
        >
          No thanks — take me to the next keynote
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Every affiliate/tool link inside the Vault carries a clear disclosure.
        We never invent partner URLs.
      </p>
    </main>
  );
}
