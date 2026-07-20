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
 */

import type { TierId } from "./tiers";

export const CHALLENGE_START_ISO = "2026-08-01T12:00:00-04:00";
export const CHALLENGE_END_ISO = "2026-08-02T14:00:00-04:00";

export interface CommasConfig {
  urls: Partial<Record<TierId, string>>;
  videoUrl: string | undefined;
  salesEnabled: boolean;
}

function readEnv(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
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
    salesEnabled: readEnv("VITE_CHALLENGE_SALES_ENABLED") === "true",
  };
}

/**
 * Returns the Commas checkout URL for the selected tier, or null when
 * missing. There is no GA-bump URL — the bump lives INSIDE the GA checkout.
 */
export function resolveCheckoutUrl(
  tier: TierId,
  cfg: CommasConfig = getCommasConfig(),
): string | null {
  return cfg.urls[tier] ?? null;
}

/**
 * Overall handoff gate. A tier's pay button may only be enabled when:
 *  - salesEnabled === true (env-configured), AND
 *  - the tier's Commas URL is present.
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
