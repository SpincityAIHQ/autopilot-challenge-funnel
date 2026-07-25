import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Resource-hub logout / session revocation.
 *
 * - Same-origin required (fails closed if both Origin and Referer absent).
 * - Durable rate limiter keyed by HMAC(caller-ip); RATE_LIMIT_HMAC_SECRET
 *   required (503 when absent).
 * - Reads the HttpOnly session cookie, marks the matching row in
 *   public.resource_sessions revoked, and clears the cookie.
 * - Response body is a fixed { ok: true } — never leaks PII, cookie
 *   contents, buyer email, or session lookup result.
 * - Cache-Control: private, no-store on every path.
 */

const SESSION_COOKIE = "summit_rs";

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}

function respond(status: number, body: string, extra?: Record<string, string>): Response {
  const h = noStore();
  if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(body, { status, headers: h });
}

const CLEAR_COOKIE = [
  `${SESSION_COOKIE}=`,
  "Path=/",
  "HttpOnly",
  "Secure",
  "SameSite=Lax",
  "Max-Age=0",
].join("; ");

export const Route = createFileRoute("/api/public/resources/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) return respond(403, "Forbidden");

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return respond(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "logout", 20, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        const sessionToken = getCookie(SESSION_COOKIE);
        // Always clear the client cookie regardless of DB outcome, and
        // always respond with the same shape so callers cannot infer
        // whether a session existed.
        if (sessionToken && sessionToken.length >= 32) {
          try {
            const { supabaseAdmin } = await import(
              "@/integrations/supabase/client.server"
            );
            await supabaseAdmin.rpc("revoke_resource_session", {
              _session_hash: hashToken(sessionToken),
            });
          } catch {
            // Best effort; cookie clear below still applies.
          }
        }
        return respond(200, JSON.stringify({ ok: true }), {
          "content-type": "application/json",
          "set-cookie": CLEAR_COOKIE,
        });
      },
    },
  },
});
