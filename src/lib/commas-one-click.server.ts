import { createHash, randomUUID } from "node:crypto";
import { expectedTotalCents } from "./tiers";

/**
 * One-click is intentionally limited to the two small post-purchase steps.
 * The $1,000 Intensive keeps a full provider checkout because it has hard-cap
 * inventory and materially higher chargeback risk.
 */
export type OneClickProduct = "vip_upgrade" | "vault";

export interface OneClickCard {
  customerId: string;
  paymentMethodId: string;
  brand: string;
  last4: string;
}

export interface OneClickConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  environment: "sandbox" | "production";
  serviceIds: Record<OneClickProduct, string>;
}

export interface DirectChargeResult {
  chargeId: string;
  amountDollars: number | null;
  status: string;
}

export class CommasOneClickError extends Error {
  readonly code: string;
  readonly uncertain: boolean;

  constructor(code: string, message: string, uncertain = false) {
    super(message);
    this.name = "CommasOneClickError";
    this.code = code;
    this.uncertain = uncertain;
  }
}

const PRODUCT_ENV: Record<OneClickProduct, string> = {
  vip_upgrade: "COMMAS_PRODUCT_ID_VIP_UPGRADE",
  vault: "COMMAS_PRODUCT_ID_VAULT",
};

const PRODUCT_DESCRIPTION: Record<OneClickProduct, string> = {
  vip_upgrade: "AI AutoPilot Summit — VIP Implementation Experience",
  vault: "AI AutoPilot Summit — Implementation Vault",
};

export const ONE_CLICK_SUCCESS_PATH: Record<OneClickProduct, string> = {
  vip_upgrade: "/offer/implementation-vault",
  vault: "/strategy-intensive",
};

export function isOneClickProduct(value: unknown): value is OneClickProduct {
  return value === "vip_upgrade" || value === "vault";
}

export function getOneClickConfig(
  env: Record<string, string | undefined> = process.env,
): OneClickConfig | null {
  const enabled = env.COMMAS_ONE_CLICK_ENABLED === "true";
  const environment = env.COMMAS_API_ENV;
  const apiKey = env.COMMAS_API_KEY?.trim() ?? "";

  if (!enabled || !apiKey) return null;
  if (environment !== "sandbox" && environment !== "production") return null;

  const serviceIds = {} as Record<OneClickProduct, string>;
  for (const product of Object.keys(PRODUCT_ENV) as OneClickProduct[]) {
    const id = env[PRODUCT_ENV[product]]?.trim() ?? "";
    if (!id) return null;
    serviceIds[product] = id;
  }

  return {
    enabled: true,
    environment,
    apiKey,
    baseUrl:
      environment === "sandbox"
        ? "https://qa.dev-fan-basis.com"
        : "https://www.fanbasis.com",
    serviceIds,
  };
}

export function oneClickEligibility(
  scopes: readonly string[],
  product: OneClickProduct,
): { eligible: boolean; alreadyOwned: boolean } {
  const hasVip = scopes.includes("vip") || scopes.includes("vip_upgrade");
  const hasGa = scopes.includes("ga") || hasVip;
  const hasVault = scopes.includes("vault");

  if (product === "vip_upgrade") {
    return { eligible: hasGa && !hasVip, alreadyOwned: hasVip };
  }
  return { eligible: hasVip && !hasVault, alreadyOwned: hasVault };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { response, json };
  } catch (error) {
    const code =
      error instanceof Error && error.name === "AbortError"
        ? "commas-timeout"
        : "commas-network";
    throw new CommasOneClickError(code, "Commas could not be reached", true);
  } finally {
    clearTimeout(timer);
  }
}

export async function findSavedCard(
  buyerEmail: string,
  cfg: OneClickConfig,
): Promise<OneClickCard | null> {
  const normalizedEmail = buyerEmail.trim().toLowerCase();
  const customerResult = await fetchJson(
    `${cfg.baseUrl}/public-api/customers?search=${encodeURIComponent(normalizedEmail)}&per_page=20`,
    {
      method: "GET",
      headers: { "x-api-key": cfg.apiKey },
      cache: "no-store",
    },
  );

  if (!customerResult.response.ok) {
    throw new CommasOneClickError(
      `customer-search-${customerResult.response.status}`,
      "Customer lookup failed",
      customerResult.response.status >= 500,
    );
  }

  const customerRoot = asRecord(customerResult.json);
  const customerData = asRecord(customerRoot?.data);
  const customers = Array.isArray(customerData?.customers)
    ? customerData.customers
    : [];

  const exact = customers
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .filter(
      (row) =>
        typeof row.email === "string" &&
        row.email.trim().toLowerCase() === normalizedEmail,
    )
    .sort((a, b) => {
      const at =
        typeof a.last_transaction_date === "string"
          ? Date.parse(a.last_transaction_date)
          : 0;
      const bt =
        typeof b.last_transaction_date === "string"
          ? Date.parse(b.last_transaction_date)
          : 0;
      return bt - at;
    })[0];

  if (
    !exact ||
    (typeof exact.id !== "string" && typeof exact.id !== "number")
  ) {
    return null;
  }

  const customerId = String(exact.id);
  const methodsResult = await fetchJson(
    `${cfg.baseUrl}/public-api/customers/${encodeURIComponent(customerId)}/payment-methods`,
    {
      method: "GET",
      headers: { "x-api-key": cfg.apiKey },
      cache: "no-store",
    },
  );

  if (!methodsResult.response.ok) {
    throw new CommasOneClickError(
      `payment-methods-${methodsResult.response.status}`,
      "Saved payment method lookup failed",
      methodsResult.response.status >= 500,
    );
  }

  const methodsRoot = asRecord(methodsResult.json);
  const methodsData = asRecord(methodsRoot?.data);
  const methods = Array.isArray(methodsData?.payment_methods)
    ? methodsData.payment_methods
    : [];

  const cards = methods
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .filter(
      (row) =>
        row.type === "card" &&
        typeof row.last4 === "string" &&
        /^[0-9]{4}$/.test(row.last4) &&
        (typeof row.id === "string" ||
          typeof row.payment_method_uuid === "string"),
    );

  const card = cards.find((row) => row.is_default === true) ?? cards[0];
  if (!card) return null;

  const metadata = asRecord(card.metadata);
  const metadataData = asRecord(metadata?.data);
  const rawBrand =
    typeof metadataData?.card_type === "string"
      ? metadataData.card_type
      : "card";

  const paymentMethodId =
    typeof card.id === "string" ? card.id : String(card.payment_method_uuid);

  return {
    customerId,
    paymentMethodId,
    brand: formatCardBrand(rawBrand),
    last4: String(card.last4),
  };
}

export async function chargeSavedCard(params: {
  cfg: OneClickConfig;
  product: OneClickProduct;
  card: OneClickCard;
  idempotencyKey: string;
}): Promise<DirectChargeResult> {
  const amountCents = expectedTotalCents(params.product);
  const result = await fetchJson(
    `${params.cfg.baseUrl}/public-api/customers/${encodeURIComponent(params.card.customerId)}/charge`,
    {
      method: "POST",
      headers: {
        "x-api-key": params.cfg.apiKey,
        "content-type": "application/json",
        "idempotency-key": params.idempotencyKey,
      },
      body: JSON.stringify({
        payment_method_id: params.card.paymentMethodId,
        service_id: params.cfg.serviceIds[params.product],
        amount_cents: amountCents,
        description: PRODUCT_DESCRIPTION[params.product],
        metadata: {
          source: "nuamenti-summit-one-click",
          funnel_product: params.product,
          request_id: randomUUID(),
        },
      }),
      cache: "no-store",
    },
  );

  const root = asRecord(result.json);
  const data = asRecord(root?.data);
  const status = typeof data?.status === "string" ? data.status : "unknown";
  const chargeId = typeof data?.charge_id === "string" ? data.charge_id : "";

  if (
    !result.response.ok ||
    root?.status !== "success" ||
    status !== "succeeded" ||
    !chargeId
  ) {
    const uncertain =
      result.response.status === 409 || result.response.status >= 500;
    throw new CommasOneClickError(
      `charge-${result.response.status || "unknown"}`,
      "Saved-card charge did not succeed",
      uncertain,
    );
  }

  return {
    chargeId,
    amountDollars: typeof data?.amount === "number" ? data.amount : null,
    status,
  };
}

export function makeIdempotencyKey(
  buyerEmail: string,
  product: OneClickProduct,
): string {
  const nonce = randomUUID();
  return `summit-${createHash("sha256")
    .update(`${buyerEmail.trim().toLowerCase()}:${product}:${nonce}`)
    .digest("hex")}`;
}

function formatCardBrand(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "amex" || normalized === "american_express") {
    return "Amex";
  }
  if (normalized === "mastercard" || normalized === "master_card") {
    return "Mastercard";
  }
  if (normalized === "visa") return "Visa";
  if (normalized === "discover") return "Discover";
  return "Card";
}
