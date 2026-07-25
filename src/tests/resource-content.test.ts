import { describe, expect, it } from "vitest";
import { RESOURCE_INDEX, getResource, listResourceMetas } from "@/lib/resource-content";

describe("resource content library", () => {
  it("has at least 11 resources across ga/vip/vault", () => {
    expect(RESOURCE_INDEX.length).toBeGreaterThanOrEqual(11);
    const tiers = new Set(RESOURCE_INDEX.map((r) => r.tier));
    expect(tiers.has("ga")).toBe(true);
    expect(tiers.has("vip")).toBe(true);
    expect(tiers.has("vault")).toBe(true);
  });
  it("resource metas expose no section content", () => {
    for (const m of listResourceMetas()) {
      expect(Object.keys(m).sort()).toEqual(["name", "preview", "slug", "tier"]);
    }
  });
  it("every slug is retrievable and has non-empty sections", () => {
    for (const r of RESOURCE_INDEX) {
      const got = getResource(r.slug);
      expect(got).not.toBeNull();
      expect(got!.sections.length).toBeGreaterThan(0);
      for (const s of got!.sections) {
        expect(s.heading.length).toBeGreaterThan(0);
        expect(s.bullets.length).toBeGreaterThan(0);
      }
    }
  });
  it("returns null for unknown slug", () => {
    expect(getResource("does-not-exist")).toBeNull();
  });
});
