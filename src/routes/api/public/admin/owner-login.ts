import { createFileRoute } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import {
  generateAccessToken,
  hashToken,
} from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Owner-only login. Issues a durable HttpOnly session cookie for admin pages.
 * Does NOT require a prior purchase; the owner email is validated against
 * SUMMIT_OWNER_EMAILS and the password against SUMMIT_OWNER_PASSWORD.
 */

const SESSION_COOKIE = "summit_rs";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function noStore(): Headers {
  return new Headers({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });
}

function respond(status: number, body: string): Response {
  return new Response(body, { status, headers: noStore() });
}

export const Route = createFileRoute("/api/public/admin/owner-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return respond(403, "Forbidden");
        }

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) {
          return respond(503, "Service unavailable");
        }
        const rl = await consumeRateLimit(request, "ownerlogin", 10, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        const ownerEnv = process.env.SUMMIT_OWNER_EMAILS ?? "";
        const ownerPassword = process.env.SUMMIT_OWNER_PASSWORD ?? "";
        if (!ownerEnv || !ownerPassword) {
          return respond(503, "Owner login not configured");
        }

        const owners = ownerEnv
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (owners.length === 0) {
          return respond(503, "Owner login not configured");
        }

        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > 4096) return respond(400, "Bad request");
          body = JSON.parse(raw);
        } catch {
          return respond(400, "Bad request");
        }

        if (
          !body ||
          typeof body !== "object" ||
          typeof (body as { email?: unknown }).email !== "string" ||
          typeof (body as { password?: unknown }).password !== "string"
        ) {
          return respond(400, "Bad request");
        }

        const email = (body as { email: string }).email.trim().toLowerCase();
        const password = (body as { password: string }).password;

        if (!owners.includes(email)) {
          return respond(401, "Unauthorized");
        }
        if (password !== ownerPassword) {
          return respond(401, "Unauthorized");
        }

        // Issue a fresh session row tied to the owner email.
        const sessionToken = generateAccessToken();
        const sessionHash = hashToken(sessionToken);
        const adminTokenHash = hashToken(ownerPassword);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { error } = await supabaseAdmin.from("resource_sessions").insert({
          buyer_email: email,
          session_hash: sessionHash,
          source_token_hash: adminTokenHash,
          issued_scopes: ["owner"],
          expires_at: expiresAt.toISOString(),
        });

        if (error) {
          return respond(500, "Server error");
        }

        const cookieValue = [
          `${SESSION_COOKIE}=${sessionToken}`,
          "Path=/",
          "HttpOnly",
          "Secure",
          "SameSite=Lax",
          `Max-Age=${SESSION_TTL_SECONDS}`,
        ].join("; ");

        const h = noStore();
        h.set("content-type", "application/json");
        h.set("set-cookie", cookieValue);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
      },
    },
  },
});
