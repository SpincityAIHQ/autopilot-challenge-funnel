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
const VAULT_WELCOME = readFileSync("src/routes/vault-welcome.tsx", "utf8");
const VAULT_CALENDAR = readFileSync("src/routes/calendar.vault-with-spin[.]ics.ts", "utf8");
const CONFIG = readFileSync("src/lib/challenge-config.ts", "utf8");

const GA_THANKS = "Thank you, family — your General Admission seat is confirmed.";
const VIP_THANKS = "Thank you, family — your VIP access is confirmed.";
const EMERALD_THANKS = "Thank you, family — your Emerald Key Holder access is confirmed.";
const EMERALD_VAULT_THANKS = "Thank you, family — your Emerald Vault Key access is confirmed.";
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
    expect(CONFIRMED).toContain("MVP App Builder");
    expect(CONFIRMED).toContain("AI Business GPS");
    expect(CONFIRMED).toContain("Internal Agent Builder Skill");
    expect(VAULT).toContain(VIP_THANKS);
    const gateAt = VAULT.indexOf("<OfferGate");
    expect(gateAt).toBeGreaterThan(0);
    expect(VAULT.slice(0, gateAt)).not.toContain(VIP_THANKS);
  });

  it("Emerald Key Holder receives a verified final confirmation", () => {
    expect(CONFIRMED).toContain(EMERALD_THANKS);
    expect(CONFIRMED).toContain("verified={verifiedEmerald}");
    expect(CONFIRMED).toContain("access.hasVault");
    expect(CONFIRMED).toContain("Secret Day 3 Vault Opener Class with Spin");
    expect(CONFIRMED).toContain("private room details arrive by email and text");
  });

  it("Emerald Vault thank-you lives inside the Intensive gated content", () => {
    expect(INTENSIVE).toContain(EMERALD_VAULT_THANKS);
    const gateAt = INTENSIVE.indexOf("<OfferGate");
    expect(gateAt).toBeGreaterThan(0);
    expect(INTENSIVE.slice(0, gateAt)).not.toContain(EMERALD_VAULT_THANKS);
  });

  it("next-steps contains a no-upsell confirmation for every final level", () => {
    expect(NEXT_STEPS).toContain(GA_THANKS);
    expect(NEXT_STEPS).toContain(
      "Thank you, family — your General Admission and VIP access are confirmed.",
    );
    expect(NEXT_STEPS).toContain(
      "Thank you, family — your Summit, VIP, and Emerald Vault Key access are confirmed.",
    );
    expect(NEXT_STEPS).toContain(INTENSIVE_THANKS);
    expect(NEXT_STEPS).toContain("getExitConfirmation");
    expect(NEXT_STEPS).toContain("access.hasIntensive");
    expect(NEXT_STEPS).toContain("scheduling link");
  });

  it("offer pages do not mix unrelated thank-you messages into their shells", () => {
    expect(VAULT).not.toContain(GA_THANKS);
    expect(VAULT).not.toContain(EMERALD_VAULT_THANKS);
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

  it("gates private Emerald next steps before rendering purchase-confirmed content", () => {
    const gateAt = VAULT_WELCOME.indexOf("<OfferGate");
    const contentAt = VAULT_WELCOME.indexOf("<VaultWelcomeContent");
    expect(gateAt).toBeGreaterThan(-1);
    expect(contentAt).toBeGreaterThan(gateAt);
    expect(VAULT_WELCOME).toContain("access.hasVault");
    expect(VAULT_WELCOME).not.toContain("Monday, August 31");
    expect(VAULT_WELCOME).not.toContain("1:00–3:00 PM Eastern");
  });

  it("protects the secret Day 3 calendar with an active Vault entitlement", () => {
    expect(VAULT_CALENDAR).toContain("getCookie(SESSION_COOKIE)");
    expect(VAULT_CALENDAR).toContain('"session_active_scopes"');
    expect(VAULT_CALENDAR).toContain('scopes.includes("vault")');
    expect(VAULT_CALENDAR).toContain('"Cache-Control": "private, no-store"');
    expect(VAULT_CALENDAR).not.toContain('"Cache-Control": "public');
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
