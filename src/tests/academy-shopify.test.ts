import { test } from "node:test";
import assert from "node:assert/strict";
import { createShopifyAdminClient } from "../lib/academy-shopify.server.ts";

const shop = "64dwd2-0j.myshopify.com";
const tokenUrl = `https://${shop}/admin/oauth/access_token`;
const graphqlUrl = `https://${shop}/admin/api/2026-07/graphql.json`;
const modern = () => ({
  ACADEMY_SHOPIFY_SHOP: shop,
  ACADEMY_SHOPIFY_AUTH_MODE: "client_credentials",
  SHOPIFY_CLIENT_ID: "mock-client-id",
  SHOPIFY_CLIENT_SECRET: "mock-client-secret",
});
const legacy = () => ({
  ACADEMY_SHOPIFY_SHOP: shop,
  SHOPIFY_ADMIN_ACCESS_TOKEN: "mock-legacy-token",
  ACADEMY_SHOPIFY_WEBHOOK_SECRET: "mock-legacy-signing-secret",
});
const tokenResponse = (token: string, seconds = 86399) => Response.json({
  access_token: token, expires_in: seconds, scope: "read_orders",
});
const ok = () => Response.json({ data: { order: { id: "gid://shopify/Order/1" } } });
type Call = { url: string; init: RequestInit };

test("exchanges a modern credential pair only on the exact shop, then reuses the token", async () => {
  const calls: Call[] = [];
  const client = createShopifyAdminClient({ environment: modern, http: async (url, init) => {
    calls.push({ url, init });
    return url === tokenUrl ? tokenResponse("mock-access-token") : ok();
  } });
  await client.request("query First { shop { name } }", {});
  await client.request("query Second { shop { name } }", { marker: 1 });
  assert.deepEqual(calls.map((x) => x.url), [tokenUrl, graphqlUrl, graphqlUrl]);
  const form = calls[0].init.body as URLSearchParams;
  assert.equal(form.get("grant_type"), "client_credentials");
  assert.equal(form.get("client_id"), "mock-client-id");
  assert.equal(form.get("client_secret"), "mock-client-secret");
  assert.equal(new Headers(calls[1].init.headers).get("X-Shopify-Access-Token"), "mock-access-token");
  assert.equal(String(calls[1].init.body).includes("mock-client-secret"), false);
  assert.deepEqual(JSON.parse(String(calls[2].init.body)).variables, { marker: 1 });
  for (const call of calls) {
    assert.equal(call.init.redirect, "error");
    assert.ok(call.init.signal instanceof AbortSignal);
  }
});

test("renews at the expiry safety window instead of leaving a daily outage", async () => {
  let time = 0;
  let exchanges = 0;
  const seen: string[] = [];
  const client = createShopifyAdminClient({ environment: modern, now: () => time, http: async (url, init) => {
    if (url === tokenUrl) return tokenResponse(`mock-token-${++exchanges}`, 120);
    seen.push(new Headers(init.headers).get("X-Shopify-Access-Token")!);
    return ok();
  } });
  await client.request("query", {});
  time = 59_999;
  await client.request("query", {});
  time = 60_000;
  await client.request("query", {});
  assert.equal(exchanges, 2);
  assert.deepEqual(seen, ["mock-token-1", "mock-token-1", "mock-token-2"]);
});

test("concurrent workers share one in-flight token exchange", async () => {
  let release!: (response: Response) => void;
  let exchanges = 0;
  let requests = 0;
  const pending = new Promise<Response>((resolve) => { release = resolve; });
  const client = createShopifyAdminClient({ environment: modern, http: async (url) => {
    if (url === tokenUrl) { exchanges++; return pending; }
    requests++;
    return ok();
  } });
  const work = [client.request("query", {}), client.request("query", {}), client.request("query", {})];
  release(tokenResponse("mock-shared-token"));
  await Promise.all(work);
  assert.equal(exchanges, 1);
  assert.equal(requests, 3);
});

test("one 401 renews and retries the same read once", async () => {
  let exchanges = 0;
  const requests: Call[] = [];
  const client = createShopifyAdminClient({ environment: modern, http: async (url, init) => {
    if (url === tokenUrl) return tokenResponse(`mock-token-${++exchanges}`);
    requests.push({ url, init });
    return requests.length === 1 ? new Response("expired", { status: 401 }) : ok();
  } });
  const response = await client.request("query Exact", { id: "gid://shopify/Order/1" });
  assert.equal(response.status, 200);
  assert.equal(exchanges, 2);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].init.body, requests[1].init.body);
  assert.equal(new Headers(requests[1].init.headers).get("X-Shopify-Access-Token"), "mock-token-2");
});

test("repeated 401 stops after two reads and two exchanges", async () => {
  let exchanges = 0;
  let requests = 0;
  const client = createShopifyAdminClient({ environment: modern, http: async (url) => {
    if (url === tokenUrl) return tokenResponse(`mock-token-${++exchanges}`);
    requests++;
    return new Response("unauthorized", { status: 401 });
  } });
  assert.equal((await client.request("query", {})).status, 401);
  assert.equal(exchanges, 2);
  assert.equal(requests, 2);
});

test("concurrent 401 responses do not trigger a refresh stampede", async () => {
  let exchanges = 0;
  let requests = 0;
  const client = createShopifyAdminClient({ environment: modern, http: async (url, init) => {
    if (url === tokenUrl) return tokenResponse(`mock-token-${++exchanges}`);
    requests++;
    return new Headers(init.headers).get("X-Shopify-Access-Token") === "mock-token-1"
      ? new Response("expired", { status: 401 }) : ok();
  } });
  const responses = await Promise.all([client.request("query A", {}), client.request("query B", {})]);
  assert.deepEqual(responses.map((r) => r.status), [200, 200]);
  assert.equal(exchanges, 2);
  assert.equal(requests, 4);
});

test("does not retry 403, rate limits, or server failures inside the transport", async () => {
  for (const status of [403, 429, 500]) {
    let requests = 0;
    const client = createShopifyAdminClient({ environment: modern, http: async (url) => {
      if (url === tokenUrl) return tokenResponse("mock-token");
      requests++;
      return new Response("failure", { status });
    } });
    assert.equal((await client.request("query", {})).status, status);
    assert.equal(requests, 1);
  }
});

test("missing client credentials and invalid auth modes fail before making HTTP requests", async () => {
  let calls = 0;
  for (const env of [
    { ...modern(), SHOPIFY_CLIENT_ID: "" },
    { ...modern(), SHOPIFY_CLIENT_SECRET: "" },
    { ...modern(), ACADEMY_SHOPIFY_AUTH_MODE: "unknown" },
    { ACADEMY_SHOPIFY_SHOP: shop },
  ]) {
    const client = createShopifyAdminClient({ environment: () => env, http: async () => { calls++; return ok(); } });
    await assert.rejects(client.request("query", {}), /SHOPIFY_/);
  }
  assert.equal(calls, 0);
});

test("rejects a different store, URL, suffix, port, path and user-info before credential transmission", async () => {
  let calls = 0;
  for (const host of [
    "other.myshopify.com", "spincityhq.com", "https://64dwd2-0j.myshopify.com",
    "64dwd2-0j.myshopify.com.attacker.test", "64dwd2-0j.myshopify.com:443",
    "64dwd2-0j.myshopify.com/", "64dwd2-0j.myshopify.com@attacker.test", "127.0.0.1",
  ]) {
    const client = createShopifyAdminClient({ environment: () => ({ ...modern(), ACADEMY_SHOPIFY_SHOP: host }),
      http: async () => { calls++; return ok(); } });
    await assert.rejects(client.request("query", {}), /SHOPIFY_SHOP_NOT_ALLOWED/);
  }
  assert.equal(calls, 0);
});

test("legacy-only configuration is preserved and a legacy 401 never exchanges another app's credentials", async () => {
  const calls: Call[] = [];
  const client = createShopifyAdminClient({ environment: legacy, http: async (url, init) => {
    calls.push({ url, init });
    return new Response("unauthorized", { status: 401 });
  } });
  assert.equal((await client.request("query", {})).status, 401);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, graphqlUrl);
  assert.equal(new Headers(calls[0].init.headers).get("X-Shopify-Access-Token"), "mock-legacy-token");
  assert.equal(client.webhookConfiguration().secret, "mock-legacy-signing-secret");
});

test("mixed credentials require explicit mode and the selected mode controls the app identity", async () => {
  const mixed = { ...legacy(), ...modern(), ACADEMY_SHOPIFY_AUTH_MODE: "", ACADEMY_SHOPIFY_WEBHOOK_SECRET: "" };
  const calls: Call[] = [];
  const client = createShopifyAdminClient({ environment: () => mixed, http: async (url, init) => {
    calls.push({ url, init });
    return url === tokenUrl ? tokenResponse("mock-modern-token") : ok();
  } });
  await assert.rejects(client.request("query", {}), /SHOPIFY_AUTH_MODE_REQUIRED/);
  assert.equal(calls.length, 0);
  mixed.ACADEMY_SHOPIFY_AUTH_MODE = "legacy";
  await client.request("query", {});
  assert.equal(new Headers(calls[0].init.headers).get("X-Shopify-Access-Token"), "mock-legacy-token");
  mixed.ACADEMY_SHOPIFY_AUTH_MODE = "client_credentials";
  await client.request("query", {});
  assert.equal(calls[1].url, tokenUrl);
  assert.equal(new Headers(calls[2].init.headers).get("X-Shopify-Access-Token"), "mock-modern-token");
});

test("webhooks use the modern app client secret and reject a conflicting explicit secret", () => {
  const env = { ...modern(), ACADEMY_SHOPIFY_WEBHOOK_SECRET: "" };
  const client = createShopifyAdminClient({ environment: () => env, http: async () => { throw new Error("must not send HTTP"); } });
  assert.deepEqual(client.webhookConfiguration(), { shop, secret: "mock-client-secret" });
  env.ACADEMY_SHOPIFY_WEBHOOK_SECRET = "wrong-app-secret";
  assert.throws(() => client.webhookConfiguration(), /SHOPIFY_WEBHOOK_APP_MISMATCH/);
  env.ACADEMY_SHOPIFY_WEBHOOK_SECRET = "mock-client-secret";
  assert.equal(client.webhookConfiguration().secret, "mock-client-secret");
  const missing = createShopifyAdminClient({ environment: () => ({ ...legacy(), ACADEMY_SHOPIFY_WEBHOOK_SECRET: "" }) });
  assert.throws(() => missing.webhookConfiguration(), /SHOPIFY_WEBHOOK_SECRET_MISSING/);
});

test("a credential change invalidates a cached token", async () => {
  const env = modern();
  let exchanges = 0;
  const seen: string[] = [];
  const client = createShopifyAdminClient({ environment: () => env, http: async (url, init) => {
    if (url === tokenUrl) return tokenResponse(`mock-token-${++exchanges}`);
    seen.push(new Headers(init.headers).get("X-Shopify-Access-Token")!);
    return ok();
  } });
  await client.request("query", {});
  env.SHOPIFY_CLIENT_SECRET = "mock-rotated-secret";
  await client.request("query", {});
  assert.deepEqual(seen, ["mock-token-1", "mock-token-2"]);
});

test("token failure is redacted and does not poison the next exchange", async () => {
  let exchanges = 0;
  const client = createShopifyAdminClient({ environment: modern, http: async (url) => {
    if (url === tokenUrl && ++exchanges === 1) throw new Error("transport exposed mock-client-secret");
    return url === tokenUrl ? tokenResponse("mock-recovered-token") : ok();
  } });
  await assert.rejects(client.request("query", {}), { message: "SHOPIFY_TOKEN_UNAVAILABLE" });
  assert.equal((await client.request("query", {})).status, 200);
});

test("invalid token data, missing order scope and OAuth error bodies are never accepted or echoed", async () => {
  for (const response of [
    Response.json({ access_token: "mock-token", expires_in: 0, scope: "read_orders" }),
    Response.json({ access_token: "mock-token", expires_in: "86399", scope: "read_orders" }),
    Response.json({ access_token: "mock-token", expires_in: 86399, scope: "read_products" }),
    Response.json({ access_token: "mock-token\r\nunsafe", expires_in: 86399, scope: "read_orders" }),
    new Response("secret=mock-client-secret", { status: 401 }),
    new Response("not json"),
  ]) {
    let calls = 0;
    const client = createShopifyAdminClient({ environment: modern, http: async () => { calls++; return response; } });
    await assert.rejects(client.request("query", {}), { message: "SHOPIFY_TOKEN_UNAVAILABLE" });
    assert.equal(calls, 1);
  }
});

test("GraphQL network errors are redacted too", async () => {
  const client = createShopifyAdminClient({ environment: legacy, http: async () => {
    throw new Error("request included mock-legacy-token");
  } });
  await assert.rejects(client.request("query", {}), { message: "SHOPIFY_UNAVAILABLE" });
});
