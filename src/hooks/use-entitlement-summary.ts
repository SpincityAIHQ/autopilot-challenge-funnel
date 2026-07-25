import { useEffect, useState } from "react";

export type EntitlementSummary =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "ok"; scopes: string[] }
  | { status: "error" };

/**
 * Fetches the same-origin entitlement summary from the current resource
 * session cookie. Fails closed — treats any error/loading state as
 * "cannot confirm ownership", which callers must translate to "show the
 * verified-access message" rather than "enable checkout".
 */
export function useEntitlementSummary(): EntitlementSummary {
  const [state, setState] = useState<EntitlementSummary>({ status: "loading" });

  useEffect(() => {
    let alive = true;
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
        };
        if (!alive) return;
        if (!j.authenticated) {
          setState({ status: "unauthenticated" });
          return;
        }
        const scopes = Array.isArray(j.scopes)
          ? j.scopes.filter((s): s is string => typeof s === "string")
          : [];
        setState({ status: "ok", scopes });
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
} {
  const s = new Set(scopes);
  const hasVip = s.has("vip") || s.has("vip_upgrade");
  return {
    // VIP inherits GA per the entitlement matrix.
    hasGa: s.has("ga") || hasVip,
    hasVip,
    hasVault: s.has("vault"),
    hasIntensive: s.has("intensive"),
  };
}
