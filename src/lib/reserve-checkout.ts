/**
 * Shopify checkout URLs for the active reservation funnel.
 *
 * Only permanent cart permalinks are configured here. Temporary Shopify
 * `/checkouts/cn/` sessions are deliberately rejected because they can expire
 * or redirect a new buyer away from checkout.
 */
import { isAllowedCheckoutUrl } from "./challenge-config";

export type ReserveBundle = "ga" | "ga_vip" | "ga_vip_vault";

export const RESERVE_ENV_KEY: Record<ReserveBundle, string> = {
  ga: "VITE_SHOPIFY_URL_GA",
  ga_vip: "VITE_SHOPIFY_URL_GA_VIP",
  ga_vip_vault: "VITE_SHOPIFY_URL_GA_VIP_VAULT",
};

const ALLOWED_HOSTS_ENV_KEY = "VITE_SHOPIFY_ALLOWED_CHECKOUT_HOSTS";
const DEFAULT_SHOPIFY_CHECKOUT_HOSTS = ["spincityhq.com"] as const;

function normalizeExtras(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && /^[a-z0-9.-]+$/.test(s));
}

/**
 * Pure resolver: takes a bundle key and an env map, returns a validated
 * HTTPS checkout URL or null. Only the store hostname and explicitly
 * configured Shopify hosts are allowed.
 */
export function validateReserveCheckoutUrl(
  bundle: ReserveBundle,
  env: Record<string, string | undefined>,
): string | null {
  const raw = (env[RESERVE_ENV_KEY[bundle]] ?? "").trim();
  if (!raw) return null;
  const extras = normalizeExtras(env[ALLOWED_HOSTS_ENV_KEY]);
  const hosts = Array.from(new Set([...DEFAULT_SHOPIFY_CHECKOUT_HOSTS, ...extras]));
  if (!isAllowedCheckoutUrl(raw, hosts)) return null;
  const url = new URL(raw);
  if (!/^\/cart\/\d+:1$/.test(url.pathname)) return null;
  if (!url.searchParams.has("checkout")) return null;
  return raw;
}

export function resolveReserveCheckoutUrl(bundle: ReserveBundle): string | null {
  return validateReserveCheckoutUrl(bundle, import.meta.env as Record<string, string | undefined>);
}

export function isReserveCheckoutReady(bundle: ReserveBundle): boolean {
  return resolveReserveCheckoutUrl(bundle) !== null;
}
