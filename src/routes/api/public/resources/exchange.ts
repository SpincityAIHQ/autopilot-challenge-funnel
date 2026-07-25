import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  generateAccessToken,
  hashToken,
} from "@/lib/access-tokens.server";
import { assertSameOrigin, callerId, rateLimit } from "@/lib/rate-limit";

/**
 * Single-use magic token → session cookie exchange.
 *
 * - Marks the magic-link token used_at exactly once (atomic in the DB RPC).
 * - Issues a fresh random session token, returned ONLY as an
 *   HttpOnly; Secure; SameSite=Lax cookie. Never in the response body.
 * - The session hash + buyer email are persisted in resource_sessions.
 * - On every subsequent /read, entitlements are re-checked so refunds
 *   revoke access immediately.
 * - All response paths carry Cache-Control: private, no-store.
 * - Same-origin enforced. Best-effort rate limit per caller IP.
 * - Request bodies are never logged.
 */

const SESSION_COOKIE = "summit_rs";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours

const bodySchema = z.object({
  token: z.string().min(32).max(256),
});

function baseHeaders(): Headers {
  return new Headers({ "cache-control": "private, no-store" });
}

function respond(status: number, body: string, extra?: Record<string, string>): Response {
  const h = baseHeaders();
  if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(body, { status, headers: h });
}

export const Route = createFileRoute("/api/public/resources/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return respond(403, "Forbidden");
        }
        const rl = rateLimit(`exchange:${callerId(request)}`, 10, 60);
        if (!rl.ok) {
          const h = baseHeaders();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > 4096) return respond(400, "Bad request");
          body = JSON.parse(raw);
        } catch {
          return respond(400, "Bad request");
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return respond(400, "Bad request");

        const rawToken = parsed.data.token;
        const tokenHash = hashToken(rawToken);
        const sessionToken = generateAccessToken();
        const sessionHash = hashToken(sessionToken);

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data, error } = await supabaseAdmin.rpc(
          "exchange_access_token",
          {
            _token_hash: tokenHash,
            _session_hash: sessionHash,
            _ttl_seconds: SESSION_TTL_SECONDS,
          },
        );

        if (error) {
          const msg = error.message ?? "";
          if (
            /token not exchangeable/i.test(msg) ||
            /entitlement not active/i.test(msg)
          ) {
            return respond(401, "Unauthorized");
          }
          return respond(500, "Server error");
        }

        const row = Array.isArray(data) ? data[0] : null;
        if (!row) return respond(401, "Unauthorized");

        return respond(
          200,
          JSON.stringify({ ok: true, expiresAt: row.expires_at }),
          {
            "content-type": "application/json",
            "set-cookie": [
              `${SESSION_COOKIE}=${sessionToken}`,
              "Path=/",
              "HttpOnly",
              "Secure",
              "SameSite=Lax",
              `Max-Age=${SESSION_TTL_SECONDS}`,
            ].join("; "),
          },
        );
      },
    },
  },
});

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
