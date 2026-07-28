/**
 * Reserve funnel — bundle checkout URLs.
 *
 * Only for the /reserve → /reserve/vip → /reserve/vault flow. Uses its
 * OWN env variables (VITE_COMMAS_URL_GA, VITE_COMMAS_URL_GA_VIP,
 * VITE_COMMAS_URL_GA_VIP_VAULT) so it does NOT depend on the existing
 * sequential-funnel sales / upsell gates.
 *
 * Fails closed on missing, non-HTTPS, embedded creds, or off-allowlist
 * hosts. Never logs the URL values.
 */
import {
  DEFAULT_COMMAS_CHECKOUT_HOSTS,
  isAllowedCheckoutUrl,
} from "./challenge-config";

export type ReserveBundle = "ga" | "ga_vip" | "ga_vip_vault";

const ENV_KEY: Record<ReserveBundle, string> = {
  ga: "VITE_COMMAS_URL_GA",
  ga_vip: "VITE_COMMAS_URL_GA_VIP",
  ga_vip_vault: "VITE_COMMAS_URL_GA_VIP_VAULT",
};

function readEnv(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

export function resolveReserveCheckoutUrl(
  bundle: ReserveBundle,
): string | null {
  const raw = readEnv(ENV_KEY[bundle]);
  if (!isAllowedCheckoutUrl(raw, DEFAULT_COMMAS_CHECKOUT_HOSTS)) return null;
  return raw as string;
}

export function isReserveCheckoutReady(bundle: ReserveBundle): boolean {
  return resolveReserveCheckoutUrl(bundle) !== null;
}
