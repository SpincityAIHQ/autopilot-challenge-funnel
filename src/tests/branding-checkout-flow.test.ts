import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
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

  it("uses a lightweight CSS-only NuAmenti mark in the global shell", () => {
    expect(BRAND).toContain("function NuAmentiMark");
    expect(BRAND).not.toContain("brand-assets");
    expect(BRAND).not.toContain("data:image");
    expect(BRAND).not.toContain("NUAMENTI_MARK_DATA_URI");
  });

  it("contains no Perfect Aim branding in customer-facing Summit copy", () => {
    expect(CUSTOMER_COPY.toLowerCase()).not.toContain("perfect aim");
    expect(CUSTOMER_COPY.toLowerCase()).not.toContain("podcast");
  });

  it("shows the initial VSL slot on the landing page owner preview", () => {
    expect(LANDING).toContain("FunnelVideoSlot");
    expect(LANDING).toContain("VITE_SUMMIT_VIDEO_HERO");
    expect(LANDING).toContain("Watch the official Summit invitation");
  });

  it("explains the two-day autonomous business build in plain language", () => {
    expect(LANDING).toContain("BUILD THE BUSINESS");
    expect(LANDING).toContain("HIRE THE AI TEAM");
    expect(LANDING).toContain("AI Business GPS");
    expect(LANDING).toContain("internal business app");
    expect(LANDING).toContain("Do the Math");
  });
});

describe("checkout owner walkthrough", () => {
  it("puts a no-payment continue action above the checkout video", () => {
    const button = CHECKOUT.indexOf("Continue to GA confirmation — no payment");
    const video = CHECKOUT.indexOf("<FunnelVideoSlot");
    expect(button).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(button);
  });

  it("continues to the GA confirmation in QA mode", () => {
    expect(CHECKOUT).toContain(
      'window.location.href = "/confirmed?qaStage=ga"',
    );
  });
});
