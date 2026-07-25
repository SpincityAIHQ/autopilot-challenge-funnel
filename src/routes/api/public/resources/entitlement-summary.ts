import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, callerId, rateLimit } from "@/lib/rate-limit";

/**
 * Entitlement summary — same-origin, no-store, rate-limited.
 * Reads the HttpOnly resource session cookie set by /exchange and returns
 * ONLY the current product scopes for the active buyer. No PII, no email,
 * no expiry timestamps beyond the derived active flag. Never logs bodies.
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
        const rl = rateLimit(`entsum:${callerId(request)}`, 60, 60);
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
        return respond(
          200,
          JSON.stringify({
            authenticated: true,
            scopes: rawScopes,
          }),
          "application/json",
        );
      },
    },
  },
});
