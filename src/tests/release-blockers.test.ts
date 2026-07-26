import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  isHandoffAllowed,
  resolveKeynoteCheckoutUrl,
  isKeynoteHandoffAllowed,
  DEFAULT_COMMAS_CHECKOUT_HOSTS,
  type CommasConfig,
} from "@/lib/challenge-config";
import { derivedAccess } from "@/hooks/use-entitlement-summary";

/**
 * Release-blocker regressions:
 *   1. Legal-ready gate must be independent of the sales gate.
 *   2. Keynote checkout must go through the HTTPS allowlist resolver;
 *      raw env URLs never render.
 *   3. Operator-created intensive_eligibility surfaces via derivedAccess.
 *   4. next-keynote form requires the transactional-consent checkbox.
 *   5. next-steps softens present-tense delivery claims and links comm prefs.
 *   6. .env.example documents every gate.
 */

const baseCfg: CommasConfig = {
  urls: { ga: "https://www.fanbasis.com/i/ga" },
  sectionVideos: {},
  salesEnabled: true,
  legalReady: true,
  upsellsEnabled: true,
  intensiveSalesEnabled: true,
  keynoteSalesEnabled: true,
  allowedHosts: DEFAULT_COMMAS_CHECKOUT_HOSTS,
  keynote: {
    announced: true,
    dateIso: "2026-11-01",
    price: "$97",
    checkoutUrl: "https://www.fanbasis.com/i/keynote",
  },
};

describe("legal-ready gate is required in addition to sales gate", () => {
  it("GA handoff blocked when legalReady=false, even with salesEnabled=true", () => {
    expect(isHandoffAllowed("ga", baseCfg)).toBe(true);
    expect(isHandoffAllowed("ga", { ...baseCfg, legalReady: false })).toBe(false);
  });
});

describe("keynote checkout uses allowlist resolver", () => {
  it("resolves an https allowlisted keynote URL", () => {
    expect(resolveKeynoteCheckoutUrl(baseCfg)).toBe(
      "https://www.fanbasis.com/i/keynote",
    );
    expect(isKeynoteHandoffAllowed(baseCfg)).toBe(true);
  });
  it("rejects http, embedded creds, and off-allowlist hosts", () => {
    const bad: CommasConfig = {
      ...baseCfg,
      keynote: { ...baseCfg.keynote, checkoutUrl: "http://www.fanbasis.com/i/keynote" },
    };
    expect(resolveKeynoteCheckoutUrl(bad)).toBeNull();
    expect(isKeynoteHandoffAllowed(bad)).toBe(false);
    const evil: CommasConfig = {
      ...baseCfg,
      keynote: { ...baseCfg.keynote, checkoutUrl: "https://evil.example.com/x" },
    };
    expect(resolveKeynoteCheckoutUrl(evil)).toBeNull();
    expect(isKeynoteHandoffAllowed(evil)).toBe(false);
  });
  it("fails closed when legalReady=false or keynoteSalesEnabled=false", () => {
    expect(isKeynoteHandoffAllowed({ ...baseCfg, legalReady: false })).toBe(false);
    expect(isKeynoteHandoffAllowed({ ...baseCfg, keynoteSalesEnabled: false })).toBe(false);
  });
});

describe("intensive_eligibility scope exposure", () => {
  it("operator-only eligibility is a distinct scope from vault", () => {
    const eligOnly = derivedAccess(["intensive_eligibility"]);
    expect(eligOnly.hasIntensiveEligibility).toBe(true);
    expect(eligOnly.hasVault).toBe(false);
    const vaultOnly = derivedAccess(["vault"]);
    expect(vaultOnly.hasIntensiveEligibility).toBe(false);
    expect(vaultOnly.hasVault).toBe(true);
  });
});

describe("next-keynote form requires transactional consent", () => {
  const src = readFileSync("src/routes/next-keynote.tsx", "utf8");
  it("consent checkbox is required and gates submission", () => {
    expect(src.includes("required")).toBe(true);
    expect(src.includes("!consent")).toBe(true);
    expect(src.includes("Please check the box")).toBe(true);
  });
  it("uses the allowlist keynote resolver, never raw cfg.keynote.checkoutUrl in the link", () => {
    expect(src.includes("resolveKeynoteCheckoutUrl")).toBe(true);
    // Raw env URL must never be the href of the Reserve link:
    expect(src.match(/href=\{cfg\.keynote\.checkoutUrl\}/)).toBeNull();
  });
});

describe("next-steps softens delivery promises and links comm prefs", () => {
  const src = readFileSync("src/routes/next-steps.tsx", "utf8");
  it("does not present-tense claim an automated email send", () => {
    expect(src.includes("we email after verified payment")).toBe(false);
  });
  it("links /communication-preferences", () => {
    expect(src.includes("/communication-preferences")).toBe(true);
  });
});

describe(".env.example documents every product gate", () => {
  const env = readFileSync(".env.example", "utf8");
  for (const key of [
    "VITE_SUMMIT_SALES_ENABLED",
    "VITE_SUMMIT_LEGAL_READY",
    "VITE_SUMMIT_UPSELLS_ENABLED",
    "VITE_SUMMIT_INTENSIVE_SALES_ENABLED",
    "VITE_SUMMIT_KEYNOTE_SALES_ENABLED",
    "RATE_LIMIT_HMAC_SECRET",
    "COMMAS_WEBHOOK_SECRET",
  ]) {
    it(`declares ${key}`, () => {
      expect(env.includes(key)).toBe(true);
    });
  }
});

describe("checkout requires explicit legal-policy acknowledgement", () => {
  const src = readFileSync("src/routes/checkout.tsx", "utf8");
  it("adds a legal-ack checkbox gated with `legalAck`", () => {
    expect(src.includes("legalAck")).toBe(true);
    const copy = src.replace(/\s+/g, " ");
    expect(copy).toContain("I agree to the");
    // The three policies must all be linked from the acknowledgement.
    expect(copy).toContain('to="/terms"');
    expect(copy).toContain('to="/privacy"');
    expect(copy).toContain('to="/refund-policy"');
  });

  it("cannot hand off to Commas until the gate AND the ack both pass", () => {
    // Order matters: the sales gate is checked first, then the legal ack, and
    // only then is the checkout URL navigated to. Either guard returning early
    // means no handoff happens.
    const gate = src.indexOf("if (!gateAllowed || !checkoutUrl) return;");
    const ack = src.indexOf("if (!legalAck) {", gate);
    const handoff = src.indexOf("window.location.href = checkoutUrl;", ack);

    expect(gate).toBeGreaterThan(-1);
    expect(ack).toBeGreaterThan(gate);
    expect(handoff).toBeGreaterThan(ack);
  });
});
