import { describe, it, expect } from "bun:test";
import { resolveCheckoutUrl } from "../lib/challenge-config";

describe("checkout URL resolution — fail closed", () => {
  it("returns null for every tier when no env is set", () => {
    const empty = { urls: {}, bumpUrl: undefined, videoUrl: undefined };
    expect(resolveCheckoutUrl("ga", false, empty)).toBeNull();
    expect(resolveCheckoutUrl("ga", true, empty)).toBeNull();
    expect(resolveCheckoutUrl("vip", false, empty)).toBeNull();
    expect(resolveCheckoutUrl("bundle", false, empty)).toBeNull();
    expect(resolveCheckoutUrl("founder", false, empty)).toBeNull();
  });

  it("uses the tier-specific URL when configured", () => {
    const cfg = {
      urls: { ga: "https://commas.example/ga", vip: "https://commas.example/vip" },
      bumpUrl: undefined,
      videoUrl: undefined,
    };
    expect(resolveCheckoutUrl("ga", false, cfg)).toBe("https://commas.example/ga");
    expect(resolveCheckoutUrl("vip", false, cfg)).toBe("https://commas.example/vip");
    expect(resolveCheckoutUrl("bundle", false, cfg)).toBeNull();
  });

  it("uses the bump URL only for GA + bump", () => {
    const cfg = {
      urls: { ga: "https://commas.example/ga" },
      bumpUrl: "https://commas.example/ga-bump",
      videoUrl: undefined,
    };
    expect(resolveCheckoutUrl("ga", true, cfg)).toBe("https://commas.example/ga-bump");
    expect(resolveCheckoutUrl("ga", false, cfg)).toBe("https://commas.example/ga");
  });
});
