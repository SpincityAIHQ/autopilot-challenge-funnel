/**
 * Commas saved-card adapter — SERVER ONLY.
 *
 * Nothing in this file may be imported from a client component. It holds the
 * API key, the customer id, and the payment-method id, none of which are ever
 * serialized to the browser. Callers receive only `{ brand, last4 }`.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS ENV-DRIVEN INSTEAD OF HARD-CODED
 * ---------------------------------------------------------------------------
 * Commas documents customer lookup, saved payment-method retrieval, a direct
 * charge against a stored method, and an `Idempotency-Key` header. The exact
 * request paths and response field names were NOT verifiable from a signed
 * sample or a readable API reference at build time, so this adapter does not
 * guess them. It reads them from configuration instead, exactly like the
 * ATTRIBUTION BLOCKED note in the Commas webhook route.
 *
 * The consequence is deliberate and safe: until an operator supplies verified
 * values, `getOneClickConfig()` returns null, the API route reports that
 * one-click is unavailable, and every buyer is routed to the normal Commas
 * checkout link. The funnel never breaks and no charge is ever attempted
 * against an unverified endpoint.
 *
 * Fill these in from the live Commas API reference, verify them against the
 * sandbox first, and only then enable the flag. See docs/commas-one-click.md.
 */

export interface OneClickConfig {
  apiKey: string;
  baseUrl: string;
  /** Path template for customer lookup. `{email}` is URL-encoded on use. */
  customerLookupPath: string;
  /** Path template for saved payment methods. `{customerId}` is substituted. */
  paymentMethodsPath: string;
  /** Path for creating a direct charge against a stored payment method. */
  chargePath: string;
  /** Dotted response paths, so field naming differences need no code change. */
  fields: {
    customerId: string;
    paymentMethods: string;
    paymentMethodId: string;
    cardBrand: string;
    cardLast4: string;
    chargeId: string;
    chargeStatus: string;
  };
  /** Status strings Commas returns that mean the money definitely moved. */
  succeededStatuses: readonly string[];
  /** Status strings that mean the charge definitively did not happen. */
  failedStatuses: readonly string[];
  timeoutMs: number;
}

const DEFAULT_FIELDS: OneClickConfig["fields"] = {
  customerId: "id",
  paymentMethods: "data",
  paymentMethodId: "id",
  cardBrand: "card.brand",
  cardLast4: "card.last4",
  chargeId: "id",
  chargeStatus: "status",
};

const DEFAULT_SUCCEEDED = ["succeeded", "paid", "captured", "completed"];
const DEFAULT_FAILED = ["failed", "declined", "canceled", "cancelled"];

function readEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  const v = env[key];
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

function readList(
  env: Record<string, string | undefined>,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const raw = readEnv(env, key);
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

/**
 * Returns null — meaning "fall back to secure checkout" — unless one-click is
 * explicitly enabled AND every value needed to talk to Commas is present.
 * There is no partial mode.
 */
export function getOneClickConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): OneClickConfig | null {
  if (readEnv(env, "COMMAS_ONE_CLICK_ENABLED") !== "true") return null;

  const apiKey = readEnv(env, "COMMAS_API_KEY");
  const baseUrl = readEnv(env, "COMMAS_API_BASE_URL");
  const customerLookupPath = readEnv(env, "COMMAS_CUSTOMER_LOOKUP_PATH");
  const paymentMethodsPath = readEnv(env, "COMMAS_PAYMENT_METHODS_PATH");
  const chargePath = readEnv(env, "COMMAS_CHARGE_PATH");

  if (!apiKey || !baseUrl || !customerLookupPath || !paymentMethodsPath || !chargePath) {
    return null;
  }

  // The API base must be HTTPS. An http:// base would put the API key on the
  // wire in clear text.
  let parsedBase: URL;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    return null;
  }
  if (parsedBase.protocol !== "https:") return null;

  const timeoutRaw = Number(readEnv(env, "COMMAS_API_TIMEOUT_MS") ?? "10000");
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw >= 1000 && timeoutRaw <= 30000 ? timeoutRaw : 10000;

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    customerLookupPath,
    paymentMethodsPath,
    chargePath,
    fields: {
      customerId: readEnv(env, "COMMAS_FIELD_CUSTOMER_ID") ?? DEFAULT_FIELDS.customerId,
      paymentMethods: readEnv(env, "COMMAS_FIELD_PAYMENT_METHODS") ?? DEFAULT_FIELDS.paymentMethods,
      paymentMethodId:
        readEnv(env, "COMMAS_FIELD_PAYMENT_METHOD_ID") ?? DEFAULT_FIELDS.paymentMethodId,
      cardBrand: readEnv(env, "COMMAS_FIELD_CARD_BRAND") ?? DEFAULT_FIELDS.cardBrand,
      cardLast4: readEnv(env, "COMMAS_FIELD_CARD_LAST4") ?? DEFAULT_FIELDS.cardLast4,
      chargeId: readEnv(env, "COMMAS_FIELD_CHARGE_ID") ?? DEFAULT_FIELDS.chargeId,
      chargeStatus: readEnv(env, "COMMAS_FIELD_CHARGE_STATUS") ?? DEFAULT_FIELDS.chargeStatus,
    },
    succeededStatuses: readList(env, "COMMAS_SUCCEEDED_STATUSES", DEFAULT_SUCCEEDED),
    failedStatuses: readList(env, "COMMAS_FAILED_STATUSES", DEFAULT_FAILED),
    timeoutMs,
  };
}

/** Reads `a.b.c` out of a parsed JSON body without throwing. */
export function readPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  let cursor: unknown = source;
  for (const segment of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Digits only, last four. Anything else is rejected so a full PAN can never be
 * passed through to the browser by a field-path misconfiguration.
 */
export function sanitizeLast4(value: unknown): string | null {
  const raw = asNonEmptyString(value);
  if (!raw) return null;
  if (!/^\d{4}$/.test(raw)) return null;
  return raw;
}

/** Short, printable brand label. Never trusted verbatim into the DOM length-wise. */
export function sanitizeBrand(value: unknown): string {
  const raw = asNonEmptyString(value);
  if (!raw) return "Card";
  const cleaned = raw.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 24);
  if (cleaned === "") return "Card";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Server-side view of a saved card. `brand`/`last4` are the only exportable parts. */
export interface SavedCard {
  customerId: string;
  paymentMethodId: string;
  brand: string;
  last4: string;
}

async function commasFetch(
  cfg: OneClickConfig,
  path: string,
  init: RequestInit,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    // Never surface the underlying error: it can contain the request URL and
    // therefore the customer id.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds the buyer's Commas customer record and their default saved card.
 * Returns null whenever anything is missing, malformed, or unreachable — the
 * caller must treat null as "show secure checkout instead".
 */
export async function findSavedCard(email: string, cfg: OneClickConfig): Promise<SavedCard | null> {
  const lookupPath = cfg.customerLookupPath.replace("{email}", encodeURIComponent(email));
  const customerBody = await commasFetch(cfg, lookupPath, { method: "GET" });
  if (customerBody === null) return null;

  // A lookup may return the customer directly or a single-element collection.
  const direct = readPath(customerBody, cfg.fields.customerId);
  let customerId = asNonEmptyString(direct);
  if (!customerId) {
    const collection = readPath(customerBody, cfg.fields.paymentMethods);
    if (Array.isArray(collection) && collection.length > 0) {
      customerId = asNonEmptyString(readPath(collection[0], cfg.fields.customerId));
    }
  }
  if (!customerId) return null;

  const methodsPath = cfg.paymentMethodsPath.replace(
    "{customerId}",
    encodeURIComponent(customerId),
  );
  const methodsBody = await commasFetch(cfg, methodsPath, { method: "GET" });
  if (methodsBody === null) return null;

  const rawMethods = readPath(methodsBody, cfg.fields.paymentMethods);
  const methods = Array.isArray(rawMethods)
    ? rawMethods
    : Array.isArray(methodsBody)
      ? methodsBody
      : [];

  for (const method of methods) {
    const paymentMethodId = asNonEmptyString(readPath(method, cfg.fields.paymentMethodId));
    const last4 = sanitizeLast4(readPath(method, cfg.fields.cardLast4));
    if (!paymentMethodId || !last4) continue;
    return {
      customerId,
      paymentMethodId,
      brand: sanitizeBrand(readPath(method, cfg.fields.cardBrand)),
      last4,
    };
  }

  return null;
}

export type ChargeOutcome = "succeeded" | "failed" | "unknown";

export interface ChargeResult {
  outcome: ChargeOutcome;
  paymentId: string | null;
}

/**
 * Charges a stored payment method directly.
 *
 * `idempotencyKey` is sent as `Idempotency-Key` so a retried or duplicated
 * request cannot take the money twice on the Commas side.
 *
 * Any ambiguity — a network abort, a non-2xx, an unrecognized status string —
 * resolves to `"unknown"`, never to `"failed"`. `"failed"` is reserved for a
 * status Commas explicitly reports as declined, because only that is safe to
 * let the buyer retry.
 */
export async function chargeSavedCard(
  params: {
    customerId: string;
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    description: string;
    email: string;
  },
  cfg: OneClickConfig,
): Promise<ChargeResult> {
  const body = await commasFetch(cfg, cfg.chargePath, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": params.idempotencyKey,
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      payment_method_id: params.paymentMethodId,
      amount: params.amountCents,
      currency: params.currency,
      description: params.description,
      email: params.email,
      off_session: true,
      confirm: true,
    }),
  });

  if (body === null) return { outcome: "unknown", paymentId: null };

  const paymentId = asNonEmptyString(readPath(body, cfg.fields.chargeId));
  const status = asNonEmptyString(readPath(body, cfg.fields.chargeStatus))?.toLowerCase();

  if (status && cfg.succeededStatuses.includes(status)) {
    // A success with no payment id is unusable: fulfillment and reversal are
    // both keyed by the Commas payment id.
    if (!paymentId) return { outcome: "unknown", paymentId: null };
    return { outcome: "succeeded", paymentId };
  }
  if (status && cfg.failedStatuses.includes(status)) {
    return { outcome: "failed", paymentId };
  }
  return { outcome: "unknown", paymentId };
}
