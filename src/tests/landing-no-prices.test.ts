import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/routes/index.tsx", "utf8");

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
    it(`does not contain the price string ${value}`, () => {
      expect(source.includes(value)).toBe(false);
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
      expect(source.includes(route)).toBe(false);
    });
  }

  it("does not render a public tier grid or downstream teaser", () => {
    for (const name of ["TierComparison", "VaultTeaser", "IntensiveTeaser"]) {
      expect(source.includes(name)).toBe(false);
    }
  });

  it("uses Get Your Ticket Now buttons to enter checkout", () => {
    expect(source.includes('to="/checkout"')).toBe(true);
    const buttons = source.match(/>\s*Get Your Ticket Now\s*</g) ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/Get GA/)).toBeNull();
    expect(source.match(/Go VIP/)).toBeNull();
  });

  it("has no public tier selector or tier query parameter", () => {
    expect(source.includes('name="tier"')).toBe(false);
    expect(source.match(/\/checkout\?/)).toBeNull();
    expect(source.match(/tier=/)).toBeNull();
  });

  it("contains no dollar-price string in source or metadata", () => {
    expect(source.match(/\$\d[\d,]*/g)).toBeNull();
  });

  it("does not link to later customer or resource pages", () => {
    for (const route of [
      "/next-steps",
      "/resources",
      "/communication-preferences",
    ]) {
      expect(source.includes(route)).toBe(false);
    }
  });
});
