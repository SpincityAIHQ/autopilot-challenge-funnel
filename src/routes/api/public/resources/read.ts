import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import {
  getResourceMeta,
  scopesGrantTier,
} from "@/lib/resource-metadata";
import { assertSameOrigin, callerId, rateLimit } from "@/lib/rate-limit";

/**
 * Session-cookie-authenticated resource read.
 * - Reads the HttpOnly session cookie set by /exchange.
 * - Calls session_active_scopes, which returns the buyer's CURRENT active
 *   entitlement scopes (refunds/revocations block immediately).
 * - Applies the product access matrix:
 *     ga scope             → ga resources only
 *     vip / vip_upgrade    → ga + vip resources (VIP inherits GA)
 *     vault scope          → vault resources only (independent)
 *   Multiple scopes union.
 * - Same-origin enforced. Best-effort per-IP rate limit with Retry-After.
 * - Every response path: Cache-Control: private, no-store.
 * - Request bodies are never logged.
 */

const SESSION_COOKIE = "summit_rs";

const bodySchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
});

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}

function respond(status: number, body: string, contentType?: string): Response {
  return new Response(body, { status, headers: noStore(contentType) });
}

export const Route = createFileRoute("/api/public/resources/read")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return respond(403, "Forbidden");
        }
        const rl = rateLimit(`read:${callerId(request)}`, 60, 60);
        if (!rl.ok) {
          const h = noStore();
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

        const meta = getResourceMeta(parsed.data.slug);
        if (!meta) return respond(404, "Not found");

        const sessionToken = getCookie(SESSION_COOKIE);
        if (!sessionToken || sessionToken.length < 32)
          return respond(401, "Unauthorized");

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
        if (!row) return respond(401, "Unauthorized");

        const scopes: string[] = Array.isArray(row.scopes) ? row.scopes : [];
        if (!scopesGrantTier(scopes, meta.tier))
          return respond(403, "Forbidden");

        // Server-only import — never reaches the client bundle.
        const { getResource } = await import("@/lib/resource-content.server");
        const full = getResource(meta.slug);
        if (!full) return respond(404, "Not found");

        return respond(
          200,
          JSON.stringify({
            slug: full.slug,
            tier: full.tier,
            name: full.name,
            sections: full.sections,
          }),
          "application/json",
        );
      },
    },
  },
});
