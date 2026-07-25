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

const product = "vip_upgrade" as const;

export const Route = createFileRoute("/offer/vip-upgrade")({
  head: () => ({
    meta: [
      { title: "VIP Implementation Experience · AI AutoPilot Summit" },
      {
        name: "description",
        content:
          "For verified GA registrants: the VIP Implementation Experience adds 30-day recordings, one live VIP Implementation Lab, priority Q&A, and the outreach vault.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "VIP Implementation Experience · AI AutoPilot Summit" },
      {
        property: "og:description",
        content:
          "Add recordings, the VIP Implementation Lab, priority Q&A, and the outreach vault.",
      },
      { property: "og:url", content: "/offer/vip-upgrade" },
    ],
    links: [{ rel: "canonical", href: "/offer/vip-upgrade" }],
  }),
  component: VipUpgradeOffer,
});

function VipUpgradeOffer() {
  const cfg = getCommasConfig();
  const upgrade = UPSELLS.vip_upgrade;
  const url = resolveCheckoutUrl(product, cfg);
  const salesOn = isHandoffAllowed(product, cfg);
  const summary = useEntitlementSummary();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Only for verified GA registrants</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        {upgrade.name} — {formatUsd(upgrade.priceCents)}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Eligibility is checked from your verified access session — not from
        this URL. Open the secure upgrade link inside your NuAmenti access
        email if you don't see checkout below.
      </p>

      <VideoSlot url={cfg.sectionVideos.hero ?? null} label="VIP experience preview" className="mt-8" />

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">
          What you already have vs. what this adds
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono">You already have (GA)</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Live online access · Aug 24 + Aug 25</li>
              <li>· Digital Summit Action Guide</li>
              <li>· AI Readiness Scorecard</li>
              <li>· Buyer + Offer Canvas</li>
            </ul>
          </div>
          <div>
            <p className="label-mono text-[color:var(--gold)]">VIP adds</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· 30-day session recordings</li>
              <li>· One live VIP Implementation Lab</li>
              <li>· Priority Q&A submission</li>
              <li>· VIP Proposal + Outreach Kit</li>
              <li>· VIP Resource Vault</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          This is additive. Your GA ticket remains valid whether you add VIP or not.
        </p>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">{upgrade.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{upgrade.summary}</p>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {upgrade.bullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
        <div className="mt-6">
          <UpgradeCta salesOn={salesOn} url={url} summary={summary} price={upgrade.priceCents} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Fulfillment requires a verified GA registration on the same email.
          Without a matching GA record we cannot grant VIP. Please pay with
          the same email you used for GA, or write Info@NuAmenti.com before
          paying if you need to change the email on your ticket.
        </p>
      </section>

      <TestimonialSection
        page="vip_upgrade"
        eyebrow="From VIP registrants"
        heading="What deeper implementation looked like"
      />

      <p className="mt-6 text-xs text-muted-foreground">
        <Link to="/next-steps" className="underline">
          No thanks — continue with GA →
        </Link>
      </p>
    </main>
  );
}

function UpgradeCta({
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
      <SecureLinkNotice message="To upgrade to VIP, open the secure upgrade link in your NuAmenti access email — verified sign-in is required. Not signed in? Reply to Info@NuAmenti.com and we'll resend it." />
    );
  }
  const { hasGa, hasVip } = derivedAccess(summary.scopes);
  if (hasVip) {
    return (
      <AlreadyOwned message="You already have VIP. Your NuAmenti access email is the source of truth for VIP resources and the Implementation Lab invite." />
    );
  }
  if (!hasGa) {
    return (
      <SecureLinkNotice message="This upgrade is only available to verified GA registrants. If you already bought GA, open the secure upgrade link in your NuAmenti access email — signed in on the same browser." />
    );
  }
  if (!salesOn || !url) return <DisabledBtn label="VIP upgrade opening soon" />;
  return (
    <a
      href={url}
      className="inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
      rel="noopener noreferrer"
    >
      Upgrade to VIP · {formatUsd(price)}
    </a>
  );
}

function DisabledBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center rounded-md bg-muted px-5 py-3 font-heading text-sm font-semibold text-muted-foreground"
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
