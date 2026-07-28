import { useEffect, useState } from "react";
import { getQaReviewScopes } from "@/lib/qa-review";

export type EntitlementSummary =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "ok"; scopes: string[]; email: string | null }
  | { status: "error" };


/**
 * Fetches the same-origin entitlement summary from the current resource
 * session cookie. Fails closed — treats any error/loading state as
 * "cannot confirm ownership", which callers must translate to "show the
 * verified-access message" rather than "enable checkout".
 *
 * On the Lovable id-preview host (or when the explicit QA env flag is on),
 * the owner may select a browser-only review stage. That stage bypasses this
 * GET only for client-side presentation so the gated copy can be inspected.
 * It never creates a server session, entitlement, purchase, registration, or
 * active checkout.
 */
export function useEntitlementSummary(): EntitlementSummary {
  const [state, setState] = useState<EntitlementSummary>({ status: "loading" });

  useEffect(() => {
    let alive = true;

    const qaScopes = getQaReviewScopes();
    if (qaScopes !== null) {
      setState({ status: "ok", scopes: qaScopes, email: null });
      return () => {
        alive = false;
      };
    }


    (async () => {
      try {
        const res = await fetch("/api/public/resources/entitlement-summary", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!alive) return;
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const j = (await res.json()) as {
          authenticated: boolean;
          scopes?: unknown;
          email?: unknown;
        };
        if (!alive) return;
        if (!j.authenticated) {
          setState({ status: "unauthenticated" });
          return;
        }
        const scopes = Array.isArray(j.scopes)
          ? j.scopes.filter((s): s is string => typeof s === "string")
          : [];
        const email = typeof j.email === "string" ? j.email : null;
        setState({ status: "ok", scopes, email });

      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/** Union of scopes → concrete access booleans. */
export function derivedAccess(scopes: string[]): {
  hasGa: boolean;
  hasVip: boolean;
  hasVault: boolean;
  hasIntensive: boolean;
  hasIntensiveEligibility: boolean;
} {
  const s = new Set(scopes);
  const hasVip = s.has("vip") || s.has("vip_upgrade");
  return {
    // VIP inherits GA per the entitlement matrix.
    hasGa: s.has("ga") || hasVip,
    hasVip,
    hasVault: s.has("vault"),
    hasIntensive: s.has("intensive"),
    // Operator-approved eligibility for the $1,000 Intensive that does
    // NOT require a prior Vault purchase (e.g. NuAmenti attendees).
    hasIntensiveEligibility: s.has("intensive_eligibility"),
  };
}
