/**
 * Public, environment-driven configuration for the funnel.
 *
 * Rules:
 *  - Commas checkout URLs come from env. Missing URL for the selected tier
 *    → final pay button MUST be disabled and read "Registration opening soon."
 *  - The $22 GA recordings bump is a NATIVE Commas order bump inside the
 *    GA checkout. This app never fabricates a $99 URL or GA-bump path.
 *  - The overall sales gate `VITE_CHALLENGE_SALES_ENABLED` must be the
 *    literal string "true" for any handoff button to enable.
 *  - Checkout URLs are validated against a strict host allowlist. Anything
 *    non-HTTPS, malformed, credentials-in-URL, or off-allowlist fails closed.
 */

import type { TierId } from "./tiers";

export const CHALLENGE_START_ISO = "2026-08-01T12:00:00-04:00";
export const CHALLENGE_END_ISO = "2026-08-02T14:00:00-04:00";

/**
 * Default approved official Commas hosted-checkout host. Extra verified
 * hosts can be added via `VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS` (comma-
 * separated). Exact host match only; no suffix tricks.
 */
export const DEFAULT_COMMAS_CHECKOUT_HOSTS: readonly string[] = ["www.fanbasis.com"];

export interface SectionVideoUrls {
  hero: string | undefined;
  dayOne: string | undefined;
  dayTwo: string | undefined;
  chooseAccess: string | undefined;
  gaBump: string | undefined;
  checkout: string | undefined;
  confirmed: string | undefined;
}

export interface CommasConfig {
  urls: Partial<Record<TierId, string>>;
  videoUrl: string | undefined;
  sectionVideos?: SectionVideoUrls;
  salesEnabled: boolean;
  allowedHosts: readonly string[];
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
  return {
    urls: {
      ga: readEnv("VITE_COMMAS_CHECKOUT_URL_GA"),
      vip: readEnv("VITE_COMMAS_CHECKOUT_URL_VIP"),
      bundle: readEnv("VITE_COMMAS_CHECKOUT_URL_BUNDLE"),
      founder: readEnv("VITE_COMMAS_CHECKOUT_URL_FOUNDER"),
    },
    videoUrl: readEnv("VITE_CHALLENGE_PREVIEW_VIDEO_URL"),
    // Per-section video slots. Each is optional; when unset the section
    // renders a "Video coming soon" placeholder rather than an iframe.
    sectionVideos: {
      hero: readEnv("VITE_CHALLENGE_VIDEO_HERO"),
      dayOne: readEnv("VITE_CHALLENGE_VIDEO_DAY_ONE"),
      dayTwo: readEnv("VITE_CHALLENGE_VIDEO_DAY_TWO"),
      chooseAccess: readEnv("VITE_CHALLENGE_VIDEO_CHOOSE_ACCESS"),
      gaBump: readEnv("VITE_CHALLENGE_VIDEO_GA_BUMP"),
      checkout: readEnv("VITE_CHALLENGE_VIDEO_CHECKOUT"),
      confirmed: readEnv("VITE_CHALLENGE_VIDEO_CONFIRMED"),
    },
    salesEnabled: readEnv("VITE_CHALLENGE_SALES_ENABLED") === "true",
    allowedHosts: parseAllowedHosts(readEnv("VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS")),
  };
}


/**
 * Strict validator for a candidate checkout URL. Rejects:
 *  - non-string / empty
 *  - unparseable URL
 *  - non-https
 *  - embedded username/password (credentials-in-URL)
 *  - hosts not on the exact-match allowlist
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

/**
 * Returns the Commas checkout URL for the selected tier, or null when
 * missing OR when it fails the allowlist. There is no GA-bump URL — the
 * bump lives INSIDE the GA checkout.
 */
export function resolveCheckoutUrl(
  tier: TierId,
  cfg: CommasConfig = getCommasConfig(),
): string | null {
  const raw = cfg.urls[tier];
  const hosts = cfg.allowedHosts ?? DEFAULT_COMMAS_CHECKOUT_HOSTS;
  if (!isAllowedCheckoutUrl(raw, hosts)) return null;
  return raw as string;
}

/**
 * Overall handoff gate. A tier's pay button may only be enabled when:
 *  - salesEnabled === true (env-configured), AND
 *  - the tier's Commas URL is present AND passes the allowlist.
 * Founder additionally requires verified seats-remaining > 0 (enforced by
 * the availability hook at call sites).
 */
export function isHandoffAllowed(
  tier: TierId,
  cfg: CommasConfig = getCommasConfig(),
): boolean {
  if (!cfg.salesEnabled) return false;
  return resolveCheckoutUrl(tier, cfg) !== null;
}
