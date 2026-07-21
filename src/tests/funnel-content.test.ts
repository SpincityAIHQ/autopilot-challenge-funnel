import { describe, expect, it } from "bun:test";
import {
  CONFIRMATION_CONTENT,
  OFFER_EXPLAINERS,
  getConfirmationContent,
  offerContinueLabel,
} from "../lib/funnel-content";

describe("offer explainers", () => {
  it("maps every current tier to the current price", () => {
    expect(OFFER_EXPLAINERS.ga.summary.includes("$77")).toBe(true);
    expect(OFFER_EXPLAINERS.vip.summary.includes("$177")).toBe(true);
    expect(OFFER_EXPLAINERS.bundle.summary.includes("$333")).toBe(true);
    expect(OFFER_EXPLAINERS.founder.summary.includes("$1,111")).toBe(true);
    expect(offerContinueLabel("founder")).toBe(
      "Continue with Founder — $1,111",
    );
  });

  it("keeps the recordings add-on as GA copy, not another offer/video", () => {
    expect(OFFER_EXPLAINERS.ga.summary.includes("$22 recordings option")).toBe(
      true,
    );
    expect(Object.keys(OFFER_EXPLAINERS)).toEqual([
      "ga",
      "vip",
      "bundle",
      "founder",
    ]);
  });

  it("states the VIP hot-seat and Founder limits honestly", () => {
    expect(OFFER_EXPLAINERS.vip.summary.includes("not promised")).toBe(true);
    expect(OFFER_EXPLAINERS.founder.summary.includes("33 verified")).toBe(true);
    expect(OFFER_EXPLAINERS.founder.fit.includes("InvestFest admission")).toBe(
      true,
    );
  });
});

describe("tier-specific confirmation guidance", () => {
  it("returns null for the neutral confirmation route", () => {
    expect(getConfirmationContent(null)).toBeNull();
  });

  it("gives GA the core eight hours without promising recordings", () => {
    const ga = CONFIRMATION_CONTENT.ga;
    expect(ga.included.includes("four-hour live challenge days")).toBe(true);
    expect(ga.notices.join(" ").includes("only if")).toBe(true);
    expect(ga.notices.join(" ").includes("$22 Recordings Add-On")).toBe(true);
  });

  it("gives VIP+ the 4–5 PM group hour", () => {
    for (const tier of ["vip", "bundle", "founder"] as const) {
      expect(
        CONFIRMATION_CONTENT[tier].nextSteps.join(" ").includes("4–5 PM ET"),
      ).toBe(true);
    }
    expect(
      CONFIRMATION_CONTENT.vip.notices.join(" ").includes("not guaranteed"),
    ).toBe(true);
  });

  it("does not leak Bundle or Founder benefits into GA/VIP", () => {
    const lower = [
      ...CONFIRMATION_CONTENT.ga.nextSteps,
      ...CONFIRMATION_CONTENT.ga.notices,
      ...CONFIRMATION_CONTENT.vip.nextSteps,
      ...CONFIRMATION_CONTENT.vip.notices,
    ].join(" ");
    expect(lower.includes("NuAmenti Gold")).toBe(false);
    expect(lower.includes("Diamond")).toBe(false);
    expect(lower.includes("Founding Credits Wall")).toBe(false);
  });

  it("keeps Bundle dates and Founder exclusions", () => {
    expect(
      CONFIRMATION_CONTENT.bundle.notices.join(" ").includes("Q4 2026"),
    ).toBe(true);
    expect(
      CONFIRMATION_CONTENT.bundle.nextSteps.join(" ").includes("August 10"),
    ).toBe(true);
    const founder = CONFIRMATION_CONTENT.founder.notices.join(" ");
    expect(founder.includes("InvestFest admission")).toBe(true);
    expect(founder.includes("not equity")).toBe(true);
  });
});
