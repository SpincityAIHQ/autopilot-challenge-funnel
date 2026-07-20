import { describe, it, expect } from "bun:test";
import { resolveCheckoutUrl, isHandoffAllowed } from "../lib/challenge-config";

describe("checkout URL resolution — fail closed", () => {
  it("returns null for every tier when no env is set", () => {
    const empty = { urls: {}, videoUrl: undefined, salesEnabled: false };
    expect(resolveCheckoutUrl("ga", empty)).toBeNull();
    expect(resolveCheckoutUrl("vip", empty)).toBeNull();
    expect(resolveCheckoutUrl("bundle", empty)).toBeNull();
    expect(resolveCheckoutUrl("founder", empty)).toBeNull();
  });

  it("uses the tier-specific URL when configured", () => {
    const cfg = {
      urls: { ga: "https://commas.example/ga", vip: "https://commas.example/vip" },
      videoUrl: undefined,
      salesEnabled: true,
    };
    expect(resolveCheckoutUrl("ga", cfg)).toBe("https://commas.example/ga");
    expect(resolveCheckoutUrl("vip", cfg)).toBe("https://commas.example/vip");
    expect(resolveCheckoutUrl("bundle", cfg)).toBeNull();
  });

  it("has NO GA-bump URL fallback (bump lives inside Commas)", () => {
    const cfg = {
      urls: { ga: "https://commas.example/ga" },
      videoUrl: undefined,
      salesEnabled: true,
    };
    // Only one URL; there is no separate ga+bump URL surface.
    expect(resolveCheckoutUrl("ga", cfg)).toBe("https://commas.example/ga");
    // @ts-expect-error — verify the shape does not expose bumpUrl anymore
    expect(cfg.bumpUrl).toBeUndefined();
  });
});

describe("handoff sales gate", () => {
  const withUrls = {
    urls: {
      ga: "https://commas.example/ga",
      vip: "https://commas.example/vip",
      bundle: "https://commas.example/bundle",
      founder: "https://commas.example/founder",
    },
    videoUrl: undefined,
  };

  it("blocks handoff when sales are disabled", () => {
    const cfg = { ...withUrls, salesEnabled: false };
    expect(isHandoffAllowed("ga", cfg)).toBe(false);
    expect(isHandoffAllowed("founder", cfg)).toBe(false);
  });

  it("allows handoff when sales are enabled AND URL exists", () => {
    const cfg = { ...withUrls, salesEnabled: true };
    expect(isHandoffAllowed("ga", cfg)).toBe(true);
    expect(isHandoffAllowed("founder", cfg)).toBe(true);
  });

  it("blocks handoff when sales enabled but tier URL missing", () => {
    const cfg = {
      urls: { ga: "https://commas.example/ga" },
      videoUrl: undefined,
      salesEnabled: true,
    };
    expect(isHandoffAllowed("ga", cfg)).toBe(true);
    expect(isHandoffAllowed("vip", cfg)).toBe(false);
    expect(isHandoffAllowed("founder", cfg)).toBe(false);
  });
});
