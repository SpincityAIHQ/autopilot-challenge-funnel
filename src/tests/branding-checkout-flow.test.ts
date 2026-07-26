import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const CHECKOUT = readFileSync("src/routes/checkout.tsx", "utf8");
const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VIP_UPGRADE = readFileSync("src/routes/offer/vip-upgrade.tsx", "utf8");
const VAULT_OFFER = readFileSync(
  "src/routes/offer/implementation-vault.tsx",
  "utf8",
);
const STRATEGY_INTENSIVE = readFileSync(
  "src/routes/strategy-intensive.tsx",
  "utf8",
);
const NEXT_STEPS = readFileSync("src/routes/next-steps.tsx", "utf8");
const BRAND = readFileSync("src/components/BrandFrame.tsx", "utf8");
const TIERS = readFileSync("src/lib/tiers.ts", "utf8");

const CUSTOMER_COPY = [ROOT, LANDING, CHECKOUT, BRAND, TIERS].join("\n");

const VIDEO_FIRST_PAGES = [
  {
    name: "landing page",
    source: LANDING,
    nextAction: "Reserve Your Seat",
  },
  {
    name: "checkout owner preview",
    source: CHECKOUT,
    nextAction: "Continue to GA confirmation — no payment",
  },
  {
    name: "VIP offer",
    source: VIP_UPGRADE,
    nextAction: '<div className="mt-6">{cta}</div>',
  },
  {
    name: "Implementation Vault offer",
    source: VAULT_OFFER,
    nextAction: '<div className="mt-8">{cta}</div>',
  },
  {
    name: "Strategy Intensive offer",
    source: STRATEGY_INTENSIVE,
    nextAction: '<div className="mt-8">{cta}</div>',
  },
  {
    name: "confirmation page",
    source: CONFIRMED,
    nextAction: "Day 1 — Sat Aug 29 · 1–4 PM ET",
  },
  {
    name: "next-steps page",
    source: NEXT_STEPS,
    nextAction: "Day 1 — Sat Aug 29 · 1–4 PM ET",
  },
] as const;

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

  it("locks the customer-facing schedule to the weekend build", () => {
    expect(LANDING).toContain("Saturday, August 29");
    expect(LANDING).toContain("Sunday, August 30");
    expect(LANDING).toContain("1:00–4:00 PM Eastern");
    expect(VIP_UPGRADE).toContain("4:15–5:45 PM Eastern");
  });
});

describe("video-first funnel order", () => {
  for (const page of VIDEO_FIRST_PAGES) {
    it(`${page.name} renders its video before the next button or CTA`, () => {
      const video = page.source.indexOf("<FunnelVideoSlot");
      const nextAction = page.source.indexOf(page.nextAction, video + 1);

      expect(video).toBeGreaterThan(-1);
      expect(nextAction).toBeGreaterThan(video);
    });
  }
});

describe("checkout owner walkthrough", () => {
  it("continues to the GA confirmation in QA mode", () => {
    expect(CHECKOUT).toContain(
      'window.location.href = "/confirmed?qaStage=ga"',
    );
  });
});
