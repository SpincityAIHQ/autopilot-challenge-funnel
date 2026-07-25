/**
 * Testimonial system — page-keyed, config-driven, DEFAULT EMPTY.
 *
 * Rules:
 *  - Nothing renders publicly unless `status === "published"` AND (for text)
 *    all required fields are present.
 *  - Video URL comes from env slots and is normalized through the existing
 *    approved-host allowlist (YouTube/Vimeo). Empty → no video slot.
 *  - Text testimonials are hard-coded here so an operator can add real,
 *    approved quotes without a database migration. Ship EMPTY arrays until
 *    real approved content exists.
 *  - No fake names, no fake quotes, no fake results, no lorem ipsum, no
 *    "placeholder testimonial" cards.
 *
 * The public-facing UX must include an honest note beside every rendered
 * testimonial block ("individual results vary — no income outcome is
 * guaranteed"). That copy lives in the TestimonialSection component so
 * it can't be omitted per page.
 */

export type TestimonialPageKey =
  | "landing"
  | "checkout"
  | "confirmed"
  | "vip_upgrade"
  | "vault"
  | "intensive";

export type TestimonialStatus = "draft" | "published";

export interface TextTestimonial {
  quote: string;
  name: string;
  roleCompany?: string;
  /** Optional verified concrete result (short, factual). */
  verifiedResult?: string;
  status: TestimonialStatus;
}

export interface TestimonialSectionData {
  /** Optional env-key for the page-specific video embed URL. */
  videoEnvKey: string;
  /** Approved text testimonials for this page (leave empty until real). */
  texts: readonly TextTestimonial[];
}

/**
 * Registry of testimonial slots per page.
 * Text arrays are intentionally EMPTY. Operators fill them in with
 * real, released quotes. Anything with status !== "published" is filtered.
 */
export const TESTIMONIAL_REGISTRY: Record<
  TestimonialPageKey,
  TestimonialSectionData
> = {
  landing: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_LANDING",
    texts: [],
  },
  checkout: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_CHECKOUT",
    texts: [],
  },
  confirmed: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_CONFIRMED",
    texts: [],
  },
  vip_upgrade: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_VIP",
    texts: [],
  },
  vault: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_VAULT",
    texts: [],
  },
  intensive: {
    videoEnvKey: "VITE_TESTIMONIAL_VIDEO_INTENSIVE",
    texts: [],
  },
};

/** Return only published text testimonials — never draft. */
export function publishedTexts(
  page: TestimonialPageKey,
): readonly TextTestimonial[] {
  return TESTIMONIAL_REGISTRY[page].texts.filter(
    (t) => t.status === "published" && isCompleteText(t),
  );
}

function isCompleteText(t: TextTestimonial): boolean {
  return (
    typeof t.quote === "string" &&
    t.quote.trim().length >= 20 &&
    typeof t.name === "string" &&
    t.name.trim().length > 0
  );
}

/** Read the configured video URL for a page. Empty string / undefined → null. */
export function testimonialVideoUrl(page: TestimonialPageKey): string | null {
  const key = TESTIMONIAL_REGISTRY[page].videoEnvKey;
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
