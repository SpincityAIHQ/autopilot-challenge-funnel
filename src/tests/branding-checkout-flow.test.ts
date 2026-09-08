import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const LANDING_FORM = readFileSync("src/components/TrainingWaitlistForm.tsx", "utf8");
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

  it("keeps the accountable AI-team lesson in plain language", () => {
    expect(LANDING).toContain("Your expertise.");
    expect(LANDING).toContain("Your business.");
    expect(LANDING).toContain("Your AI team.");
    expect(LANDING).toContain("Diagnose the bottleneck");
    expect(LANDING).toContain("Give the agent a bounded job");
    expect(LANDING).toContain("Prove the result");
    expect(LANDING).toContain("VITE_ACADEMY_VSL_URL");
    expect(LANDING).not.toContain("AI Business GPS");
  });
});

describe("video-first conversion order", () => {
  it("puts the landing VSL after the headline and the free-training entry directly after the VSL", () => {
    const headline = LANDING.indexOf("Your expertise.");
    const video = LANDING.indexOf("<FunnelVideoSlot", headline);
    const form = LANDING.indexOf("<TrainingWaitlistForm", video);
    const supportingCopy = LANDING.indexOf("Meet Thoth", form);

    expect(headline).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(headline);
    expect(form).toBeGreaterThan(video);
    expect(LANDING_FORM).toContain("Join the waiting list");
    expect(LANDING_FORM).toContain("/api/public/training-waitlist");
    expect(supportingCopy).toBeGreaterThan(form);
  });

  it("puts the General Admission ticket button immediately after the checkout video", () => {
    const video = CHECKOUT.indexOf("<FunnelVideoSlot");
    const button = CHECKOUT.indexOf("Reserve My Seat", video);
    const details = CHECKOUT.indexOf("How communication works", button);
    expect(video).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(video);
    expect(details).toBeGreaterThan(button);
  });

  it("puts every email-recovery upgrade action below its video", () => {
    for (const source of [VIP, VAULT, INTENSIVE]) {
      const video = source.indexOf("<FunnelVideoSlot");
      const cta = source.indexOf("{primaryCta}", video);
      expect(video).toBeGreaterThan(-1);
      expect(cta).toBeGreaterThan(video);
    }
    expect(CONFIRMED).not.toContain("Add VIP");
  });
});

describe("checkout owner walkthrough", () => {
  it("continues to the GA confirmation in QA mode", () => {
    expect(CHECKOUT).toContain('window.location.href = "/confirmed?qaStage=ga"');
  });
});
