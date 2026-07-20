import { describe, it, expect } from "bun:test";
import { computeTotalCents, formatUsd, GA_BUMP_CENTS, TIER_MAP, TIERS } from "../lib/tiers";

describe("tier math (server-side reconciliation)", () => {
  it("GA is $77, no bump", () => {
    expect(computeTotalCents("ga", false)).toBe(7700);
    expect(TIER_MAP.ga.priceCents).toBe(7700);
  });

  it("GA with bump adds $22 → $99 (server-only; not shown publicly)", () => {
    expect(computeTotalCents("ga", true)).toBe(7700 + GA_BUMP_CENTS);
    expect(computeTotalCents("ga", true)).toBe(9900);
  });

  it("VIP/Bundle/Founder IGNORE bump flag", () => {
    expect(computeTotalCents("vip", true)).toBe(17700);
    expect(computeTotalCents("bundle", true)).toBe(33300);
    expect(computeTotalCents("founder", true)).toBe(111100);
  });

  it("Founder hard cap is 33", () => {
    expect(TIER_MAP.founder.hardCap).toBe(33);
  });

  it("formats USD without cents for whole-dollar amounts", () => {
    expect(formatUsd(7700)).toBe("$77");
    expect(formatUsd(9900)).toBe("$99");
    expect(formatUsd(111100)).toBe("$1,111");
  });

  it("GA bullets no longer include the unapproved 'Live Q&A both days' promise", () => {
    const ga = TIERS.find((t) => t.id === "ga")!;
    expect(ga.bullets.some((b) => /Q&A/i.test(b))).toBe(false);
  });
});
