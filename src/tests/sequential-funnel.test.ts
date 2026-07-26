import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const checkout = readFileSync("src/routes/checkout.tsx", "utf8");
const vipUpgrade = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const vault = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const intensive = readFileSync("src/routes/strategy-intensive.tsx", "utf8");

describe("checkout exposes only General Admission", () => {
  it("does not render a tier selector", () => {
    expect(checkout.includes('name="tier"')).toBe(false);
    expect(checkout.match(/TIERS\.map/)).toBeNull();
  });

  it("does not display any deeper price on the checkout page", () => {
    for (const price of ["$77", "$199", "$1,000", "$1000", "$55"]) {
      expect(checkout.includes(price)).toBe(false);
    }
  });

  it("hard-codes GA and ignores legacy tier search values", () => {
    expect(checkout.includes("TIER_MAP.ga")).toBe(true);
    expect(checkout.includes('resolveCheckoutUrl("ga"')).toBe(true);
    expect(checkout.includes('isHandoffAllowed("ga"')).toBe(true);
    expect(checkout.match(/TIER_MAP\[[^\]]*(search|tier)[^\]]*\]/)).toBeNull();
  });
});

describe("private-page pricing visibility", () => {
  it("VIP page renders the VIP upgrade price and is noindex", () => {
    expect(vipUpgrade.includes("UPSELLS.vip_upgrade")).toBe(true);
    expect(vipUpgrade.includes("formatUsd")).toBe(true);
    for (const price of ["$22", "$199", "$1,000", "$55"]) {
      expect(vipUpgrade.includes(price)).toBe(false);
    }
    expect(vipUpgrade.includes('name: "robots", content: "noindex"')).toBe(true);
  });

  it("Vault page renders the Vault price and is noindex", () => {
    expect(vault.includes("UPSELLS.vault")).toBe(true);
    expect(vault.includes("formatUsd")).toBe(true);
    for (const price of ["$22", "$77", "$1,000"]) {
      expect(vault.includes(price)).toBe(false);
    }
    expect(vault.includes('name: "robots", content: "noindex"')).toBe(true);
  });

  it("Intensive page renders the Intensive price and is noindex", () => {
    expect(intensive.includes("UPSELLS.intensive")).toBe(true);
    expect(intensive.includes("formatUsd")).toBe(true);
    for (const price of ["$22", "$77", "$199"]) {
      expect(intensive.includes(price)).toBe(false);
    }
    expect(intensive.includes('name: "robots", content: "noindex"')).toBe(true);
  });
});

describe("declines go to /next-steps", () => {
  it("VIP decline routes to /next-steps", () => {
    expect(vipUpgrade.includes('to="/next-steps"')).toBe(true);
  });

  it("Vault decline routes to /next-steps", () => {
    expect(vault.includes('to="/next-steps"')).toBe(true);
  });

  it("Intensive decline routes to /next-steps", () => {
    expect(intensive.includes('to="/next-steps"')).toBe(true);
  });
});
