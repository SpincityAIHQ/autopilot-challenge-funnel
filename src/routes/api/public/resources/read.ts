import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import {
  getResourceMeta,
  scopesGrantTier,
} from "@/lib/resource-metadata";

/**
 * Session-cookie-authenticated resource read.
 * - Reads the HttpOnly session cookie set by /exchange.
 * - Calls session_active_scopes, which returns the buyer's CURRENT active
 *   entitlement scopes (refunds/revocations block immediately).
 * - Applies an EXACT scope-per-tier match (no <=/tier-order comparison):
 *     ga scope → ga resources only
 *     vip scope → vip resources only (vip_upgrade counts as vip)
 *     vault scope → vault resources only
 * - Always sends Cache-Control: private, no-store.
 */

const SESSION_COOKIE = "summit_rs";

const bodySchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
});

export const Route = createFileRoute("/api/public/resources/read")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > 4096)
            return new Response("Bad request", { status: 400, headers: noStore() });
          body = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400, headers: noStore() });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success)
          return new Response("Bad request", { status: 400, headers: noStore() });

        const meta = getResourceMeta(parsed.data.slug);
        if (!meta)
          return new Response("Not found", { status: 404, headers: noStore() });

        const sessionToken = getCookie(SESSION_COOKIE);
        if (!sessionToken || sessionToken.length < 32)
          return new Response("Unauthorized", { status: 401, headers: noStore() });

        const sessionHash = hashToken(sessionToken);
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data, error } = await supabaseAdmin.rpc(
          "session_active_scopes",
          { _session_hash: sessionHash },
        );
        if (error)
          return new Response("Server error", { status: 500, headers: noStore() });
        const row = Array.isArray(data) ? data[0] : null;
        if (!row)
          return new Response("Unauthorized", { status: 401, headers: noStore() });

        const scopes: string[] = Array.isArray(row.scopes) ? row.scopes : [];
        if (!scopesGrantTier(scopes, meta.tier))
          return new Response("Forbidden", { status: 403, headers: noStore() });

        // Server-only import — never reaches the client bundle.
        const { getResource } = await import("@/lib/resource-content.server");
        const full = getResource(meta.slug);
        if (!full)
          return new Response("Not found", { status: 404, headers: noStore() });

        return new Response(
          JSON.stringify({
            slug: full.slug,
            tier: full.tier,
            name: full.name,
            sections: full.sections,
          }),
          { status: 200, headers: noStore("application/json") },
        );
      },
    },
  },
});

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}
