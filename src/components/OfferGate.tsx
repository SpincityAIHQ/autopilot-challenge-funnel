import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  useEntitlementSummary,
  derivedAccess,
} from "@/hooks/use-entitlement-summary";

/**
 * OfferGate — full-page content gate for sequential-ascension offer pages.
 *
 * Anonymous and ineligible visitors NEVER see the offer name, price,
 * benefits, video, testimonials, or offer-specific metadata. Instead they
 * see a warm "verified access required" state that points them back to
 * the secure link inside their NuAmenti access email.
 *
 * `predicate` receives derived access booleans and returns true only when
 * the visitor holds the required prior scope (e.g. GA for VIP-upgrade,
 * VIP for Vault, Vault/eligibility for Intensive).
 */
export function OfferGate({
  eligibleMessage,
  ineligibleMessage,
  predicate,
  children,
}: {
  eligibleMessage?: string;
  ineligibleMessage: string;
  predicate: (a: ReturnType<typeof derivedAccess>) => boolean;
  children: ReactNode;
}) {
  const summary = useEntitlementSummary();

  if (summary.status === "loading") {
    return <PendingPanel label="Verifying your access…" />;
  }
  if (summary.status === "unauthenticated" || summary.status === "error") {
    return (
      <SecureLinkPanel
        message="This next step is only available to verified Summit registrants. Open the secure link in your NuAmenti access email — verified sign-in is required. If you can't find it, write Info@NuAmenti.com."
      />
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
  return (
    <section className="mt-10 surface p-6 text-sm text-muted-foreground">
      {label}
    </section>
  );
}

function SecureLinkPanel({ message }: { message: string }) {
  return (
    <section className="mt-10 surface-raised p-6">
      <p className="eyebrow">Verified access required</p>
      <h2 className="mt-3 font-heading text-lg text-foreground">
        Your next step is inside your NuAmenti access email.
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/next-steps"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          See secure next-steps
        </Link>
        <a
          href="mailto:Info@NuAmenti.com"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Email Info@NuAmenti.com
        </a>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        A plain FanBasis redirect is not authentication. Only the secure
        link in your NuAmenti access email establishes a verified session.
      </p>
    </section>
  );
}
