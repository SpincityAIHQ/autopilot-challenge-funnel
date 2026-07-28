import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");
const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const MAP = readFileSync("docs/commas-funnel-map.md", "utf8");

describe("simple owner funnel walkthrough", () => {
  it("removes opening-soon language from every payment step", () => {
    for (const source of [CHECKOUT, VIP, VAULT, INTENSIVE]) {
      expect(source.toLowerCase()).not.toContain("opening soon");
    }
  });

  it("advances through all four offers without a payment in QA preview", () => {
    expect(CHECKOUT).toContain("/confirmed?qaStage=ga");
    expect(VIP).toContain("/offer/implementation-vault?qaStage=vip");
    expect(VAULT).toContain("/strategy-intensive?qaStage=vault");
    expect(INTENSIVE).toContain("/next-steps?qaStage=intensive");
  });

  it("does not render the floating QA panel", () => {
    expect(ROOT).not.toContain("QaReviewPanel");
  });

  it("documents every Commas checkout placeholder and redirect", () => {
    expect(MAP).toContain("VITE_COMMAS_URL_GA");
    expect(MAP).toContain("VITE_COMMAS_URL_GA_VIP");
    expect(MAP).toContain("VITE_COMMAS_URL_GA_VIP_VAULT");
    expect(MAP).toContain("VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE");
    expect(MAP).toContain("VITE_COMMAS_CHECKOUT_URL_VAULT");
    expect(MAP).toContain("VITE_COMMAS_CHECKOUT_URL_INTENSIVE");
    expect(MAP).toContain("/confirmed");
    expect(MAP).toContain("/offer/implementation-vault");
    expect(MAP).toContain("/strategy-intensive");
    expect(MAP).toContain("/next-steps");
  });
});
