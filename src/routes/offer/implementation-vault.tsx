import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";

export const Route = createFileRoute("/offer/implementation-vault")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot Implementation Vault — $199 add-on" },
      {
        name: "description",
        content:
          "Optional Vault add-on for Summit registrants — the full implementation stack. Independent scope; does not upgrade GA to VIP.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "AI AutoPilot Implementation Vault — $199" },
      {
        property: "og:description",
        content:
          "Optional Vault add-on. Independent from GA/VIP. Purchased separately, unlocked separately.",
      },
    ],
    links: [{ rel: "canonical", href: "/offer/implementation-vault" }],
  }),
  component: ImplementationVaultOffer,
});

function ImplementationVaultOffer() {
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
        Your Summit ticket (GA or VIP) remains valid whether you add the Vault
        or not. The Vault does not include Summit admission, GA or VIP
        benefits, or session recordings — it grants only the Vault library
        listed below.
      </p>

      <div className="mt-6 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(v.priceCents)}
      </div>
      <p className="mt-4 text-muted-foreground">{v.summary}</p>

      <VideoSlot url={cfg.sectionVideos.hero ?? null} label="Vault walkthrough" className="mt-8" />

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
          to="/next-keynote"
          className="inline-flex items-center rounded-md border border-border px-5 py-3 text-base text-foreground hover:bg-secondary"
        >
          No thanks — take me to the next keynote
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Declining the Vault does not affect your Summit ticket. Every
        affiliate/tool link inside the Vault carries a clear disclosure.
      </p>
    </main>
  );
}
