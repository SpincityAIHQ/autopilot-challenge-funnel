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
export type OrderLine = {
  id: string;
  quantity: number;
  currentQuantity: number;
  variant: { id: string } | null;
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
const QUERY = `query AcademyOrder($id: ID!, $after: String) { order(id: $id) { id email displayFinancialStatus test cancelledAt updatedAt lineItems(first: 250, after: $after) { nodes { id quantity currentQuantity variant { id } } pageInfo { hasNextPage endCursor } } } }`;
export async function reconcileShopifyOrder(id: string) {
  const shop = process.env.ACADEMY_SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shop || !token || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))
    throw new AcademyError("Shopify reconciliation is not configured.", 503);
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(id))
    throw new AcademyError("Invalid order identifier.");
  let after: string | null = null;
  let snapshot: Snapshot | undefined;
  const lines: OrderLine[] = [];
  for (let page = 0; page < 20; page++) {
    const response = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { id, after } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("SHOPIFY_UNAVAILABLE");
    const result = await response.json();
    const order = result.data?.order as Snapshot | undefined;
    if (result.errors || !order || !order.email) throw new Error("ORDER_RECONCILIATION_REQUIRED");
    if (snapshot && snapshot.updatedAt !== order.updatedAt) throw new Error("ORDER_CHANGED_RETRY");
    snapshot = order;
    lines.push(...order.lineItems.nodes);
    if (!order.lineItems.pageInfo.hasNextPage) break;
    after = order.lineItems.pageInfo.endCursor;
    if (!after || page === 19) throw new Error("ORDER_PAGINATION_INCOMPLETE");
  }
  if (!snapshot) throw new Error("ORDER_MISSING");
  const db = academyDb();
  const prior = await db.from("academy_grants").select("line_id,variant_id").eq("order_id", id);
  if (prior.error) throw new Error("DATABASE_UNAVAILABLE");
  const grants = reconcileLines(
    snapshot,
    lines,
    Object.fromEntries((prior.data ?? []).map((x) => [x.line_id, x])),
  );
  const needsReview =
    grants.some((g) => g.quantity > 1) || snapshot.displayFinancialStatus === "PARTIALLY_REFUNDED";
  const result = await db.rpc("academy_reconcile_order", {
    p_order: id,
    p_email: snapshot.email!.toLowerCase(),
    p_updated: snapshot.updatedAt,
    p_status: snapshot.displayFinancialStatus,
    p_review: needsReview,
    p_lines: grants,
  });
  if (result.error) throw new Error("RECONCILIATION_NOT_SAVED");
  return { ok: true, needsReview };
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
