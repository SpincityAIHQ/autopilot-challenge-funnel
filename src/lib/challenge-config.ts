/**
 * Public, environment-driven configuration for the funnel.
 *
 * All Commas checkout URLs come from env. When any required URL for the
 * selected tier is missing, the final pay button MUST be disabled and read
 * "Registration opening soon." This app never fabricates a payment path.
 */

import type { TierId } from "./tiers";

export const CHALLENGE_START_ISO = "2026-08-01T12:00:00-04:00";
export const CHALLENGE_END_ISO = "2026-08-02T14:00:00-04:00";

export interface CommasConfig {
  urls: Partial<Record<TierId, string>>;
  bumpUrl: string | undefined;
  videoUrl: string | undefined;
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
    bumpUrl: readEnv("VITE_COMMAS_CHECKOUT_URL_GA_BUMP"),
    videoUrl: readEnv("VITE_CHALLENGE_PREVIEW_VIDEO_URL"),
  };
}

/**
 * Returns the checkout URL for the given selection, or null if the config
 * required for that selection is missing. Callers must disable the final
 * pay button whenever this returns null.
 */
export function resolveCheckoutUrl(
  tier: TierId,
  bump: boolean,
  cfg: CommasConfig = getCommasConfig(),
): string | null {
  if (tier === "ga" && bump) {
    return cfg.bumpUrl ?? cfg.urls.ga ?? null;
  }
  return cfg.urls[tier] ?? null;
}
