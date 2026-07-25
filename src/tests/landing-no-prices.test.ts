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

  it("replaces the nav 'Tickets' link with a neutral 'Registration' label", () => {
    expect(src.includes(">Tickets<")).toBe(false);
    expect(src.includes(">Registration<")).toBe(true);
    expect(src.includes('href="#registration"')).toBe(true);
    expect(src.includes('id="registration"')).toBe(true);
  });

  it("hero CTA is 'Reserve Your Seat' and final CTA is 'Join the Summit', both to /checkout with no tier param", () => {
    expect(src.includes(">Reserve Your Seat<")).toBe(true);
    expect(src.includes(">Join the Summit<")).toBe(true);
    // No tier search param anywhere on the landing page.
    expect(src.match(/\/checkout\?/)).toBeNull();
    expect(src.match(/tier=/)).toBeNull();
  });

  it("contains no `$<digit>` price string anywhere in the source (visible, meta, or JSON-LD)", () => {
    const matches = src.match(/\$\d[\d,]*/g);
    expect(matches).toBeNull();
  });

  it("does not link to /communication-preferences or other later-funnel pages", () => {
    for (const r of ["/next-steps", "/resources", "/communication-preferences"]) {
      expect(src.includes(r)).toBe(false);
    }
  });
});
