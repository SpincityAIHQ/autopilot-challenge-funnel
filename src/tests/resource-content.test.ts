import { describe, expect, it } from "bun:test";
import {
  RESOURCE_METAS,
  listResourceMetas,
  getResourceMeta,
} from "@/lib/resource-metadata";
import {
  RESOURCE_INDEX as SERVER_INDEX,
  getResource as getServerResource,
} from "@/lib/resource-content.server";

describe("resource metadata (public)", () => {
  it("has at least 11 resources across ga/vip/vault", () => {
    expect(RESOURCE_METAS.length).toBeGreaterThanOrEqual(11);
    const tiers = new Set(RESOURCE_METAS.map((r) => r.tier));
    expect(tiers.has("ga")).toBe(true);
    expect(tiers.has("vip")).toBe(true);
    expect(tiers.has("vault")).toBe(true);
  });
  it("public metas expose no section content", () => {
    for (const m of listResourceMetas()) {
      expect(Object.keys(m).sort()).toEqual(["name", "preview", "slug", "tier"]);
      expect((m as unknown as { sections?: unknown }).sections).toBeUndefined();
    }
  });
  it("returns null for unknown slug", () => {
    expect(getResourceMeta("does-not-exist")).toBeNull();
  });
});

describe("resource content (server-only)", () => {
  it("every metadata slug is also present in the server index", () => {
    for (const m of RESOURCE_METAS) {
      const full = getServerResource(m.slug);
      expect(full).not.toBeNull();
      expect(full!.sections.length).toBeGreaterThan(0);
      for (const s of full!.sections) {
        expect(s.heading.length).toBeGreaterThan(0);
        expect(s.bullets.length).toBeGreaterThan(0);
      }
    }
  });
  it("server index has at least as many entries as public metadata", () => {
    expect(SERVER_INDEX.length).toBeGreaterThanOrEqual(RESOURCE_METAS.length);
  });
});
