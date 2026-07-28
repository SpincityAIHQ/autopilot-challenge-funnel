import { createFileRoute, Link } from "@tanstack/react-router";
import { AuditCallout } from "@/components/AuditCallout";
import { getCommasConfig } from "@/lib/challenge-config";

import { ProductThankYou } from "@/components/ProductThankYou";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { useEntitlementSummary, derivedAccess } from "@/hooks/use-entitlement-summary";

export const Route = createFileRoute("/next-steps")({
  head: () => ({
    meta: [
      { title: "Your Next Steps — AI AutoPilot 2-Day Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Your confirmed Summit access, calendar links, inbox instructions, resources, and preparation steps for August 29–30.",
      },
      {
        property: "og:title",
        content: "Your next steps — AI AutoPilot 2-Day Summit",
      },
      {
        property: "og:description",
        content: "Everything you need to prepare for August 29–30.",
      },
    ],
    links: [{ rel: "canonical", href: "/next-steps" }],
  }),
  component: NextSteps,
});

type ConfirmedLevel = "ga" | "vip" | "vault" | "intensive";

interface ExitConfirmation {
  level: ConfirmedLevel;
  videoUrl?: string;
  videoLabel: string;
  envKey: string;
  eyebrow: string;
  headline: string;
  body: string;
}

function NextSteps() {
  const cfg = getCommasConfig();
  const summary = useEntitlementSummary();
  const access = summary.status === "ok" ? derivedAccess(summary.scopes) : null;
  const confirmation = access ? getExitConfirmation(access, cfg) : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">You're all set</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        Your confirmation and next steps
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your current purchase is safe. Save the dates, watch for your NuAmenti email, and gather the
        business information you will bring to Day 1.
      </p>

      {confirmation ? (
        <>
          <FunnelVideoSlot
            url={confirmation.videoUrl}
            label={confirmation.videoLabel}
            envKey={confirmation.envKey}
            className="mt-8"
          />

          <ProductThankYou
            verified={true}
            eyebrow={confirmation.eyebrow}
            headline={confirmation.headline}
            body={confirmation.body}
            videoUrl={null}
            videoLabel={confirmation.videoLabel}
          />
        </>
      ) : (
        <VerificationNotice status={summary.status} />
      )}

      <AuditCallout />

      <section className="mt-10 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Save the dates</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both Summit days run from 1:00–4:00 PM Eastern. The room opens at 12:45 PM Eastern.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/calendar/day1.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 1 — Sat Aug 29 · 1–4 PM ET
          </a>
          <a
            href="/calendar/day2.ics"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2.5 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Day 2 — Sun Aug 30 · 1–4 PM ET
          </a>
        </div>
        {access?.hasVip ? (
          <div className="mt-5 rounded-md border border-[color:var(--emerald-signal)]/40 bg-secondary/30 p-4">
            <p className="label-mono">VIP Build Lab</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sunday, August 30 · 4:15–5:45 PM Eastern. It begins 15 minutes after Day 2 ends, while
              the work is still fresh. Stay in the room or use the private VIP link in your email.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Watch your inbox</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· Keep every SpincityHQ order confirmation connected to your purchases.</li>
          <li>
            · Look for the NuAmenti welcome email from{" "}
            <span className="text-foreground">Info@NuAmenti.com</span>.
          </li>
          <li>· Check Promotions and Spam if you do not see it.</li>
          <li>· Your emails and resources will match the highest ticket level you purchased.</li>
          <li>· If you joined text updates, reply HELP for help or STOP to leave.</li>
        </ul>
      </section>

      <section className="mt-8 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">Your secure resources</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your NuAmenti email contains a private access link. That link opens only the Summit
          resources tied to the purchases confirmed for your email address. Do not share it.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Missing your link? Email <span className="text-foreground">Info@NuAmenti.com</span> from
          the same address you used to buy.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Change your email, text, or call choices on the{" "}
          <Link to="/communication-preferences" className="underline">
            communication preferences page
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 surface p-6">
        <h2 className="font-heading text-lg text-foreground">Bring this to Day 1</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>· One business, skill, offer, or clear idea.</li>
          <li>· A list of the tasks that take too much time.</li>
          <li>· Your current prices, goals, and basic numbers.</li>
          <li>· A laptop and focused time on both days.</li>
          <li>· Your logo and brand files if you have them.</li>
          <li>· Never share passwords or private client data in group chats.</li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/resources"
          className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
        >
          Browse resource hub
        </Link>
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
        >
          ← Back to the Summit
        </Link>
      </div>
    </main>
  );
}

function getExitConfirmation(
  access: ReturnType<typeof derivedAccess>,
  cfg: ReturnType<typeof getCommasConfig>,
): ExitConfirmation | null {
  if (access.hasIntensive) {
    return {
      level: "intensive",
      videoUrl: cfg.sectionVideos.exitIntensive,
      videoLabel: "Your full-path confirmation and next steps",
      envKey: "VITE_SUMMIT_VIDEO_EXIT_INTENSIVE",
      eyebrow: "Verified · Full Summit Path + Strategy & Build Intensive",
      headline: "Thank you, family — your private Strategy & Build Intensive is confirmed.",
      body: "You have the full Summit path, including the live sessions on August 29–30, the VIP builder toolkit, the Emerald Vault Key with the Secret Day 3 Vault Opener Class, and your private session. Our team will email you from Info@NuAmenti.com with the scheduling link.",
    };
  }

  if (access.hasVault) {
    return {
      level: "vault",
      videoUrl: cfg.sectionVideos.exitVault,
      videoLabel: "Your Emerald confirmation and next steps",
      envKey: "VITE_SUMMIT_VIDEO_EXIT_VAULT",
      eyebrow: "Verified · Emerald Vault Key",
      headline: "Thank you, family — your Summit, VIP, and Emerald Vault Key access are confirmed.",
      body: "You are all set for the live Summit, the VIP builder toolkit, and the Secret Day 3 Vault Opener Class with Spin. Your private Emerald room details arrive by email and text.",
    };
  }

  if (access.hasVip) {
    return {
      level: "vip",
      videoUrl: cfg.sectionVideos.exitVip,
      videoLabel: "Your VIP confirmation and next steps",
      envKey: "VITE_SUMMIT_VIDEO_EXIT_VIP",
      eyebrow: "Verified · VIP Implementation Experience",
      headline: "Thank you, family — your General Admission and VIP access are confirmed.",
      body: "You are all set for the live Summit, 30-day recordings, the VIP Build Lab, the MVP App Builder, AI Business GPS, and Internal Agent Builder Skill.",
    };
  }

  if (access.hasGa) {
    return {
      level: "ga",
      videoUrl: cfg.sectionVideos.exitGa,
      videoLabel: "Your General Admission confirmation and next steps",
      envKey: "VITE_SUMMIT_VIDEO_EXIT_GA",
      eyebrow: "Verified · General Admission",
      headline: "Thank you, family — your General Admission seat is confirmed.",
      body: "You are all set for Saturday, August 29 and Sunday, August 30 from 1:00–4:00 PM Eastern. The room opens at 12:45 PM both days. Your ticket stays complete even when you pass on every optional upgrade.",
    };
  }

  return null;
}

function VerificationNotice({
  status,
}: {
  status: ReturnType<typeof useEntitlementSummary>["status"];
}) {
  const loading = status === "loading";
  return (
    <section className="mt-8 rounded-md border border-[color:var(--gold)]/60 bg-[color:var(--surface)] p-6">
      <p className="eyebrow">{loading ? "Checking your access" : "Secure confirmation needed"}</p>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        {loading
          ? "We are loading your exact ticket confirmation."
          : "Your purchase is safe. Open the secure link in your NuAmenti email."}
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {loading
          ? "This normally takes only a moment."
          : "That link confirms your email in this browser so this page can show the exact ticket, upgrades, and resources you own."}
      </p>
    </section>
  );
}
