import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VIP = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");
const BRAND = readFileSync("src/components/BrandFrame.tsx", "utf8");
const TIERS = readFileSync("src/lib/tiers.ts", "utf8");

const CUSTOMER_COPY = [ROOT, LANDING, CHECKOUT, BRAND, TIERS].join("\n");

describe("SpinCityHQ and NuAmenti Summit branding", () => {
  it("wraps every route in the shared brand frame", () => {
    expect(ROOT).toContain("<BrandFrame>");
    expect(BRAND).toContain("SPINCITYHQ");
    expect(BRAND).toContain("NUAMENTI");
    expect(BRAND).toContain("AI AutoPilot 2-Day Summit");
  });

  it("contains no Perfect Aim or podcast branding", () => {
    expect(CUSTOMER_COPY.toLowerCase()).not.toContain("perfect aim");
    expect(CUSTOMER_COPY.toLowerCase()).not.toContain("podcast");
  });

  it("keeps the autonomous-business promise in plain language", () => {
    expect(LANDING).toContain("BUILD THE BUSINESS");
    expect(LANDING).toContain("HIRE THE AI TEAM");
    expect(LANDING).toContain("PUT THE WORK ON AUTOPILOT");
    expect(LANDING).toContain("AI Business GPS");
    expect(LANDING).toContain("Internal Business App Plan");
    expect(LANDING).toContain("Do the Math");
  });
});

describe("video-first conversion order", () => {
  it("puts the landing VSL directly after the headline and the ticket button directly after the VSL", () => {
    const headline = LANDING.indexOf("PUT THE WORK ON AUTOPILOT");
    const video = LANDING.indexOf("<FunnelVideoSlot", headline);
    const button = LANDING.indexOf("Reserve My Seat", video);
    const supportingCopy = LANDING.indexOf("In two live days", button);

    expect(headline).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(headline);
    expect(button).toBeGreaterThan(video);
    expect(supportingCopy).toBeGreaterThan(button);
  });

  it("puts the General Admission ticket button immediately after the checkout video", () => {
    const video = CHECKOUT.indexOf("<FunnelVideoSlot");
    const button = CHECKOUT.indexOf("Reserve My Seat", video);
    const details = CHECKOUT.indexOf("How communication works", button);
    expect(video).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(video);
    expect(details).toBeGreaterThan(button);
  });

  it("puts every post-purchase upgrade CTA below its video", () => {
    const checks = [
      [CONFIRMED, "Add VIP"],
      [VIP, "Add VIP"],
      [VAULT, "Add the Vault"],
      [INTENSIVE, "Claim a Slot"],
    ] as const;

    for (const [source, ctaText] of checks) {
      const video = source.indexOf("<FunnelVideoSlot");
      const cta = source.indexOf(ctaText, video);
      expect(video).toBeGreaterThan(-1);
      expect(cta).toBeGreaterThan(video);
    }
  });
});

describe("checkout owner walkthrough", () => {
  it("continues to the GA confirmation in QA mode", () => {
    expect(CHECKOUT).toContain(
      'window.location.href = "/confirmed?qaStage=ga"',
    );
  });
});
