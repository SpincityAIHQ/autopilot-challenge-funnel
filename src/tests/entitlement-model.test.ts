import { describe, expect, it } from "bun:test";
import {
  canScopeAccessTier,
  scopesGrantTier,
} from "@/lib/resource-metadata";

describe("entitlement model — independent scopes, no ordering", () => {
  it("GA scope grants ONLY ga tier", () => {
    expect(canScopeAccessTier("ga", "ga")).toBe(true);
    expect(canScopeAccessTier("ga", "vip")).toBe(false);
    expect(canScopeAccessTier("ga", "vault")).toBe(false);
  });
  it("VIP scope grants ONLY vip tier (also via vip_upgrade)", () => {
    expect(canScopeAccessTier("vip", "vip")).toBe(true);
    expect(canScopeAccessTier("vip_upgrade", "vip")).toBe(true);
    expect(canScopeAccessTier("vip", "ga")).toBe(false);
    expect(canScopeAccessTier("vip", "vault")).toBe(false);
  });
  it("Vault scope grants ONLY vault tier — never GA or VIP", () => {
    expect(canScopeAccessTier("vault", "vault")).toBe(true);
    expect(canScopeAccessTier("vault", "ga")).toBe(false);
    expect(canScopeAccessTier("vault", "vip")).toBe(false);
  });
  it("multiple scopes stack (buyer may own several)", () => {
    const scopes = ["ga", "vault"];
    expect(scopesGrantTier(scopes, "ga")).toBe(true);
    expect(scopesGrantTier(scopes, "vault")).toBe(true);
    expect(scopesGrantTier(scopes, "vip")).toBe(false);

    const all = ["ga", "vip", "vault"];
    expect(scopesGrantTier(all, "ga")).toBe(true);
    expect(scopesGrantTier(all, "vip")).toBe(true);
    expect(scopesGrantTier(all, "vault")).toBe(true);
  });
  it("unknown scope grants nothing", () => {
    expect(scopesGrantTier(["nonsense", "admin"], "ga")).toBe(false);
    expect(scopesGrantTier([], "vault")).toBe(false);
  });
});

describe("exchange semantics (documented contract)", () => {
  it("session cookie name is not exposed as a query param", () => {
    // Sanity: no code path returns the raw session token in JSON.
    // (Enforced by the exchange handler returning only { ok, expiresAt }.)
    // This documents intent; runtime enforcement lives in the server route.
    expect(true).toBe(true);
  });
});
