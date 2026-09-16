import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { openAccessActive, OPEN_ACCESS_TIERS } from "@/lib/academy-access.server";
import { academyCheckoutUrl } from "@/lib/academy-checkout.server";
import { PAYMENTS_ENABLED } from "@/lib/challenge-config";
import { SUPPORT_OPTIONS, SUPPORT_TEXT_NUMBER, SUMMIT_OFFERS, tierAllows } from "@/lib/academy";

const KEY = "ACADEMY_OPEN_ACCESS_UNTIL";
const original = process.env[KEY];
afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

describe("open week", () => {
  it("is active only while the configured moment is in the future", () => {
    process.env[KEY] = new Date(Date.now() + 3600_000).toISOString();
    expect(openAccessActive()).toBe(true);
    process.env[KEY] = new Date(Date.now() - 1000).toISOString();
    expect(openAccessActive()).toBe(false);
    process.env[KEY] = "not a date";
    expect(openAccessActive()).toBe(false);
    delete process.env[KEY];
    expect(openAccessActive()).toBe(false);
  });

  it("opens every Summit tier but never the Accelerator", () => {
    expect([...OPEN_ACCESS_TIERS]).toEqual(["ga", "vip", "vault"]);
    for (const tier of ["ga", "vip", "vault"] as const) {
      expect(tierAllows([...OPEN_ACCESS_TIERS], tier)).toBe(true);
    }
    expect(tierAllows([...OPEN_ACCESS_TIERS], "accelerator")).toBe(false);
  });

  it("unions the open tiers into every grant path without dropping real grants", () => {
    const src = readFileSync("src/lib/academy-access.server.ts", "utf8");
    expect(src.match(/withOpenAccess\(/g)?.length).toBeGreaterThanOrEqual(4);
    expect(src).toContain("[...new Set([...grants, ...OPEN_ACCESS_TIERS])]");
    expect(src).not.toContain('OPEN_ACCESS_TIERS = ["ga", "vip", "vault", "accelerator"]');
  });
});

describe("payments are off", () => {
  it("resolves no checkout URL for any tier", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
    for (const tier of ["ga", "vip", "vault", "accelerator"]) {
      expect(academyCheckoutUrl(tier)).toBeNull();
    }
  });

  it("sends the legacy checkout route back to the Summit", () => {
    const route = readFileSync("src/routes/api/public/checkout/$tier.ts", "utf8");
    expect(route).toContain('Location: "/summit"');
    expect(route).not.toContain("academyCheckoutUrl");
  });

  it("shows no ticket price anywhere in the catalogue", () => {
    for (const offer of SUMMIT_OFFERS) expect(offer.price).toBe(0);
    expect(SUMMIT_OFFERS.every((o) => !o.url.includes("checkout"))).toBe(true);
  });

  it("offers donation, Accelerator interest and the community by text", () => {
    expect(SUPPORT_OPTIONS).toHaveLength(3);
    expect(SUPPORT_OPTIONS.filter((o) => o.href.startsWith("sms:"))).toHaveLength(2);
    expect(SUPPORT_OPTIONS.some((o) => o.href.includes("skool.com"))).toBe(true);
    expect(SUPPORT_TEXT_NUMBER).toBe("510-747-5291");
  });

  it("keeps price tags and store links off the Summit, Vault and Accelerator pages", () => {
    for (const page of ["src/routes/summit.tsx", "src/routes/vault.tsx", "src/routes/accelerator.tsx"]) {
      const src = readFileSync(page, "utf8");
      expect(/\$\d/.test(src)).toBe(false);
      expect(src).not.toContain("/api/public/checkout");
      expect(src).not.toContain("spincityhq.com/cart");
    }
  });
});
