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

export const Route = createFileRoute("/offer/implementation-vault")({
  head: () => ({
    meta: [
      { title: "AI AutoPilot Implementation Vault — $199 add-on" },
      {
        name: "description",
        content:
          "Optional Vault add-on for verified Summit registrants. Independent scope; does not include Summit admission or recordings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "AI AutoPilot Implementation Vault — $199" },
      {
        property: "og:description",
        content:
          "Optional Vault add-on. Independent from GA/VIP. Purchased separately, unlocked separately.",
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
      <p className="eyebrow">Post-registration add-on</p>
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

      <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {v.bullets.map((b) => (
          <li key={b}>· {b}</li>
        ))}
      </ul>

      <div className="mt-8">
        <VaultCta salesOn={salesOn} url={url} summary={summary} price={v.priceCents} />
      </div>

      <div className="mt-6">
        <Link
          to="/next-keynote"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          No thanks — take me to the next keynote →
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Declining the Vault does not affect your Summit ticket. Every
        affiliate/tool link inside the Vault carries a clear disclosure.
      </p>
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
      <SecureLinkNotice message="The Vault is available to verified Summit registrants. Open the secure Vault link in your NuAmenti access email — verified sign-in is required." />
    );
  }
  const { hasGa, hasVault } = derivedAccess(summary.scopes);
  if (hasVault) {
    return (
      <AlreadyOwned message="You already have the Implementation Vault. Access it from the secure link in your NuAmenti access email." />
    );
  }
  if (!hasGa) {
    return (
      <SecureLinkNotice message="The Vault is only sold to verified GA or VIP registrants. If you already registered, open the secure Vault link in your NuAmenti access email." />
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
