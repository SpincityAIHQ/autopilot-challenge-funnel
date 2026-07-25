import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * Public landing page (`/`) MUST NOT reveal any downstream pricing or
 * link to any later-offer route. The sequential ascension funnel starts
 * at /checkout ($22 GA), and every deeper product is offered only after
 * verified purchase.
 */
const src = readFileSync("src/routes/index.tsx", "utf8");

describe("landing page — no prices, no later-offer links", () => {
  const priceStrings = [
    "$22", "$77", "$199", "$1,000", "$1000", "$8,000", "$55",
    "$88", "$111", "$333", "$888", "$1,111",
    "2200", "7700", "19900", "100000",
  ];
  for (const s of priceStrings) {
    it(`does not contain the visible/meta price string "${s}"`, () => {
      expect(src.includes(s)).toBe(false);
    });
  }

  const forbiddenRoutes = [
    "/offer/vip-upgrade",
    "/offer/implementation-vault",
    "/strategy-intensive",
    "/apply/mentorship",
    "/next-keynote",
  ];
  for (const r of forbiddenRoutes) {
    it(`does not link to ${r}`, () => {
      expect(src.includes(r)).toBe(false);
    });
  }

  it("does not render the removed teaser components or tier grid", () => {
    for (const name of ["TierComparison", "VaultTeaser", "IntensiveTeaser"]) {
      expect(src.includes(name)).toBe(false);
    }
  });

  it("navigates to /checkout with a neutral CTA (no price in the button)", () => {
    expect(src.includes('to="/checkout"')).toBe(true);
    // No "Get GA — $22" / "Go VIP — $77" style buttons.
    expect(src.match(/Get GA/)).toBeNull();
    expect(src.match(/Go VIP/)).toBeNull();
  });

  it("replaces the nav 'Tickets' link with a neutral label", () => {
    expect(src.includes(">Tickets<")).toBe(false);
  });
});
