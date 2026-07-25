import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  canScopeAccessTier,
  scopesGrantTier,
} from "@/lib/resource-metadata";

/**
 * Product rule (NOT a tier ordering):
 *  - GA         → GA
 *  - VIP        → GA + VIP     (GA is bundled inside VIP admission)
 *  - vip_upgrade→ GA + VIP     (same as VIP)
 *  - Vault      → Vault only   (independent, never inherits GA/VIP)
 */
describe("entitlement matrix — six-combination product rule", () => {
  const scopes = ["ga", "vip", "vip_upgrade", "vault"] as const;
  const tiers = ["ga", "vip", "vault"] as const;
  // Expected access [scope][tier]
  const expected: Record<string, Record<string, boolean>> = {
    ga: { ga: true, vip: false, vault: false },
    vip: { ga: true, vip: true, vault: false },
    vip_upgrade: { ga: true, vip: true, vault: false },
    vault: { ga: false, vip: false, vault: true },
  };
  for (const scope of scopes) {
    for (const tier of tiers) {
      it(`scope=${scope} → tier=${tier} = ${expected[scope][tier]}`, () => {
        expect(canScopeAccessTier(scope, tier)).toBe(expected[scope][tier]);
      });
    }
  }
});

describe("scopesGrantTier — union of held scopes", () => {
  it("GA-only buyer sees GA, not VIP or Vault", () => {
    expect(scopesGrantTier(["ga"], "ga")).toBe(true);
    expect(scopesGrantTier(["ga"], "vip")).toBe(false);
    expect(scopesGrantTier(["ga"], "vault")).toBe(false);
  });
  it("Direct VIP buyer sees GA and VIP, never Vault", () => {
    expect(scopesGrantTier(["vip"], "ga")).toBe(true);
    expect(scopesGrantTier(["vip"], "vip")).toBe(true);
    expect(scopesGrantTier(["vip"], "vault")).toBe(false);
  });
  it("GA + vault buyer sees GA and Vault, not VIP", () => {
    expect(scopesGrantTier(["ga", "vault"], "ga")).toBe(true);
    expect(scopesGrantTier(["ga", "vault"], "vault")).toBe(true);
    expect(scopesGrantTier(["ga", "vault"], "vip")).toBe(false);
  });
  it("Vault-only buyer never sees GA or VIP", () => {
    expect(scopesGrantTier(["vault"], "ga")).toBe(false);
    expect(scopesGrantTier(["vault"], "vip")).toBe(false);
    expect(scopesGrantTier(["vault"], "vault")).toBe(true);
  });
  it("Empty / unknown scopes grant nothing", () => {
    expect(scopesGrantTier([], "ga")).toBe(false);
    expect(scopesGrantTier(["nonsense"], "vault")).toBe(false);
  });
});

/**
 * Exchange handler contract — enforced by static assertions on the source.
 * The raw session token must NEVER leave the server in JSON; it MUST be
 * set as HttpOnly; Secure; SameSite=Lax cookie only.
 */
describe("resource exchange handler — cookie flags + non-disclosure", () => {
  const exchangeSrc = readFileSync(
    "src/routes/api/public/resources/exchange.ts",
    "utf8",
  );
  it("sets HttpOnly session cookie", () => {
    expect(/HttpOnly/i.test(exchangeSrc)).toBe(true);
  });
  it("sets Secure flag on session cookie", () => {
    expect(/Secure/.test(exchangeSrc)).toBe(true);
  });
  it("sets SameSite=Lax", () => {
    expect(/SameSite=Lax/i.test(exchangeSrc)).toBe(true);
  });
  it("does not return the raw session token in the JSON response body", () => {
    // Response body should only contain { ok, expiresAt }.
    expect(exchangeSrc).not.toMatch(/sessionToken\s*[:,]/);
    expect(/JSON\.stringify\(\s*\{\s*ok:\s*true,\s*expiresAt/i.test(exchangeSrc)).toBe(true);
  });
  it("uses no-store cache control on protected /read", () => {
    const readSrc = readFileSync(
      "src/routes/api/public/resources/read.ts",
      "utf8",
    );
    expect(/private,\s*no-store/i.test(readSrc)).toBe(true);
  });
});
