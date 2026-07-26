import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * The public landing page must not reveal downstream pricing or link directly
 * to any later paid offer. The paid funnel starts at /checkout.
 */
const src = readFileSync("src/routes/index.tsx", "utf8");

describe("landing page — no prices, no later-offer links", () => {
  const priceStrings = [
    "$22",
    "$77",
    "$199",
    "$1,000",
    "$1000",
    "$8,000",
    "$55",
    "$88",
    "$111",
    "$333",
    "$888",
    "$1,111",
    "2200",
    "7700",
    "19900",
    "100000",
  ];

  for (const value of priceStrings) {
    it(`does not contain the visible/meta price string "${value}"`, () => {
      expect(src.includes(value)).toBe(false);
    });
  }

  const forbiddenRoutes = [
    "/offer/vip-upgrade",
    "/offer/implementation-vault",
    "/strategy-intensive",
    "/apply/mentorship",
    "/next-keynote",
  ];

  for (const route of forbiddenRoutes) {
    it(`does not link to ${route}`, () => {
      expect(src.includes(route)).toBe(false);
    });
  }

  it("does not render removed teaser components or a tier grid", () => {
    for (const name of ["TierComparison", "VaultTeaser", "IntensiveTeaser"]) {
      expect(src.includes(name)).toBe(false);
    }
  });

  it("uses only neutral Reserve Your Seat buttons to enter checkout", () => {
    expect(src.includes('to="/checkout"')).toBe(true);
    const reserveButtons = src.match(/>\s*Reserve Your Seat\s*</g) ?? [];
    expect(reserveButtons.length).toBeGreaterThanOrEqual(2);
    expect(src.match(/Get GA/)).toBeNull();
    expect(src.match(/Go VIP/)).toBeNull();
  });

  it("contains a registration section without a public tier selector", () => {
    expect(src.includes('id="registration"')).toBe(true);
    expect(src.includes(">Tickets<")).toBe(false);
    expect(src.includes('name="tier"')).toBe(false);
  });

  it("uses no tier query parameter on the landing page", () => {
    expect(src.match(/\/checkout\?/)).toBeNull();
    expect(src.match(/tier=/)).toBeNull();
  });

  it("contains no dollar-price string in source, metadata, or structured copy", () => {
    const matches = src.match(/\$\d[\d,]*/g);
    expect(matches).toBeNull();
  });

  it("does not link to later customer or resource pages", () => {
    for (const route of [
      "/next-steps",
      "/resources",
      "/communication-preferences",
    ]) {
      expect(src.includes(route)).toBe(false);
    }
  });
});
