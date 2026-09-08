import { createHmac, timingSafeEqual } from "node:crypto";
import { academyDb, AcademyError } from "./academy.server";
import { readLimitedBody } from "./academy-http.server";
export function verifyShopifySignature(raw: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  try {
    const received = Buffer.from(signature, "base64");
    const expected = createHmac("sha256", secret).update(raw).digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}
const VARIANTS: Record<string, string> = {
  "50980696129783": "ga",
  "50980697571575": "vip",
  "50980698194167": "vault",
  "51080447492343": "accelerator",
};
const EXPECTED_USD_CENTS: Record<string, number> = {
  "50980696129783": 2200,
  "50980697571575": 9900,
  "50980698194167": 29800,
  "51080447492343": 400000,
};
const REQUIRED_TIERS = ["ga", "vip", "vault", "accelerator"] as const;
const COMMERCE_SCHEMA_VERSION = "2026-09-08.2";

type CommerceEnv = Record<string, string | undefined>;

function validAccessTerms(raw: string | undefined) {
  try {
    const terms = JSON.parse(raw || "{}") as Record<string, unknown>;
    return REQUIRED_TIERS.every((tier) => {
      const value = terms[tier] as
        | { starts?: unknown; hours?: unknown; version?: unknown }
        | undefined;
      return (
        value?.starts === "redemption" &&
        Number.isInteger(value.hours) &&
        Number(value.hours) >= 1 &&
        Number(value.hours) <= 87600 &&
        typeof value.version === "string" &&
        value.version.trim().length > 0
      );
    });
  } catch {
    return false;
  }
}

function validGhlHook(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname === "services.leadconnectorhq.com" &&
      url.pathname.startsWith("/hooks/")
    );
  } catch {
    return false;
  }
}

function validSupabaseUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Checkout remains closed until payment verification and transactional access
 * delivery are configured together. This is configuration readiness, not a
 * substitute for the paid/refund/cancellation launch tests in the runbook.
 */
export function academyCommerceReadiness(env: CommerceEnv = process.env) {
  const reasons: string[] = [];
  if (!validSupabaseUrl(env.SUPABASE_URL)) reasons.push("supabase_url_missing");
  if ((env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0) < 20) reasons.push("service_role_missing");
  if (env.ACADEMY_COMMERCE_SCHEMA_VERSION !== COMMERCE_SCHEMA_VERSION)
    reasons.push("commerce_schema_missing");
  if (env.ACADEMY_SHOPIFY_ENABLED !== "true") reasons.push("shopify_disabled");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.ACADEMY_SHOPIFY_SHOP ?? ""))
    reasons.push("shop_domain_missing");
  if ((env.SHOPIFY_ADMIN_ACCESS_TOKEN?.length ?? 0) < 10) reasons.push("admin_token_missing");
  if ((env.ACADEMY_SHOPIFY_WEBHOOK_SECRET?.length ?? 0) < 16)
    reasons.push("webhook_secret_missing");
  if (env.ACADEMY_PAID_ACCESS_ENABLED !== "true") reasons.push("paid_access_disabled");
  if (env.ACADEMY_ACCESS_CODES_ENABLED !== "true") reasons.push("access_codes_disabled");
  if ((env.ACADEMY_ACCESS_CODE_SECRET?.length ?? 0) < 32)
    reasons.push("access_code_secret_missing");
  if (!validAccessTerms(env.ACADEMY_ACCESS_TERMS_JSON)) reasons.push("access_terms_missing");
  if (env.ACADEMY_ACCESS_EMAIL_ENABLED !== "true") reasons.push("access_email_disabled");
  if (!validGhlHook(env.ACADEMY_GHL_ACCESS_WEBHOOK_URL)) reasons.push("access_webhook_missing");
  if ((env.ACADEMY_SCHEDULER_SECRET?.length ?? 0) < 32) reasons.push("scheduler_secret_missing");
  return { ready: reasons.length === 0, reasons };
}
export type OrderLine = {
  id: string;
  quantity: number;
  currentQuantity: number;
  variant: { id: string } | null;
  discountedTotalSet?: {
    shopMoney?: { amount?: string; currencyCode?: string } | null;
    presentmentMoney?: { amount?: string; currencyCode?: string } | null;
  } | null;
};
type Snapshot = {
  id: string;
  email: string | null;
  displayFinancialStatus: string;
  test: boolean;
  cancelledAt: string | null;
  updatedAt: string;
  lineItems: { nodes: OrderLine[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};
export function reconcileLines(
  order: Pick<Snapshot, "test" | "cancelledAt" | "displayFinancialStatus">,
  lines: OrderLine[],
  previous: Record<string, { variant_id: string }> = {},
) {
  const paid =
    !order.test &&
    !order.cancelledAt &&
    ["PAID", "PARTIALLY_REFUNDED"].includes(order.displayFinancialStatus);
  return lines.flatMap((line) => {
    const variantId = line.variant?.id.split("/").at(-1) ?? previous[line.id]?.variant_id;
    const tier = variantId ? VARIANTS[variantId] : null;
    return tier
      ? [
          {
            id: line.id,
            variantId,
            tier,
            quantity: line.currentQuantity,
            active: paid && line.currentQuantity === 1 && line.quantity === 1,
          },
        ]
      : [];
  });
}

function moneyToCents(amount: string | undefined) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount ?? "");
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.slice(2).replace(/0/g, "")) return null;
  const cents = Number(match[1]) * 100 + Number(fraction.slice(0, 2).padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Exact-price policy: discounts/comps require owner review instead of automatic access. */
export function linePriceMatches(line: OrderLine, variantId: string) {
  const shopMoney = line.discountedTotalSet?.shopMoney;
  const presentmentMoney = line.discountedTotalSet?.presentmentMoney;
  const expected = EXPECTED_USD_CENTS[variantId];
  return (
    shopMoney?.currencyCode === "USD" &&
    presentmentMoney?.currencyCode === "USD" &&
    moneyToCents(shopMoney.amount) === expected &&
    moneyToCents(presentmentMoney.amount) === expected
  );
}

export function orderLineReviewIssues(
  lines: OrderLine[],
  grants: ReturnType<typeof reconcileLines>,
  previous: Record<string, { variant_id: string }> = {},
) {
  const unknownPositiveLine = lines.some((line) => {
    if (line.currentQuantity <= 0) return false;
    const variantId = line.variant?.id.split("/").at(-1) ?? previous[line.id]?.variant_id;
    return !variantId || !VARIANTS[variantId];
  });
  const invalidPriceLineIds = grants
    .filter((grant) => {
      if (grant.quantity <= 0) return false;
      const line = lines.find((candidate) => candidate.id === grant.id);
      return !line || !linePriceMatches(line, grant.variantId);
    })
    .map((grant) => grant.id);
  return { unknownPositiveLine, invalidPriceLineIds };
}

const QUERY = `query AcademyOrder($id: ID!, $after: String) { order(id: $id) { id email displayFinancialStatus test cancelledAt updatedAt lineItems(first: 250, after: $after) { nodes { id quantity currentQuantity variant { id } discountedTotalSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } } } pageInfo { hasNextPage endCursor } } } }`;
export async function reconcileShopifyOrder(id: string) {
  const shop = process.env.ACADEMY_SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shop || !token || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))
    throw new AcademyError("Shopify reconciliation is not configured.", 503);
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(id))
    throw new AcademyError("Invalid order identifier.");
  // Academy checkout expects one current unit. One bounded request is enough
  // to verify normal orders; a >250-line order is quarantined for review rather
  // than consuming the scheduler's entire remote-call budget.
  const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { id, after: null } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("SHOPIFY_UNAVAILABLE");
  const apiResult = await response.json();
  const snapshot = apiResult.data?.order as Snapshot | undefined;
  if (apiResult.errors || !snapshot) throw new Error("ORDER_RECONCILIATION_REQUIRED");
  const lines = snapshot.lineItems.nodes;
  const oversizedOrder = snapshot.lineItems.pageInfo.hasNextPage;
  const db = academyDb();
  const prior = await db.from("academy_grants").select("line_id,variant_id").eq("order_id", id);
  if (prior.error) throw new Error("DATABASE_UNAVAILABLE");
  const grants = reconcileLines(
    snapshot,
    lines,
    Object.fromEntries((prior.data ?? []).map((x) => [x.line_id, x])),
  );
  const lineIssues = orderLineReviewIssues(
    lines,
    grants,
    Object.fromEntries((prior.data ?? []).map((x) => [x.line_id, x])),
  );
  const invalidPriceLines = new Set(lineIssues.invalidPriceLineIds);
  grants.forEach((grant) => {
    if (invalidPriceLines.has(grant.id) || oversizedOrder) grant.active = false;
  });
  const email = snapshot.email?.trim().toLowerCase() ?? "";
  if (!email)
    grants.forEach((g) => {
      g.active = false;
    });
  const paidOrderWithItems =
    !snapshot.test &&
    !snapshot.cancelledAt &&
    ["PAID", "PARTIALLY_REFUNDED"].includes(snapshot.displayFinancialStatus) &&
    lines.some((line) => line.currentQuantity > 0);
  const needsReview =
    oversizedOrder ||
    !email ||
    grants.some((g) => g.quantity > 1) ||
    snapshot.displayFinancialStatus === "PARTIALLY_REFUNDED" ||
    (paidOrderWithItems &&
      (lineIssues.unknownPositiveLine || invalidPriceLines.size > 0 || grants.length === 0));
  const result = await db.rpc("academy_reconcile_order", {
    p_order: id,
    p_email: email,
    p_updated: snapshot.updatedAt,
    p_status: snapshot.displayFinancialStatus,
    p_review: needsReview,
    p_lines: grants,
  });
  if (result.error) throw new Error("RECONCILIATION_NOT_SAVED");
  if (result.data === true) {
    const { ensureOrderCodes } = await import("./academy-access.server");
    await ensureOrderCodes(id);
  }
  return { ok: true, needsReview, recognizedGrants: grants.length };
}
export async function handleShopifyWebhook(request: Request) {
  const secret = process.env.ACADEMY_SHOPIFY_WEBHOOK_SECRET;
  if (!secret || process.env.ACADEMY_SHOPIFY_ENABLED !== "true")
    return new Response("Not enabled", { status: 503 });
  let raw: string;
  try {
    raw = await readLimitedBody(request, 512000);
  } catch {
    return new Response("Payload too large", { status: 413 });
  }
  if (!verifyShopifySignature(raw, request.headers.get("x-shopify-hmac-sha256"), secret))
    return new Response("Invalid signature", { status: 401 });
  if (request.headers.get("x-shopify-shop-domain") !== process.env.ACADEMY_SHOPIFY_SHOP)
    return new Response("Wrong shop", { status: 403 });
  const eventId =
    request.headers.get("x-shopify-event-id") ?? request.headers.get("x-shopify-webhook-id");
  const topic = request.headers.get("x-shopify-topic") ?? "";
  if (!eventId || eventId.length > 200) return new Response("Missing event ID", { status: 400 });
  if (!["orders/paid", "orders/updated", "orders/cancelled", "refunds/create"].includes(topic))
    return new Response("Ignored");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }
  const numericId = topic === "refunds/create" ? body.order_id : body.id;
  if (!/^\d+$/.test(String(numericId))) return new Response("Missing order", { status: 400 });
  const orderId = `gid://shopify/Order/${numericId}`;
  const db = academyDb();
  const inserted = await db
    .from("academy_commerce_receipts")
    .upsert(
      { event_id: eventId, order_id: orderId, topic },
      { onConflict: "event_id", ignoreDuplicates: true },
    );
  if (inserted.error) return new Response("Unable to persist", { status: 500 });
  // A scheduler processes durable receipts; acknowledging this receipt does not claim access was granted.
  return new Response("Recorded", { status: 200 });
}
