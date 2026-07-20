import { describe, it, expect } from "bun:test";
import { computeTotalCents, formatUsd, GA_BUMP_CENTS, TIER_MAP } from "../lib/tiers";

describe("tier math", () => {
  it("GA is $77, no bump", () => {
    expect(computeTotalCents("ga", false)).toBe(7700);
    expect(TIER_MAP.ga.priceCents).toBe(7700);
  });

  it("GA with bump adds $22 → $99", () => {
    expect(computeTotalCents("ga", true)).toBe(7700 + GA_BUMP_CENTS);
    expect(computeTotalCents("ga", true)).toBe(9900);
  });

  it("VIP is $177 and IGNORES bump flag", () => {
    expect(computeTotalCents("vip", false)).toBe(17700);
    expect(computeTotalCents("vip", true)).toBe(17700);
  });

  it("Bundle is $333 and IGNORES bump flag", () => {
    expect(computeTotalCents("bundle", false)).toBe(33300);
    expect(computeTotalCents("bundle", true)).toBe(33300);
  });

  it("Founder is $888, IGNORES bump, hard cap 33", () => {
    expect(computeTotalCents("founder", false)).toBe(88800);
    expect(computeTotalCents("founder", true)).toBe(88800);
    expect(TIER_MAP.founder.hardCap).toBe(33);
  });

  it("formats USD without cents for whole-dollar amounts", () => {
    expect(formatUsd(7700)).toBe("$77");
    expect(formatUsd(9900)).toBe("$99");
    expect(formatUsd(88800)).toBe("$888");
  });
});
