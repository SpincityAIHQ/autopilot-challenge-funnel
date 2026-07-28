/**
 * Route-tree canonical presence + source-scan for paid content leakage.
 *
 * The generated src/routeTree.gen.ts is the single source of truth for
 * which URLs the router can serve. We assert every requested canonical
 * route exists there, and that no non-server public source file imports
 * the server-only paid content module.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const routeTree = readFileSync("src/routeTree.gen.ts", "utf8");

const CANONICAL_ROUTES = [
  "/offer/vip-upgrade",
  "/offer/implementation-vault",
  "/next-keynote",
  "/next-steps",
  "/apply/mentorship",
  "/strategy-intensive",
  "/resources",
  "/resources/$slug",
  "/checkout",
  "/confirmed",
];

const REDIRECT_ONLY_ROUTES = [
  "/keynote",
  "/mentorship",
  "/intensive",
  "/offer/keynote",
  "/offer/mentorship",
  "/offer/strategy-intensive",
];

describe("canonical routes in generated route tree", () => {
  it("does not restore the removed stray /vault redirect", () => {
    expect(routeTree.includes("'/vault'") || routeTree.includes('"/vault"')).toBe(false);
  });

  for (const path of CANONICAL_ROUTES) {
    it(`contains ${path}`, () => {
      expect(routeTree.includes(`'${path}'`) || routeTree.includes(`"${path}"`)).toBe(true);
    });
  }
  for (const path of REDIRECT_ONLY_ROUTES) {
    it(`still resolves ${path} (redirect stub)`, () => {
      expect(routeTree.includes(`'${path}'`) || routeTree.includes(`"${path}"`)).toBe(true);
    });
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("paid content isolation (source scan)", () => {
  const publicFiles = walk("src").filter(
    (f) =>
      /\.(ts|tsx)$/.test(f) &&
      !f.endsWith(".server.ts") &&
      !f.endsWith(".server.tsx") &&
      !f.startsWith("src/routes/api/") &&
      !f.startsWith("src/tests/") &&
      !f.includes("client.server"),
  );

  it("no public source imports resource-content.server", () => {
    // Match real imports (static or dynamic), not doc-comment mentions.
    const importRe =
      /(?:from\s+["'][^"']*resource-content\.server["']|import\(\s*["'][^"']*resource-content\.server["']\s*\))/;
    const offenders: string[] = [];
    for (const f of publicFiles) {
      const src = readFileSync(f, "utf8");
      if (importRe.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("no public source contains unique paid-content phrases", () => {
    // Phrases pulled from server-only sections. If any of these appears
    // in a public file, we've leaked paid content into the bundle.
    const paidPhrases = [
      "Rules of the fence — what AI does and doesn't touch.",
      "Safety block (paste at the top of every agent prompt)",
      "Turn one long-form asset into a 7-day content pull.",
      "Move one job per week from HUMAN-ONLY to HUMAN-REVIEWED.",
    ];
    const offenders: { file: string; phrase: string }[] = [];
    for (const f of publicFiles) {
      const src = readFileSync(f, "utf8");
      for (const p of paidPhrases) {
        if (src.includes(p)) offenders.push({ file: f, phrase: p });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("removed /preview-nav route is not present", () => {
    const files = walk("src/routes");
    const hits = files.filter((f) => f.includes("preview-nav"));
    expect(hits).toEqual([]);
  });
});
