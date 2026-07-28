import { describe, expect, it } from "bun:test";
import {
  isAllowedCheckoutUrl,
  resolveCheckoutUrl,
  isHandoffAllowed,
  DEFAULT_COMMAS_CHECKOUT_HOSTS,
} from "@/lib/challenge-config";

const cfg = {
  salesEnabled: true,
  legalReady: true,
  upsellsEnabled: true,
  intensiveSalesEnabled: true,
  keynoteSalesEnabled: true,
  allowedHosts: DEFAULT_COMMAS_CHECKOUT_HOSTS,
  sectionVideos: {},
  keynote: { announced: false },
  urls: {
    ga: "https://www.fanbasis.com/i/ga",
    vip_upgrade: "https://evil.example.com/vip",
    vault: "http://www.fanbasis.com/i/vault",
    intensive: undefined,
  },
} as const;


describe("isAllowedCheckoutUrl", () => {
  it("accepts https on allowlisted host", () => {
    expect(isAllowedCheckoutUrl("https://www.fanbasis.com/i/x")).toBe(true);
    expect(isAllowedCheckoutUrl("https://commas.com/checkout/example")).toBe(true);
  });
  it("rejects http, other hosts, malformed, empty, embedded creds", () => {
    expect(isAllowedCheckoutUrl("http://www.fanbasis.com/i/x")).toBe(false);
    expect(isAllowedCheckoutUrl("https://evil.com/i/x")).toBe(false);
    expect(isAllowedCheckoutUrl("not a url")).toBe(false);
    expect(isAllowedCheckoutUrl("")).toBe(false);
    expect(isAllowedCheckoutUrl(null)).toBe(false);
    expect(isAllowedCheckoutUrl("https://user:pass@www.fanbasis.com/i/x")).toBe(false);
  });
});

describe("resolveCheckoutUrl", () => {
  it("returns the URL when host+scheme match", () => {
    expect(resolveCheckoutUrl("ga", cfg)).toBe("https://www.fanbasis.com/i/ga");
  });
  it("fails closed on off-allowlist, http, and missing", () => {
    expect(resolveCheckoutUrl("vip_upgrade", cfg)).toBeNull();
    expect(resolveCheckoutUrl("vault", cfg)).toBeNull();
    expect(resolveCheckoutUrl("intensive", cfg)).toBeNull();
  });
  it("returns null for legacy direct-VIP (not a current sale product)", () => {
    // getCommasConfig() no longer populates urls.vip — the sequential
    // funnel sells vip only as post-GA vip_upgrade.
    expect(resolveCheckoutUrl("vip", cfg)).toBeNull();
  });
});

describe("isHandoffAllowed", () => {
  it("requires salesEnabled AND legalReady AND resolvable URL", () => {
    expect(isHandoffAllowed("ga", cfg)).toBe(true);
    expect(isHandoffAllowed("intensive", cfg)).toBe(false);
    expect(isHandoffAllowed("ga", { ...cfg, salesEnabled: false })).toBe(false);
    expect(isHandoffAllowed("ga", { ...cfg, legalReady: false })).toBe(false);
  });
});
