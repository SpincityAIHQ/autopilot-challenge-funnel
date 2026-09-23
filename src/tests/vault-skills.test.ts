import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DOWNLOAD_CAP_MESSAGE,
  skillCatalogue,
  skillDownload,
  skillListing,
  skillOverview,
  linkedCardUnlocked,
  type SkillStore,
  type SkillZipRow,
} from "@/lib/academy-vault-skills.server";
import { handleAcademyGet } from "@/lib/academy.server";
import { mergeVaultSkills } from "@/lib/vault-skills";
import { vaultCatalogue } from "@/lib/vault";

// Synthetic fixture rows only — never real skill contents.
function row(p: Partial<SkillZipRow & { published: boolean; overview: unknown }>) {
  return {
    slug: "test-skill",
    name: "Test Skill",
    preview: "Synthetic preview.",
    access: "vault",
    is_bundle: false,
    linked_resource_slug: null,
    version: "1",
    file_name: "test.zip",
    byte_size: 3,
    sort_order: 1,
    sha256: "x",
    zip_base64: "AAAA",
    overview: [{ heading: "H", bullets: ["b"] }],
    published: true,
    ...p,
  };
}
function store(rows: ReturnType<typeof row>[], downloads = 0) {
  const recorded: unknown[] = [];
  const pub = () => rows.filter((r) => r.published);
  const s: SkillStore & { recorded: unknown[] } = {
    recorded,
    listPublished: async () => pub(),
    getOverview: async (slug) => pub().find((r) => r.slug === slug) ?? null,
    getZip: async (slug) => pub().find((r) => r.slug === slug) ?? null,
    countDownloadsSince: async () => downloads,
    recordDownload: async (r) => {
      recorded.push(r);
    },
  };
  return s;
}
async function status(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (e) {
    return (e as { status?: number }).status ?? 500;
  }
}

describe("vault skill download access", () => {
  it("no session → 401", async () => {
    const req = new Request("https://x.test/api/academy/vault-skill-download?slug=test-skill");
    expect(await status(handleAcademyGet(req, "vault-skill-download"))).toBe(401);
  });
  const vaultRow = [row({})];
  const vipRow = [row({ access: "vip" })];
  it("GA-only → 403", async () =>
    expect(await status(skillDownload(store(vaultRow), ["ga"], "u", "test-skill"))).toBe(403));
  it("vault → ok and records download", async () => {
    const s = store(vaultRow);
    const r = await skillDownload(s, ["ga", "vault"], "u", "test-skill");
    expect(r.contentType).toBe("application/zip");
    expect(r.base64).toBe("AAAA");
    expect(s.recorded.length).toBe(1);
  });
  it("accelerator → ok", async () =>
    expect(await status(skillDownload(store(vaultRow), ["accelerator"], "u", "test-skill"))).toBe(200));
  it("vip + access vip → ok", async () =>
    expect(await status(skillDownload(store(vipRow), ["ga", "vip"], "u", "test-skill"))).toBe(200));
  it("vip + access vault → 403", async () =>
    expect(await status(skillDownload(store(vaultRow), ["ga", "vip"], "u", "test-skill"))).toBe(403));
  it("unpublished → 404", async () =>
    expect(
      await status(skillDownload(store([row({ published: false })]), ["vault"], "u", "test-skill")),
    ).toBe(404));
  it("unknown / invalid → 404", async () => {
    expect(await status(skillDownload(store(vaultRow), ["vault"], "u", "nope"))).toBe(404));
    expect(await status(skillDownload(store(vaultRow), ["vault"], "u", "../x"))).toBe(404);
  });
  it("over the cap → 429", async () => {
    const s = store(vaultRow, 40);
    await skillDownload(s, ["vault"], "u", "test-skill").catch((e) => {
      expect(e.status).toBe(429);
      expect(e.message).toBe(DOWNLOAD_CAP_MESSAGE);
    });
    expect(s.recorded.length).toBe(0);
  });
  it("overview follows the same rule", async () => {
    expect(await status(skillOverview(store(vipRow), ["vip"], "test-skill"))).toBe(200);
    expect(await status(skillOverview(store(vaultRow), ["vip"], "test-skill"))).toBe(403);
  });
  it("linked card unlocks only for published linked package", async () => {
    const linked = [row({ access: "vip", linked_resource_slug: "company-brain" })];
    expect(await linkedCardUnlocked(store(linked), ["vip"], "company-brain")).toBe(true);
    expect(await linkedCardUnlocked(store(linked), ["ga"], "company-brain")).toBe(false);
    expect(await linkedCardUnlocked(store(linked), ["vip"], "action-guide")).toBe(false);
    const hidden = [row({ access: "vip", linked_resource_slug: "company-brain", published: false })];
    expect(await linkedCardUnlocked(store(hidden), ["vip"], "company-brain")).toBe(false);
  });
});

describe("listings never leak package data", () => {
  it("listing and catalogue omit zip_base64 and overview", async () => {
    const s = store([row({}), row({ slug: "b", published: false })]);
    const listing = JSON.stringify(await skillListing(s, ["vault"]));
    const cat = JSON.stringify(await skillCatalogue(s));
    for (const out of [listing, cat]) {
      expect(out.includes("zip_base64")).toBe(false);
      expect(out.includes("overview")).toBe(false);
      expect(out.includes("AAAA")).toBe(false);
      expect(out.includes('"b"')).toBe(false);
    }
  });
});

describe("vault page with zero published skills", () => {
  it("cards are exactly today's items", () => {
    const items = vaultCatalogue().map((i) => ({ ...i, unlocked: false }));
    const { cards, bundle, standaloneCount } = mergeVaultSkills(items, []);
    expect(bundle).toBe(null);
    expect(standaloneCount).toBe(0);
    expect(cards).toEqual(
      items.map((i) => ({
        slug: i.slug,
        name: i.name,
        preview: i.preview,
        category: i.category,
        unlocked: false,
      })),
    );
  });
});

describe("server module isolation", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }
  it("no client code imports academy-vault-skills.server", () => {
    const re = /academy-vault-skills\.server/;
    const offenders = walk("src").filter(
      (f) =>
        /\.(ts|tsx)$/.test(f) &&
        !/\.server\.tsx?$/.test(f) &&
        !f.startsWith("src/routes/api/") &&
        !f.startsWith("src/tests/") &&
        re.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
