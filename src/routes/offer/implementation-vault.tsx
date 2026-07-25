import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoSlot } from "@/components/VideoSlot";
import { UPSELLS, formatUsd } from "@/lib/tiers";
import {
  getCommasConfig,
  resolveCheckoutUrl,
  isHandoffAllowed,
} from "@/lib/challenge-config";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";
import { TestimonialSection } from "@/components/TestimonialSection";

export const Route = createFileRoute("/offer/implementation-vault")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot Implementation Vault" },
      {
        name: "description",
        content:
          "Optional Vault add-on for verified VIP registrants. Independent scope; does not include Summit admission or recordings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "AI AutoPilot Implementation Vault" },
      {
        property: "og:description",
        content:
          "Optional Vault add-on. Independent from admission. Purchased separately, unlocked separately.",
      },
      { property: "og:url", content: "/offer/implementation-vault" },
    ],
    links: [{ rel: "canonical", href: "/offer/implementation-vault" }],
  }),
  component: ImplementationVaultOffer,
});

function ImplementationVaultOffer() {
  const v = UPSELLS.vault;
  const cfg = getCommasConfig();
  const url = resolveCheckoutUrl("vault", cfg);
  const salesOn = isHandoffAllowed("vault", cfg);
  const summary = useEntitlementSummary();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Post-VIP add-on</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {v.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The Vault is an independent library. It does NOT include Summit
        admission, GA or VIP benefits, or session recordings — it grants only
        the Vault items listed below. Your Summit ticket stays valid whether
        you add the Vault or not.
      </p>

      <div className="mt-6 font-display text-4xl text-[color:var(--gold)]">
        {formatUsd(v.priceCents)}
      </div>
      <p className="mt-4 text-muted-foreground">{v.summary}</p>

      <VideoSlot url={cfg.sectionVideos.hero ?? null} label="Vault walkthrough" className="mt-8" />

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          What you already have vs. what the Vault adds
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have (VIP)</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Both live Summit days</li>
              <li>· 30-day session recordings</li>
              <li>· VIP Implementation Lab + priority Q&A</li>
              <li>· VIP Proposal + Outreach Kit</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">The Vault adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {v.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The Vault does not include admission or recordings.
        </p>
      </section>

      <div className="mt-8">
        <VaultCta salesOn={salesOn} url={url} summary={summary} price={v.priceCents} />
      </div>

      <div className="mt-6">
        <Link
          to="/next-steps"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          No thanks — continue to next steps →
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Declining the Vault does not affect your Summit ticket. Every
        affiliate/tool link inside the Vault carries a clear disclosure.
      </p>

      <TestimonialSection
        page="vault"
        eyebrow="From Vault users"
        heading="What people built with the Vault"
      />
    </main>
  );
}

function VaultCta({
  salesOn,
  url,
  summary,
  price,
}: {
  salesOn: boolean;
  url: string | null;
  summary: ReturnType<typeof useEntitlementSummary>;
  price: number;
}) {
  if (summary.status === "loading") {
    return <DisabledBtn label="Checking your eligibility…" />;
  }
  if (summary.status === "unauthenticated" || summary.status === "error") {
    return (
      <SecureLinkNotice message="The Vault is available to verified VIP registrants. Open the secure Vault link in your NuAmenti access email — verified sign-in is required." />
    );
  }
  const { hasVip, hasVault } = derivedAccess(summary.scopes);
  if (hasVault) {
    return (
      <AlreadyOwned message="You already have the Implementation Vault. Access it from the secure link in your NuAmenti access email." />
    );
  }
  if (!hasVip) {
    return (
      <SecureLinkNotice message="The Vault is offered to verified VIP registrants. Add the VIP Implementation Experience first, then return here." />
    );
  }
  if (!salesOn || !url) return <DisabledBtn label="Vault opening soon" />;
  return (
    <a
      href={url}
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90"
      rel="noopener noreferrer"
    >
      Add the Vault — {formatUsd(price)}
    </a>
  );
}

function DisabledBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-3 font-heading text-base font-semibold text-muted-foreground"
    >
      {label}
    </button>
  );
}

function AlreadyOwned({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[color:var(--emerald-signal)]/40 bg-secondary/40 p-4 text-sm text-foreground">
      <p className="font-heading">You already have this.</p>
      <p className="mt-2 text-muted-foreground">{message}</p>
    </div>
  );
}

function SecureLinkNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
