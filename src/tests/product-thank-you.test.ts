/**
 * Product-specific thank-you copy + anonymous non-disclosure.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductThankYou } from "@/components/ProductThankYou";

const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");
const NEXT_STEPS = readFileSync("src/routes/next-steps.tsx", "utf8");
const CONFIG = readFileSync("src/lib/challenge-config.ts", "utf8");

const GA_THANKS = "Thank you, family — your General Admission seat is confirmed.";
const VIP_THANKS = "Thank you, family — your VIP access is confirmed.";
const VAULT_THANKS = "Thank you, family — your Vault access is confirmed.";
const INTENSIVE_THANKS =
  "Thank you, family — your private Strategy & Build Intensive is confirmed.";

describe("verified product-specific thank-you copy", () => {
  it("GA thank-you lives in /confirmed and is gated on verifiedGaOnly", () => {
    expect(CONFIRMED).toContain(GA_THANKS);
    expect(CONFIRMED).toContain("verified={verifiedGaOnly}");
    expect(CONFIRMED).toContain("access.hasGa && !access.hasVip");
    expect(CONFIRMED).toContain("Your purchase is confirmed.");
  });

  it("VIP thank-you is present on /confirmed and on the Vault page", () => {
    expect(CONFIRMED).toContain(VIP_THANKS);
    expect(CONFIRMED).toContain("verified={verifiedVipNoVault}");
    expect(VAULT).toContain(VIP_THANKS);
    const gateAt = VAULT.indexOf("<OfferGate");
    expect(gateAt).toBeGreaterThan(0);
    expect(VAULT.slice(0, gateAt)).not.toContain(VIP_THANKS);
  });

  it("Vault thank-you lives inside the Intensive gated content", () => {
    expect(INTENSIVE).toContain(VAULT_THANKS);
    const gateAt = INTENSIVE.indexOf("<OfferGate");
    expect(gateAt).toBeGreaterThan(0);
    expect(INTENSIVE.slice(0, gateAt)).not.toContain(VAULT_THANKS);
  });

  it("next-steps contains a no-upsell confirmation for every final level", () => {
    expect(NEXT_STEPS).toContain(GA_THANKS);
    expect(NEXT_STEPS).toContain(
      "Thank you, family — your General Admission and VIP access are confirmed.",
    );
    expect(NEXT_STEPS).toContain(
      "Thank you, family — your Summit, VIP, and Implementation Vault access are confirmed.",
    );
    expect(NEXT_STEPS).toContain(INTENSIVE_THANKS);
    expect(NEXT_STEPS).toContain("getExitConfirmation");
    expect(NEXT_STEPS).toContain("access.hasIntensive");
    expect(NEXT_STEPS).toContain("scheduling link");
  });

  it("offer pages do not mix unrelated thank-you messages into their shells", () => {
    expect(VAULT).not.toContain(GA_THANKS);
    expect(VAULT).not.toContain(VAULT_THANKS);
    expect(VAULT).not.toContain(INTENSIVE_THANKS);

    expect(INTENSIVE).not.toContain(GA_THANKS);
    expect(INTENSIVE).not.toContain(VIP_THANKS);
    expect(INTENSIVE).not.toContain(INTENSIVE_THANKS);
  });

  it("no page chooses a thank-you message from a URL parameter", () => {
    for (const source of [CONFIRMED, VAULT, INTENSIVE, NEXT_STEPS]) {
      expect(source).not.toContain("useSearch(");
      expect(source).not.toContain("URLSearchParams");
      expect(source).not.toContain("location.search");
    }
  });
});

describe("ProductThankYou component — non-disclosure", () => {
  it("renders nothing when verified is false", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThankYou, {
        verified: false,
        eyebrow: "Verified · GA",
        headline: GA_THANKS,
        videoUrl: "https://www.youtube.com/watch?v=abc123XYZ_1",
        videoLabel: "welcome",
      }),
    );
    expect(html).toBe("");
    expect(html).not.toContain(GA_THANKS);
    expect(html).not.toContain("youtube");
  });

  it("renders the exact headline when verified is true", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThankYou, {
        verified: true,
        eyebrow: "Verified · GA",
        headline: GA_THANKS,
        videoLabel: "welcome",
      }),
    );
    expect(html).toContain("Thank you, family");
    expect(html).toContain("General Admission seat is confirmed.");
    expect(html).toContain('data-testid="product-thank-you"');
  });

  it("hides the video slot when the URL is unset", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThankYou, {
        verified: true,
        eyebrow: "Verified · GA",
        headline: GA_THANKS,
        videoUrl: null,
        videoLabel: "welcome",
      }),
    );
    expect(html).toContain("General Admission seat is confirmed.");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("coming soon");
    expect(html).not.toContain("placeholder");
  });

  it("hides the video slot when the URL is off-allowlist", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThankYou, {
        verified: true,
        eyebrow: "Verified · GA",
        headline: GA_THANKS,
        videoUrl: "https://evil.example.com/embed/whatever",
        videoLabel: "welcome",
      }),
    );
    expect(html).toContain("General Admission seat is confirmed.");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("evil.example.com");
  });
});

describe("offer and exit video slot config", () => {
  it("reads four independent product video variables", () => {
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_GA");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_VIP");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_VAULT");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_INTENSIVE");
  });

  it("the shared confirmation and recovery offers keep separate video slots", () => {
    expect(CONFIRMED).toContain("sectionVideos.confirmedThankYou");
    expect(CONFIRMED).not.toContain("sectionVideos.thankYouGa");
    expect(CONFIRMED).not.toContain("sectionVideos.thankYouVip");
    expect(VAULT).toContain("sectionVideos.thankYouVip");
    expect(INTENSIVE).toContain("sectionVideos.thankYouVault");
  });

  it("next-steps uses separate no-upsell exit videos", () => {
    expect(NEXT_STEPS).toContain("sectionVideos.exitGa");
    expect(NEXT_STEPS).toContain("sectionVideos.exitVip");
    expect(NEXT_STEPS).toContain("sectionVideos.exitVault");
    expect(NEXT_STEPS).toContain("sectionVideos.exitIntensive");
  });
});
