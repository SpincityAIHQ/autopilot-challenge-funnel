import { describe, expect, it } from "bun:test";
import {
  TIERS,
  UPSELLS,
  TIER_MAP,
  VIP_SPEC,
  expectedTotalCents,
  formatUsd,
  isTierId,
  INTENSIVE_HARD_CAP,
} from "@/lib/tiers";

describe("Summit sequential funnel catalog", () => {
  it("exposes only General Admission as a public tier", () => {
    expect(TIERS.map((t) => t.id)).toEqual(["ga"]);
    expect(TIER_MAP.ga.priceCents).toBe(2200);
  });
  it("VIP admission spec is $77 (referenced by vip_upgrade + webhook)", () => {
    expect(VIP_SPEC.priceCents).toBe(7700);
  });
  it("uses the canonical sequential prices", () => {
    expect(TIER_MAP.ga.priceCents).toBe(2200);
    // Post-GA VIP Implementation Experience — full $77, not a difference.
    expect(UPSELLS.vip_upgrade.priceCents).toBe(7700);
    expect(UPSELLS.vip.priceCents).toBe(7700);
    expect(UPSELLS.vault.priceCents).toBe(19900);
    expect(UPSELLS.intensive.priceCents).toBe(100000);
    expect(UPSELLS.mentorship.priceCents).toBe(800000);
  });
  it("has stale $177/$333/$888/$1111/$55 pricing removed from catalog", () => {
    const bad = [17700, 33300, 88800, 111100, 5500];
    for (const t of TIERS) expect(bad).not.toContain(t.priceCents);
    for (const u of Object.values(UPSELLS)) expect(bad).not.toContain(u.priceCents);
  });
  it("caps intensive at 10", () => {
    expect(INTENSIVE_HARD_CAP).toBe(10);
  });
  it("has no bundle / founder / keynote hard-cap product", () => {
    const ids = Object.keys(UPSELLS);
    expect(ids).not.toContain("bundle");
    expect(ids).not.toContain("founder");
  });
});

describe("expectedTotalCents", () => {
  it("returns the tier price for GA admission", () => {
    expect(expectedTotalCents("ga")).toBe(2200);
  });
  it("returns the full VIP price for direct VIP fulfillment (legacy)", () => {
    expect(expectedTotalCents("vip")).toBe(7700);
  });
  it("returns the sequential OTO prices", () => {
    expect(expectedTotalCents("vip_upgrade")).toBe(7700);
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
  it("accepts only ga (the sole public admission)", () => {
    expect(isTierId("ga")).toBe(true);
    expect(isTierId("vip")).toBe(false);
    expect(isTierId("bundle")).toBe(false);
    expect(isTierId("founder")).toBe(false);
    expect(isTierId(undefined)).toBe(false);
  });
});
