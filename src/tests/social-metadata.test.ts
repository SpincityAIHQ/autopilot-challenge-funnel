import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";
import {
  CANONICAL_HOME_URL,
  FALLBACK_SITE_URL,
  SOCIAL_IMAGE_PATH,
  SOCIAL_IMAGE_URL,
  normalizePublicSiteUrl,
} from "@/lib/site-meta";

const ROOT = readFileSync("src/routes/__root.tsx", "utf8");
const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const AUDIT = readFileSync("src/routes/audit.tsx", "utf8");

describe("brand-owned share metadata", () => {
  it("uses absolute HTTPS URLs and safely rejects malformed configuration", () => {
    expect(CANONICAL_HOME_URL).toBe(`${FALLBACK_SITE_URL}/`);
    expect(SOCIAL_IMAGE_URL).toBe(`${FALLBACK_SITE_URL}${SOCIAL_IMAGE_PATH}`);
    expect(normalizePublicSiteUrl("https://summit.spincityhq.com/path?q=1")).toBe(
      "https://summit.spincityhq.com",
    );
    expect(normalizePublicSiteUrl("http://summit.spincityhq.com")).toBe(FALLBACK_SITE_URL);
    expect(normalizePublicSiteUrl("https://user:pass@example.com")).toBe(FALLBACK_SITE_URL);
    expect(normalizePublicSiteUrl("not a url")).toBe(FALLBACK_SITE_URL);
  });

  it("declares complete Open Graph and X card fields", () => {
    const metadata = `${ROOT}\n${LANDING}`;
    for (const field of [
      "og:image",
      "og:image:secure_url",
      "og:image:type",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
      "twitter:title",
      "twitter:description",
      "twitter:image",
      "twitter:image:alt",
    ]) {
      expect(metadata).toContain(field);
    }
    expect(metadata).not.toContain("Autopilot Ignition");
    expect(metadata).not.toContain("og_image_url");
  });

  it("ships branded icons and a 1200x630 social card", () => {
    for (const path of [
      "public/favicon.ico",
      "public/favicon-16x16.png",
      "public/favicon-32x32.png",
      "public/apple-touch-icon.png",
      "public/icon-192.png",
      "public/icon-512.png",
      "public/nuamenti-mark.webp",
      "public/og-ai-autopilot-summit.png",
      "public/site.webmanifest",
    ]) {
      expect(existsSync(path)).toBe(true);
    }

    const favicon = readFileSync("public/favicon.ico");
    const faviconHash = createHash("sha256").update(favicon).digest("hex");
    const lovableTemplateHash = readFileSync(
      "src/tests/fixtures/lovable-favicon.sha256",
      "utf8",
    ).trim();
    expect(faviconHash).not.toBe(lovableTemplateHash);

    const socialCard = readFileSync("public/og-ai-autopilot-summit.png");
    expect(socialCard.readUInt32BE(16)).toBe(1200);
    expect(socialCard.readUInt32BE(20)).toBe(630);
  });

  it("keeps Event schema on the public landing page only", () => {
    expect(ROOT).not.toContain("application/ld+json");
    expect(LANDING).toContain("application/ld+json");
    expect(LANDING).toContain("VirtualLocation");
    expect(LANDING).toContain("2026-08-29T13:00:00-04:00");
    expect(LANDING).toContain("2026-08-30T16:00:00-04:00");
    expect(AUDIT).toContain('name: "robots", content: "noindex,nofollow"');
  });
});
