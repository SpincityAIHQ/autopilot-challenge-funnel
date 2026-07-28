import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useEntitlementSummary, derivedAccess } from "@/hooks/use-entitlement-summary";

/**
 * Keeps each paid offer private until the secure session proves the buyer owns
 * the step before it. A page URL alone never reveals the price or offer.
 */
export function OfferGate({
  eligibleMessage,
  ineligibleMessage,
  predicate,
  children,
}: {
  eligibleMessage?: string;
  ineligibleMessage: string;
  predicate: (access: ReturnType<typeof derivedAccess>) => boolean;
  children: ReactNode;
}) {
  const summary = useEntitlementSummary();

  if (summary.status === "loading") {
    return <PendingPanel label="Checking your access…" />;
  }

  if (summary.status === "unauthenticated" || summary.status === "error") {
    return (
      <SecureLinkPanel message="This page is only for confirmed Summit buyers. Open the secure link in your NuAmenti email. If you cannot find it, email Sebastian@spincityhq.com." />
    );
  }

  const access = derivedAccess(summary.scopes);
  if (!predicate(access)) {
    return <SecureLinkPanel message={ineligibleMessage} />;
  }

  return (
    <>
      {eligibleMessage ? (
        <p className="mt-6 text-xs text-muted-foreground">{eligibleMessage}</p>
      ) : null}
      {children}
    </>
  );
}

function PendingPanel({ label }: { label: string }) {
  return <section className="mt-10 surface p-6 text-sm text-muted-foreground">{label}</section>;
}

function SecureLinkPanel({ message }: { message: string }) {
  return (
    <section className="mt-10 surface-raised p-6">
      <p className="eyebrow">Secure access required</p>
      <h2 className="mt-3 font-heading text-lg text-foreground">
        Open the link in your NuAmenti email
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/next-steps"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          See your next steps
        </Link>
        <a
          href="mailto:Sebastian@spincityhq.com"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Email Sebastian@spincityhq.com
        </a>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Your private NuAmenti email link confirms which resources you can open.
      </p>
    </section>
  );
}
