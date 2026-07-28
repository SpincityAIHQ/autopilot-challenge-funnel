import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/routes/index.tsx", "utf8");
const form = readFileSync("src/components/reserve/LandingReservationForm.tsx", "utf8");
const landingSource = `${source}\n${form}`;

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
      expect(landingSource.includes(value)).toBe(false);
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

  it("captures the lead on-page before any checkout", () => {
    expect(source.includes("<LandingReservationForm")).toBe(true);
    expect(form.includes("Reserve My General Admission Seat")).toBe(true);
    expect(form.includes('fetch("/api/public/reserve"')).toBe(true);
    expect(source.includes('to="/checkout"')).toBe(false);
    expect(source.includes('to="/reserve"')).toBe(false);
    expect(source.match(/Get GA/)).toBeNull();
    expect(source.match(/Go VIP/)).toBeNull();
  });

  it("keeps the lead fields collapsed until the reservation button is opened", () => {
    expect(form).toContain("Collapsible");
    expect(form).toContain("CollapsibleTrigger");
    expect(form).toContain("CollapsibleContent");
    expect(form).toContain('id="reserve-seat"');
    expect(form).toContain("Reserve General Admission");
    expect(form).not.toContain("1. Hold your GA seat");
    expect(form).not.toContain("2. Watch the GA ticket video");
    expect(form).not.toContain("3. Choose your ticket and check out");
  });

  it("has no public tier selector or tier query parameter", () => {
    expect(source.includes('name="tier"')).toBe(false);
    expect(source.match(/\/checkout\?/)).toBeNull();
    expect(source.match(/tier=/)).toBeNull();
  });

  it("contains no dollar-price string in source or metadata", () => {
    expect(landingSource.match(/\$\d[\d,]*/g)).toBeNull();
  });

  it("does not link to later customer or resource pages", () => {
    for (const route of ["/next-steps", "/resources", "/communication-preferences"]) {
      expect(source.includes(route)).toBe(false);
    }
  });
});
