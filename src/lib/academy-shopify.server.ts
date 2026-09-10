// Server-only Shopify transport. Never import this module into client code.
// https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
type Environment = Record<string, string | undefined>;
type Connection = {
  shop: string;
  mode: "client_credentials" | "legacy";
  clientId: string;
  clientSecret: string;
  legacyToken: string;
  webhookSecret: string;
};
type Http = (url: string, init: RequestInit) => Promise<Response>;
type Token = { value: string; expiresAt: number };
type Session = { connection: Connection; token?: Token; pending?: Promise<Token> };

// This deployment's product/variant IDs belong to this store. A configuration
// typo must never send its app credentials or customer/order data to another host.
const ALLOWED_SHOP = "64dwd2-0j.myshopify.com";
const RENEW_BEFORE_MS = 60_000;
const HTTP_TIMEOUT_MS = 8_000;

function readConnection(env: Environment): Connection {
  const shop = env.ACADEMY_SHOPIFY_SHOP;
  if (shop !== ALLOWED_SHOP) throw new Error("SHOPIFY_SHOP_NOT_ALLOWED");
  const clientId = env.SHOPIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.SHOPIFY_CLIENT_SECRET?.trim() ?? "";
  const legacyToken = env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() ?? "";
  const explicitSecret = env.ACADEMY_SHOPIFY_WEBHOOK_SECRET?.trim() ?? "";
  const requestedMode = env.ACADEMY_SHOPIFY_AUTH_MODE?.trim() ?? "";
  if (requestedMode && !["client_credentials", "legacy"].includes(requestedMode))
    throw new Error("SHOPIFY_AUTH_MODE_INVALID");
  // Existing legacy-only installs remain compatible. During migration, selecting
  // a mode explicitly avoids silently falling back to a different app identity.
  if (!requestedMode && legacyToken && (clientId || clientSecret))
    throw new Error("SHOPIFY_AUTH_MODE_REQUIRED");
  const mode = requestedMode || (clientId || clientSecret ? "client_credentials" : "legacy");
  if (mode === "client_credentials") {
    if (!clientId || !clientSecret) throw new Error("SHOPIFY_CLIENT_CREDENTIALS_INCOMPLETE");
    if (explicitSecret && explicitSecret !== clientSecret)
      throw new Error("SHOPIFY_WEBHOOK_APP_MISMATCH");
    return { shop, mode, clientId, clientSecret, legacyToken: "", webhookSecret: clientSecret };
  }
  if (!legacyToken || /[\r\n]/.test(legacyToken)) throw new Error("SHOPIFY_LEGACY_TOKEN_MISSING");
  return { shop, mode: "legacy", clientId: "", clientSecret: "", legacyToken, webhookSecret: explicitSecret };
}

function sameConnection(a: Connection, b: Connection) {
  return a.shop === b.shop && a.mode === b.mode && a.clientId === b.clientId &&
    a.clientSecret === b.clientSecret && a.legacyToken === b.legacyToken &&
    a.webhookSecret === b.webhookSecret;
}

export function createShopifyAdminClient(options: {
  environment?: () => Environment;
  http?: Http;
  now?: () => number;
} = {}) {
  const environment = options.environment ?? (() => process.env);
  const http: Http = options.http ?? ((url, init) => fetch(url, init));
  const now = options.now ?? Date.now;
  let session: Session | undefined;

  function currentSession(): Session {
    const connection = readConnection(environment());
    if (!session || !sameConnection(session.connection, connection)) session = { connection };
    return session;
  }

  async function exchange(connection: Connection): Promise<Token> {
    try {
      const startedAt = now();
      const response = await http(`https://${connection.shop}/admin/oauth/access_token`, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: connection.clientId,
          client_secret: connection.clientSecret,
        }),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error("token rejected");
      const result = await response.json();
      const value: unknown = result.access_token;
      const seconds: unknown = result.expires_in;
      const scopes = typeof result.scope === "string" ? result.scope.split(",").map((x: string) => x.trim()) : [];
      if (typeof value !== "string" || !value || value.length > 4096 || /\s/.test(value) ||
          typeof seconds !== "number" || !Number.isInteger(seconds) || seconds <= 60 || seconds > 86_400 ||
          !scopes.some((scope: string) => scope === "read_orders" || scope === "write_orders"))
        throw new Error("invalid token response");
      return { value, expiresAt: startedAt + seconds * 1000 };
    } catch {
      // OAuth error bodies and network exceptions may contain credentials.
      // Only this stable error leaves the transport; do not attach a cause/body.
      throw new Error("SHOPIFY_TOKEN_UNAVAILABLE");
    }
  }

  async function accessToken(state: Session, rejectedToken?: string): Promise<string> {
    if (state.connection.mode === "legacy") return state.connection.legacyToken;
    // A delayed 401 for an old token must not discard a newer concurrent refresh.
    if (rejectedToken && state.token?.value === rejectedToken) state.token = undefined;
    if (state.token && state.token.expiresAt - RENEW_BEFORE_MS > now()) return state.token.value;
    if (!state.pending) {
      const pending = exchange(state.connection).then((token) => {
        state.token = token;
        return token;
      }).finally(() => {
        if (state.pending === pending) state.pending = undefined;
      });
      state.pending = pending;
    }
    return (await state.pending).value;
  }

  async function request(query: string, variables: Record<string, unknown>): Promise<Response> {
    const state = currentSession();
    let token = await accessToken(state);
    const send = async () => {
      try {
        return await http(`https://${state.connection.shop}/admin/api/2026-07/graphql.json`, {
          method: "POST",
          redirect: "error",
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
        });
      } catch {
        throw new Error("SHOPIFY_UNAVAILABLE");
      }
    };
    let response = await send();
    if (response.status === 401 && state.connection.mode === "client_credentials") {
      // Cancelling a failed response is cleanup; it must not expose an underlying
      // network exception or prevent the one permitted authentication retry.
      await response.body?.cancel().catch(() => undefined);
      token = await accessToken(state, token);
      response = await send(); // Exactly one authentication retry, never a loop.
    }
    return response;
  }

  return {
    request,
    assertConfigured() { currentSession(); },
    webhookConfiguration() {
      const { shop, webhookSecret } = currentSession().connection;
      if (!webhookSecret) throw new Error("SHOPIFY_WEBHOOK_SECRET_MISSING");
      return { shop, secret: webhookSecret };
    },
  };
}

export const shopifyAdminClient = createShopifyAdminClient();
