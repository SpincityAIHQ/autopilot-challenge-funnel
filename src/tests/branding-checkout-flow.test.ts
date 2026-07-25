import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
const BRAND = readFileSync("src/components/BrandFrame.tsx", "utf8");
const ASSETS = readFileSync("src/lib/brand-assets.ts", "utf8");

describe("NuAmenti x Perfect AIM branding", () => {
  it("wraps every route in the shared brand frame", () => {
    expect(ROOT).toContain("<BrandFrame>");
    expect(ROOT).toContain("NuAmenti × Perfect AIM");
  });

  it("uses both supplied brand assets", () => {
    expect(BRAND).toContain("NUAMENTI_MARK_DATA_URI");
    expect(BRAND).toContain("PERFECT_AIM_DATA_URI");
    expect(ASSETS).toContain("data:image/webp;base64,");
  });

  it("shows the initial VSL slot on the landing page owner preview", () => {
    expect(LANDING).toContain("FunnelVideoSlot");
    expect(LANDING).toContain("VITE_SUMMIT_VIDEO_HERO");
    expect(LANDING).toContain("Watch the official Summit invitation");
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
    expect(CHECKOUT).toContain('window.location.href = "/confirmed?qaStage=ga"');
  });
});
