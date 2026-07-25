import { describe, expect, it } from "bun:test";
import {
  TIERS,
  UPSELLS,
  TIER_MAP,
  expectedTotalCents,
  formatUsd,
  isTierId,
  INTENSIVE_HARD_CAP,
} from "@/lib/tiers";

describe("Summit tier catalog", () => {
  it("has exactly GA and VIP admission tickets", () => {
    expect(TIERS.map((t) => t.id).sort()).toEqual(["ga", "vip"]);
  });
  it("uses the canonical prices", () => {
    expect(TIER_MAP.ga.priceCents).toBe(2200);
    expect(TIER_MAP.vip.priceCents).toBe(7700);
    expect(UPSELLS.vip_upgrade.priceCents).toBe(5500);
    expect(UPSELLS.vault.priceCents).toBe(19900);
    expect(UPSELLS.intensive.priceCents).toBe(100000);
    expect(UPSELLS.mentorship.priceCents).toBe(800000);
  });
  it("has stale $77/$177/$333/$888/$1111 pricing removed from tier catalog", () => {
    for (const t of TIERS) {
      expect([17700, 33300, 88800, 111100]).not.toContain(t.priceCents);
    }
  });
  it("caps intensive at 10", () => {
    expect(INTENSIVE_HARD_CAP).toBe(10);
  });
  it("has no bundle / founder / keynote hard-cap product", () => {
    // spec: no legacy Founder/Bundle
    const ids = Object.keys(UPSELLS);
    expect(ids).not.toContain("bundle");
    expect(ids).not.toContain("founder");
  });
});

describe("expectedTotalCents", () => {
  it("returns the tier price for admissions", () => {
    expect(expectedTotalCents("ga")).toBe(2200);
    expect(expectedTotalCents("vip")).toBe(7700);
  });
  it("returns the upsell price for OTOs", () => {
    expect(expectedTotalCents("vip_upgrade")).toBe(5500);
    expect(expectedTotalCents("vault")).toBe(19900);
    expect(expectedTotalCents("intensive")).toBe(100000);
    expect(expectedTotalCents("mentorship")).toBe(800000);
  });
});

describe("formatUsd", () => {
  it("formats whole-dollar amounts without decimals", () => {
    expect(formatUsd(2200)).toBe("$22");
    expect(formatUsd(100000)).toBe("$1,000");
    expect(formatUsd(800000)).toBe("$8,000");
  });
  it("formats sub-dollar cents with two decimals", () => {
    expect(formatUsd(2250)).toBe("$22.50");
  });
});

describe("isTierId", () => {
  it("accepts only ga and vip", () => {
    expect(isTierId("ga")).toBe(true);
    expect(isTierId("vip")).toBe(true);
    expect(isTierId("bundle")).toBe(false);
    expect(isTierId("founder")).toBe(false);
    expect(isTierId(undefined)).toBe(false);
  });
});
