import { describe, it, expect } from "bun:test";
import {
  resolveCheckoutUrl,
  isHandoffAllowed,
  isAllowedCheckoutUrl,
  DEFAULT_COMMAS_CHECKOUT_HOSTS,
} from "../lib/challenge-config";

const HOSTS = DEFAULT_COMMAS_CHECKOUT_HOSTS;
const GA = "https://www.fanbasis.com/checkout/ga_abc";
const VIP = "https://www.fanbasis.com/checkout/vip_abc";
const BUNDLE = "https://www.fanbasis.com/checkout/bundle_abc";
const FOUNDER = "https://www.fanbasis.com/checkout/founder_abc";

describe("checkout URL resolution — fail closed", () => {
  it("returns null for every tier when no env is set", () => {
    const empty = { urls: {}, videoUrl: undefined, salesEnabled: false, allowedHosts: HOSTS };
    expect(resolveCheckoutUrl("ga", empty)).toBeNull();
    expect(resolveCheckoutUrl("vip", empty)).toBeNull();
    expect(resolveCheckoutUrl("bundle", empty)).toBeNull();
    expect(resolveCheckoutUrl("founder", empty)).toBeNull();
  });

  it("uses the tier-specific URL when configured", () => {
    const cfg = {
      urls: { ga: GA, vip: VIP },
      videoUrl: undefined,
      salesEnabled: true,
      allowedHosts: HOSTS,
    };
    expect(resolveCheckoutUrl("ga", cfg)).toBe(GA);
    expect(resolveCheckoutUrl("vip", cfg)).toBe(VIP);
    expect(resolveCheckoutUrl("bundle", cfg)).toBeNull();
  });

  it("has NO GA-bump URL fallback (bump lives inside Commas)", () => {
    const cfg = {
      urls: { ga: GA },
      videoUrl: undefined,
      salesEnabled: true,
      allowedHosts: HOSTS,
    };
    expect(resolveCheckoutUrl("ga", cfg)).toBe(GA);
    // @ts-expect-error — verify the shape does not expose bumpUrl anymore
    expect(cfg.bumpUrl).toBeUndefined();
  });
});

describe("checkout URL allowlist — security", () => {
  it("rejects javascript:, http:, and data: schemes", () => {
    expect(isAllowedCheckoutUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedCheckoutUrl("http://www.fanbasis.com/checkout/x")).toBe(false);
    expect(isAllowedCheckoutUrl("data:text/html,<h1>x</h1>")).toBe(false);
  });

  it("rejects unparseable, missing, and empty URLs", () => {
    expect(isAllowedCheckoutUrl(undefined)).toBe(false);
    expect(isAllowedCheckoutUrl(null)).toBe(false);
    expect(isAllowedCheckoutUrl("")).toBe(false);
    expect(isAllowedCheckoutUrl("not a url")).toBe(false);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(
      isAllowedCheckoutUrl("https://user:pass@www.fanbasis.com/checkout/ga"),
    ).toBe(false);
  });

  it("rejects lookalike hosts (exact match only)", () => {
    expect(isAllowedCheckoutUrl("https://fanbasis.com/checkout/x")).toBe(false);
    expect(isAllowedCheckoutUrl("https://evil.www.fanbasis.com/x")).toBe(false);
    expect(isAllowedCheckoutUrl("https://www.fanbasis.com.evil.tld/x")).toBe(false);
    expect(isAllowedCheckoutUrl("https://www-fanbasis.com/x")).toBe(false);
  });

  it("accepts the default official host", () => {
    expect(isAllowedCheckoutUrl(GA)).toBe(true);
  });

  it("honors an explicit override allowlist entry", () => {
    const extra = ["www.fanbasis.com", "checkout.commas.dev"];
    expect(isAllowedCheckoutUrl("https://checkout.commas.dev/x", extra)).toBe(true);
    // Override does NOT strip the default
    expect(isAllowedCheckoutUrl(GA, extra)).toBe(true);
    // Anything off-list still blocked
    expect(isAllowedCheckoutUrl("https://other.example/x", extra)).toBe(false);
  });

  it("resolveCheckoutUrl fails closed for off-allowlist URLs", () => {
    const cfg = {
      urls: { ga: "https://evil.example/pretend" },
      videoUrl: undefined,
      salesEnabled: true,
      allowedHosts: HOSTS,
    };
    expect(resolveCheckoutUrl("ga", cfg)).toBeNull();
  });
});

describe("handoff sales gate", () => {
  const withUrls = {
    urls: { ga: GA, vip: VIP, bundle: BUNDLE, founder: FOUNDER },
    videoUrl: undefined,
    allowedHosts: HOSTS,
  };

  it("blocks handoff when sales are disabled", () => {
    const cfg = { ...withUrls, salesEnabled: false };
    expect(isHandoffAllowed("ga", cfg)).toBe(false);
    expect(isHandoffAllowed("founder", cfg)).toBe(false);
  });

  it("allows handoff when sales are enabled AND URL exists AND host allowed", () => {
    const cfg = { ...withUrls, salesEnabled: true };
    expect(isHandoffAllowed("ga", cfg)).toBe(true);
    expect(isHandoffAllowed("founder", cfg)).toBe(true);
  });

  it("blocks handoff when sales enabled but tier URL missing", () => {
    const cfg = {
      urls: { ga: GA },
      videoUrl: undefined,
      salesEnabled: true,
      allowedHosts: HOSTS,
    };
    expect(isHandoffAllowed("ga", cfg)).toBe(true);
    expect(isHandoffAllowed("vip", cfg)).toBe(false);
    expect(isHandoffAllowed("founder", cfg)).toBe(false);
  });
});
