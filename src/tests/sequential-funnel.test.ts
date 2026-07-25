import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const checkout = readFileSync("src/routes/checkout.tsx", "utf8");
const vipUpgrade = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const vault = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const intensive = readFileSync("src/routes/strategy-intensive.tsx", "utf8");

/**
 * Sequential funnel — pricing containment.
 *
 * Each downstream price string must appear ONLY on its own private,
 * noindex funnel page. Anything visible on /checkout beyond $22, or any
 * cross-linking of downstream prices, breaks the ascension model.
 */
describe("checkout exposes only General Admission ($22)", () => {
  it("does not render a tier selector", () => {
    // No radio group for tier selection on the checkout page.
    expect(checkout.includes('name="tier"')).toBe(false);
    // No mapping over TIERS to build tier cards.
    expect(checkout.match(/TIERS\.map/)).toBeNull();
  });
  it("does not display any deeper price on the checkout page", () => {
    for (const p of ["$77", "$199", "$1,000", "$1000", "$55"]) {
      expect(checkout.includes(p)).toBe(false);
    }
  });
});

describe("private-page pricing visibility", () => {
  it("VIP Implementation Experience page renders the vip_upgrade price and is noindex", () => {
    expect(vipUpgrade.includes("UPSELLS.vip_upgrade")).toBe(true);
    expect(vipUpgrade.includes("formatUsd")).toBe(true);
    // No stale/legacy literal prices leaked into copy.
    for (const p of ["$22", "$199", "$1,000", "$55"]) {
      expect(vipUpgrade.includes(p)).toBe(false);
    }
    expect(vipUpgrade.includes('name: "robots", content: "noindex"')).toBe(true);
  });

  it("Vault page renders the vault price and is noindex", () => {
    expect(vault.includes("UPSELLS.vault")).toBe(true);
    expect(vault.includes("formatUsd")).toBe(true);
    for (const p of ["$22", "$77", "$1,000"]) {
      expect(vault.includes(p)).toBe(false);
    }
    expect(vault.includes('name: "robots", content: "noindex"')).toBe(true);
  });

  it("Intensive page renders the intensive price and is noindex", () => {
    expect(intensive.includes("UPSELLS.intensive")).toBe(true);
    expect(intensive.includes("formatUsd")).toBe(true);
    for (const p of ["$22", "$77", "$199"]) {
      expect(intensive.includes(p)).toBe(false);
    }
    expect(intensive.includes('name: "robots", content: "noindex"')).toBe(true);
  });
});

describe("declines go to /next-steps (not the next paid product)", () => {
  it("VIP upgrade decline routes to /next-steps", () => {
    expect(vipUpgrade.includes('to="/next-steps"')).toBe(true);
    // Must NOT route decline directly to the Vault.
    expect(vipUpgrade.match(/No thanks[^<]*\/offer\/implementation-vault/)).toBeNull();
  });
  it("Vault decline routes to /next-steps", () => {
    expect(vault.includes('to="/next-steps"')).toBe(true);
  });
  it("Intensive decline routes to /next-steps", () => {
    expect(intensive.includes('to="/next-steps"')).toBe(true);
  });
});
