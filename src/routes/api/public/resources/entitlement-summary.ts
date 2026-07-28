import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Entitlement summary — same-origin, no-store, DURABLE rate-limited.
 * Reads the HttpOnly resource session cookie set by /exchange and returns
 * ONLY the current product scopes for the active buyer. No PII, no email,
 * no expiry timestamps beyond the derived active flag. Never logs bodies.
 *
 * Rate limiter: uses the shared DB-backed limiter keyed by HMAC(IP).
 * Fails closed with HTTP 503 when RATE_LIMIT_HMAC_SECRET is unset —
 * never degrades to an in-memory limiter that resets on Worker restart.
 *
 * Every response path sets Cache-Control: private, no-store.
 */

const SESSION_COOKIE = "summit_rs";

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}

function respond(status: number, body: string, contentType?: string): Response {
  return new Response(body, { status, headers: noStore(contentType) });
}

function emptyScopes(): Response {
  return respond(
    200,
    JSON.stringify({ authenticated: false, scopes: [] as string[] }),
    "application/json",
  );
}

export const Route = createFileRoute("/api/public/resources/entitlement-summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!assertSameOrigin(request)) return respond(403, "Forbidden");
        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return respond(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "entsum", 60, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        const sessionToken = getCookie(SESSION_COOKIE);
        if (!sessionToken || sessionToken.length < 32) return emptyScopes();

        const sessionHash = hashToken(sessionToken);
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data, error } = await supabaseAdmin.rpc(
          "session_active_scopes",
          { _session_hash: sessionHash },
        );
        if (error) return respond(500, "Server error");
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) return emptyScopes();

        const rawScopes: string[] = Array.isArray(row.scopes) ? row.scopes : [];
        const buyerEmail: string | null =
          typeof row.buyer_email === "string" ? row.buyer_email : null;
        return respond(
          200,
          JSON.stringify({
            authenticated: true,
            scopes: rawScopes,
            // Buyer's own email — this session belongs to them, so echoing
            // it back to their own browser is not a PII disclosure.
            email: buyerEmail,
          }),
          "application/json",
        );

      },
    },
  },
});
