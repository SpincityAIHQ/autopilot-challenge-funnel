/**
 * Product-specific thank-you copy + anonymous non-disclosure.
 *
 * Rules enforced:
 *   1. Each buyer-continuation page carries an exact product-specific
 *      thank-you string, worded per the operator's brand voice, and it
 *      only appears once the buyer's verified session proves they hold
 *      the product being thanked for.
 *   2. Anonymous visitors and off-path visitors NEVER see the thank-you
 *      copy, product names, prices, or video slots. Nothing is derived
 *      from `?tier=` or any other URL parameter.
 *   3. `ProductThankYou` renders nothing when `verified={false}` — no
 *      headline, no eyebrow, no video, no placeholder shell.
 *   4. Each thank-you card wires an independent optional VideoSlot
 *      (thankYouGa / thankYouVip / thankYouVault / thankYouIntensive);
 *      when the URL is unset or off-allowlist, the slot is hidden.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ProductThankYou } from "@/components/ProductThankYou";

const CONFIRMED = readFileSync("src/routes/confirmed.tsx", "utf8");
const VAULT = readFileSync("src/routes/offer/implementation-vault.tsx", "utf8");
const INTENSIVE = readFileSync("src/routes/strategy-intensive.tsx", "utf8");
const NEXT_STEPS = readFileSync("src/routes/next-steps.tsx", "utf8");
const CONFIG = readFileSync("src/lib/challenge-config.ts", "utf8");

// The exact verified-only strings. Each buyer sees the one that matches
// their verified purchase, and never the strings for other products.
const GA_THANKS =
  "Thank you, family — you're officially registered with General Admission.";
const VIP_THANKS =
  "Thank you, family — you added the VIP Implementation Experience.";
const VAULT_THANKS =
  "Thank you, family — you added the Implementation Vault.";
const INTENSIVE_THANKS =
  "Thank you, family — you purchased the Strategy & Build Intensive.";

describe("verified product-specific thank-you copy", () => {
  it("GA thank-you literal lives in /confirmed and is gated on verifiedGaOnly", () => {
    expect(CONFIRMED).toContain(GA_THANKS);
    // Must be inside a ProductThankYou whose `verified` prop reads from
    // the session-derived `verifiedGaOnly` boolean (not from URL params).
    expect(CONFIRMED).toContain("verified={verifiedGaOnly}");
    expect(CONFIRMED).toContain("access.hasGa && !access.hasVip");
    // No product literal in the anonymous fallback header.
    expect(CONFIRMED).toContain(
      "Thank you, family — we're verifying your payment.",
    );
  });

  it("VIP thank-you literal is present on /confirmed (VIP-direct buyers) AND on /offer/implementation-vault", () => {
    expect(CONFIRMED).toContain(VIP_THANKS);
    expect(CONFIRMED).toContain("verified={verifiedVipNoVault}");
    expect(VAULT).toContain(VIP_THANKS);
    // The Vault page only renders VIP thanks INSIDE OfferGate — never at
    // module scope / anonymous shell.
    const vaultShellEnd = VAULT.indexOf("<OfferGate");
    expect(vaultShellEnd).toBeGreaterThan(0);
    expect(VAULT.slice(0, vaultShellEnd)).not.toContain(VIP_THANKS);
  });

  it("Vault thank-you literal lives inside /strategy-intensive's gated content", () => {
    expect(INTENSIVE).toContain(VAULT_THANKS);
    const gateAt = INTENSIVE.indexOf("<OfferGate");
    expect(gateAt).toBeGreaterThan(0);
    expect(INTENSIVE.slice(0, gateAt)).not.toContain(VAULT_THANKS);
  });

  it("Intensive thank-you literal lives on /next-steps, gated on verifiedIntensive", () => {
    expect(NEXT_STEPS).toContain(INTENSIVE_THANKS);
    expect(NEXT_STEPS).toContain("verified={verifiedIntensive}");
    expect(NEXT_STEPS).toContain("access.hasIntensive");
    // Scheduling explanation is required alongside the Intensive thanks.
    expect(NEXT_STEPS).toContain("scheduling link");
  });

  it("no page mixes another product's thank-you into an unrelated shell", () => {
    // Vault page must NEVER show GA / Vault / Intensive thanks.
    expect(VAULT).not.toContain(GA_THANKS);
    expect(VAULT).not.toContain(VAULT_THANKS);
    expect(VAULT).not.toContain(INTENSIVE_THANKS);
    // Intensive page must NEVER show GA / VIP / Intensive thanks.
    expect(INTENSIVE).not.toContain(GA_THANKS);
    expect(INTENSIVE).not.toContain(VIP_THANKS);
    expect(INTENSIVE).not.toContain(INTENSIVE_THANKS);
    // Next-steps page must NEVER show GA / VIP / Vault thanks.
    expect(NEXT_STEPS).not.toContain(GA_THANKS);
    expect(NEXT_STEPS).not.toContain(VIP_THANKS);
    expect(NEXT_STEPS).not.toContain(VAULT_THANKS);
  });

  it("no page derives which thank-you to show from a URL parameter", () => {
    for (const src of [CONFIRMED, VAULT, INTENSIVE, NEXT_STEPS]) {
      expect(src).not.toContain("searchParams");
      expect(src).not.toContain('"tier"');
      expect(src).not.toContain("'tier'");
      expect(src).not.toMatch(/\?tier=/);
    }
  });
});

describe("ProductThankYou component — non-disclosure to anonymous / ineligible visitors", () => {
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
    expect(html).toContain(GA_THANKS);
    expect(html).toContain('data-testid="product-thank-you"');
  });

  it("hides the video slot when the URL is unset (no public placeholder)", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThankYou, {
        verified: true,
        eyebrow: "Verified · GA",
        headline: GA_THANKS,
        videoUrl: null,
        videoLabel: "welcome",
      }),
    );
    expect(html).toContain(GA_THANKS);
    expect(html).not.toContain("<iframe");
    // No "coming soon" / placeholder text.
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
    expect(html).toContain(GA_THANKS);
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("evil.example.com");
  });
});

describe("per-product optional video slot config", () => {
  it("reads four independent env vars — one per product", () => {
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_GA");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_VIP");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_VAULT");
    expect(CONFIG).toContain("VITE_SUMMIT_VIDEO_THANK_YOU_INTENSIVE");
  });

  it("each page wires its own product-specific video slot", () => {
    expect(CONFIRMED).toContain("sectionVideos.thankYouGa");
    expect(CONFIRMED).toContain("sectionVideos.thankYouVip");
    expect(VAULT).toContain("sectionVideos.thankYouVip");
    expect(INTENSIVE).toContain("sectionVideos.thankYouVault");
    expect(NEXT_STEPS).toContain("sectionVideos.thankYouIntensive");
  });

  it("removed the legacy anonymous 'Thank-you video placeholder' from /confirmed", () => {
    expect(CONFIRMED).not.toContain("Thank-you video placeholder");
    expect(CONFIRMED).not.toContain("aria-label=\"Thank-you video placeholder\"");
  });
});
