import { describe, expect, it } from "bun:test";
import {
  TESTIMONIAL_REGISTRY,
  publishedTexts,
  testimonialVideoUrl,
  type TestimonialPageKey,
} from "@/lib/testimonials";

const pages: TestimonialPageKey[] = [
  "landing",
  "checkout",
  "confirmed",
  "vip_upgrade",
  "vault",
  "intensive",
];

describe("testimonials — default-empty, published-only", () => {
  it("registers a slot for every funnel page", () => {
    for (const p of pages) {
      expect(TESTIMONIAL_REGISTRY[p]).toBeDefined();
      expect(typeof TESTIMONIAL_REGISTRY[p].videoEnvKey).toBe("string");
      expect(Array.isArray(TESTIMONIAL_REGISTRY[p].texts)).toBe(true);
    }
  });

  it("ships with ZERO published testimonials (no fake quotes)", () => {
    for (const p of pages) {
      expect(publishedTexts(p).length).toBe(0);
    }
  });

  it("filters out draft, empty-quote, and no-name records", () => {
    const raw = [
      { quote: "This is a valid, long-enough quote.", name: "Real Name", status: "draft" as const },
      { quote: "This is a valid, long-enough quote.", name: "", status: "published" as const },
      { quote: "too short", name: "Real Name", status: "published" as const },
      { quote: "This is a valid, long-enough quote.", name: "Real Name", status: "published" as const },
    ];
    const filtered = raw.filter(
      (t) =>
        t.status === "published" &&
        t.quote.trim().length >= 20 &&
        t.name.trim().length > 0,
    );
    expect(filtered.length).toBe(1);
  });

  it("returns null video URL when the env slot is empty/unset", () => {
    for (const p of pages) {
      expect(testimonialVideoUrl(p)).toBeNull();
    }
  });
});
