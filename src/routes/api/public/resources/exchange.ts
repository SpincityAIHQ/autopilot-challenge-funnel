import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  generateAccessToken,
  hashToken,
} from "@/lib/access-tokens.server";

/**
 * Single-use magic token → session cookie exchange.
 *
 * - Marks the magic-link token used_at exactly once (atomic in the DB RPC).
 * - Issues a fresh random session token, returned ONLY as an
 *   HttpOnly; Secure; SameSite=Lax cookie. Never in the response body.
 * - The session hash + buyer email are persisted in resource_sessions.
 * - On every subsequent /read, entitlements are re-checked so refunds
 *   revoke access immediately.
 */

const SESSION_COOKIE = "summit_rs";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours

const bodySchema = z.object({
  token: z.string().min(32).max(256),
});

export const Route = createFileRoute("/api/public/resources/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > 4096) return new Response("Bad request", { status: 400 });
          body = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return new Response("Bad request", { status: 400 });

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
            return new Response("Unauthorized", { status: 401 });
          }
          return new Response("Server error", { status: 500 });
        }

        const row = Array.isArray(data) ? data[0] : null;
        if (!row) return new Response("Unauthorized", { status: 401 });

        const headers = new Headers({
          "content-type": "application/json",
          "cache-control": "private, no-store",
          "set-cookie": [
            `${SESSION_COOKIE}=${sessionToken}`,
            "Path=/",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
            `Max-Age=${SESSION_TTL_SECONDS}`,
          ].join("; "),
        });
        return new Response(
          JSON.stringify({ ok: true, expiresAt: row.expires_at }),
          { status: 200, headers },
        );
      },
    },
  },
});

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
