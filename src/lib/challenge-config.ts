/**
 * AI AutoPilot Summit — environment-driven configuration.
 *
 * Every checkout URL is individually fail-closed: missing or off-allowlist
 * → the corresponding CTA is disabled with a neutral message. The sales
 * gate `VITE_SUMMIT_SALES_ENABLED` must be the literal string "true".
 */

import type { ProductId } from "./tiers";

export const SUMMIT_DAY_1_ISO = "2026-08-24T00:00:00-04:00";
export const SUMMIT_DAY_2_ISO = "2026-08-25T00:00:00-04:00";
export const SUMMIT_START_ISO = SUMMIT_DAY_1_ISO;
export const CHALLENGE_START_ISO = SUMMIT_START_ISO;

export const DEFAULT_COMMAS_CHECKOUT_HOSTS: readonly string[] = [
  "www.fanbasis.com",
];

export interface SectionVideoUrls {
  hero?: string;
  confirmedThankYou?: string;
}

export interface KeynoteConfig {
  announced: boolean;
  dateIso?: string;
  price?: string;
  checkoutUrl?: string;
}

export interface CommasConfig {
  urls: Partial<Record<ProductId, string>>;
  sectionVideos: SectionVideoUrls;
  salesEnabled: boolean;
  legalReady: boolean;
  upsellsEnabled: boolean;
  intensiveSalesEnabled: boolean;
  keynoteSalesEnabled: boolean;
  mentorshipApplicationsEnabled: boolean;
  allowedHosts: readonly string[];
  keynote: KeynoteConfig;
}

function readEnv(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

function parseAllowedHosts(raw: string | undefined): readonly string[] {
  const extras = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && /^[a-z0-9.-]+$/.test(s));
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
      vip_upgrade: readEnv("VITE_COMMAS_CHECKOUT_URL_VIP_UPGRADE"),
      vault: readEnv("VITE_COMMAS_CHECKOUT_URL_VAULT"),
      intensive: readEnv("VITE_COMMAS_CHECKOUT_URL_INTENSIVE"),
    },
    sectionVideos: {
      hero: readEnv("VITE_SUMMIT_VIDEO_HERO"),
      confirmedThankYou: readEnv("VITE_SUMMIT_VIDEO_THANK_YOU"),
    },
    salesEnabled: readEnv("VITE_SUMMIT_SALES_ENABLED") === "true",
    legalReady: readEnv("VITE_SUMMIT_LEGAL_READY") === "true",
    upsellsEnabled: readEnv("VITE_SUMMIT_UPSELLS_ENABLED") === "true",
    intensiveSalesEnabled:
      readEnv("VITE_SUMMIT_INTENSIVE_SALES_ENABLED") === "true",
    keynoteSalesEnabled:
      readEnv("VITE_SUMMIT_KEYNOTE_SALES_ENABLED") === "true",
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

// Duplicate readEnv/parseAllowedHosts removed below.


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
  return allowedHosts.includes(u.hostname.toLowerCase());
}

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
 * Product-specific gate check.
 * - ga / vip use VITE_SUMMIT_SALES_ENABLED.
 * - vip_upgrade / vault use VITE_SUMMIT_UPSELLS_ENABLED.
 * - intensive uses VITE_SUMMIT_INTENSIVE_SALES_ENABLED.
 * The core sales gate is a required precondition for everything.
 */
export function isHandoffAllowed(
  product: ProductId,
  cfg: CommasConfig = getCommasConfig(),
): boolean {
  if (!cfg.salesEnabled) return false;
  if (!cfg.legalReady) return false;
  if (product === "vip_upgrade" || product === "vault") {
    if (!cfg.upsellsEnabled) return false;
  } else if (product === "intensive") {
    if (!cfg.intensiveSalesEnabled) return false;
  }
  return resolveCheckoutUrl(product, cfg) !== null;
}

/**
 * Keynote checkout — the raw env URL must pass the same HTTPS allowlist
 * as every other CTA. Never renders `cfg.keynote.checkoutUrl` directly.
 */
export function resolveKeynoteCheckoutUrl(
  cfg: CommasConfig = getCommasConfig(),
): string | null {
  const raw = cfg.keynote.checkoutUrl;
  const hosts = cfg.allowedHosts ?? DEFAULT_COMMAS_CHECKOUT_HOSTS;
  return isAllowedCheckoutUrl(raw, hosts) ? (raw as string) : null;
}

export function isKeynoteHandoffAllowed(
  cfg: CommasConfig = getCommasConfig(),
): boolean {
  if (!cfg.salesEnabled) return false;
  if (!cfg.legalReady) return false;
  if (!cfg.keynoteSalesEnabled) return false;
  return resolveKeynoteCheckoutUrl(cfg) !== null;
}


