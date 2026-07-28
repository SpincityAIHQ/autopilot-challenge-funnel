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
 *
 * The pure `validateReserveCheckoutUrl` accepts an injected env-like map
 * and an optional additional-host allowlist so it is directly unit
 * testable without touching `import.meta.env`.
 */
import {
  DEFAULT_COMMAS_CHECKOUT_HOSTS,
  isAllowedCheckoutUrl,
} from "./challenge-config";

export type ReserveBundle = "ga" | "ga_vip" | "ga_vip_vault";

export const RESERVE_ENV_KEY: Record<ReserveBundle, string> = {
  ga: "VITE_COMMAS_URL_GA",
  ga_vip: "VITE_COMMAS_URL_GA_VIP",
  ga_vip_vault: "VITE_COMMAS_URL_GA_VIP_VAULT",
};

const ALLOWED_HOSTS_ENV_KEY = "VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS";

function normalizeExtras(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && /^[a-z0-9.-]+$/.test(s));
}

/**
 * Pure resolver: takes a bundle key and an env map, returns a validated
 * HTTPS checkout URL or null. Uses DEFAULT_COMMAS_CHECKOUT_HOSTS plus any
 * additional hosts configured via VITE_COMMAS_ALLOWED_CHECKOUT_HOSTS.
 */
export function validateReserveCheckoutUrl(
  bundle: ReserveBundle,
  env: Record<string, string | undefined>,
): string | null {
  const raw = (env[RESERVE_ENV_KEY[bundle]] ?? "").trim();
  if (!raw) return null;
  const extras = normalizeExtras(env[ALLOWED_HOSTS_ENV_KEY]);
  const hosts = Array.from(
    new Set([...DEFAULT_COMMAS_CHECKOUT_HOSTS, ...extras]),
  );
  return isAllowedCheckoutUrl(raw, hosts) ? raw : null;
}

export function resolveReserveCheckoutUrl(
  bundle: ReserveBundle,
): string | null {
  return validateReserveCheckoutUrl(
    bundle,
    import.meta.env as Record<string, string | undefined>,
  );
}

export function isReserveCheckoutReady(bundle: ReserveBundle): boolean {
  return resolveReserveCheckoutUrl(bundle) !== null;
}

/**
 * Server-side equivalent that reads process.env. Used inside
 * `/api/public/reserve-upgrade` when validating the vault handoff URL.
 */
export function resolveReserveCheckoutUrlFromProcessEnv(
  bundle: ReserveBundle,
): string | null {
  return validateReserveCheckoutUrl(
    bundle,
    process.env as Record<string, string | undefined>,
  );
}
