/**
 * AI AutoPilot Summit — environment-driven configuration.
 *
 * Rules:
 *  - Commas checkout URLs come from env. Missing/invalid URL for a product
 *    → the corresponding CTA MUST be disabled and read "Registration opening soon."
 *  - Sales gate `VITE_SUMMIT_SALES_ENABLED` must be the literal string "true"
 *    for any handoff button to enable.
 *  - Checkout URLs are validated against a strict host allowlist.
 *  - Anything non-HTTPS, malformed, with embedded credentials, or off-allowlist
 *    fails closed with no leak of the reason.
 *  - Dates are stable public facts; exact daily session times are operator-
 *    configured. If not set, the UI shows a graceful "session times sent to
 *    registrants" state — never an invented clock time.
 */

import type { ProductId } from "./tiers";

/** Summit dates (public). Exact daily start/end times are operator-configured. */
export const SUMMIT_DAY_1_ISO = "2026-08-24T00:00:00-04:00";
export const SUMMIT_DAY_2_ISO = "2026-08-25T00:00:00-04:00";
export const SUMMIT_START_ISO = SUMMIT_DAY_1_ISO;

// Backwards-compat alias for older imports.
export const CHALLENGE_START_ISO = SUMMIT_START_ISO;

export const DEFAULT_COMMAS_CHECKOUT_HOSTS: readonly string[] = [
  "www.fanbasis.com",
];

export interface SectionVideoUrls {
  hero?: string;
  confirmedThankYou?: string; // HeyGen thank-you video
}

export interface CommasConfig {
  urls: Partial<Record<ProductId, string>>;
  sectionVideos: SectionVideoUrls;
  salesEnabled: boolean;
  allowedHosts: readonly string[];
  keynote: KeynoteConfig;
}

/** Next NuAmenti keynote — priority-access handoff (details not yet supplied). */
export interface KeynoteConfig {
  announced: boolean; // false until operator sets date/checkout URL
  dateIso?: string;
  price?: string;
  checkoutUrl?: string;
}

function readEnv(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

function parseAllowedHosts(raw: string | undefined): readonly string[] {
  const extras =
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && /^[a-z0-9.-]+$/.test(s)) ?? [];
  return Array.from(new Set([...DEFAULT_COMMAS_CHECKOUT_HOSTS, ...extras]));
}

export function getCommasConfig(): CommasConfig {
  const keynoteUrl = readEnv("VITE_COMMAS_CHECKOUT_URL_KEYNOTE");
  const keynoteDate = readEnv("VITE_KEYNOTE_DATE_ISO");
  const keynotePrice = readEnv("VITE_KEYNOTE_PRICE_LABEL");
  return {
    urls: {
      ga: readEnv("VITE_COMMAS_CHECKOUT_URL_GA"),
      vip: readEnv("VITE_COMMAS_CHECKOUT_URL_VIP"),
      vault: readEnv("VITE_COMMAS_CHECKOUT_URL_VAULT"),
      intensive: readEnv("VITE_COMMAS_CHECKOUT_URL_INTENSIVE"),
    },
    sectionVideos: {
      hero: readEnv("VITE_SUMMIT_VIDEO_HERO"),
      confirmedThankYou: readEnv("VITE_SUMMIT_VIDEO_THANK_YOU"),
    },
    salesEnabled: readEnv("VITE_SUMMIT_SALES_ENABLED") === "true",
    allowedHosts: parseAllowedHosts(
      readEnv("VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS"),
    ),
    keynote: {
      announced: Boolean(keynoteUrl && keynoteDate),
      dateIso: keynoteDate,
      price: keynotePrice,
      checkoutUrl: keynoteUrl,
    },
  };
}

/**
 * Strict validator for a candidate checkout URL. Rejects non-HTTPS,
 * malformed, credential-embedded, or off-allowlist URLs.
 */
export function isAllowedCheckoutUrl(
  candidate: string | undefined | null,
  allowedHosts: readonly string[] = DEFAULT_COMMAS_CHECKOUT_HOSTS,
): boolean {
  if (!candidate || typeof candidate !== "string") return false;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username !== "" || u.password !== "") return false;
  const host = u.hostname.toLowerCase();
  return allowedHosts.includes(host);
}

/** Returns a validated checkout URL for the product, or null. */
export function resolveCheckoutUrl(
  product: ProductId,
  cfg: CommasConfig = getCommasConfig(),
): string | null {
  const raw = cfg.urls[product];
  const hosts = cfg.allowedHosts ?? DEFAULT_COMMAS_CHECKOUT_HOSTS;
  if (!isAllowedCheckoutUrl(raw, hosts)) return null;
  return raw as string;
}

/**
 * Handoff gate. A product's pay button may only be enabled when:
 *  - salesEnabled === true, AND
 *  - its Commas URL passes the allowlist.
 * Intensive additionally requires verified slots-remaining > 0 (enforced at
 * the call site via the intensive-slots hook).
 */
export function isHandoffAllowed(
  product: ProductId,
  cfg: CommasConfig = getCommasConfig(),
): boolean {
  if (!cfg.salesEnabled) return false;
  return resolveCheckoutUrl(product, cfg) !== null;
}
