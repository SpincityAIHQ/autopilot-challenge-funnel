import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getResource } from "@/lib/resource-content";
import { hashToken } from "@/lib/access-tokens.server";

/**
 * Server-validated resource read.
 * The client sends { token } — never a raw resource id. We hash the token
 * and call entitlement_by_token_hash to check that the token is:
 *   - unrevoked & unexpired
 *   - matches a granted entitlement whose scope covers the requested slug's tier
 *
 * Only then do we return the full ResourceContent. Otherwise 401/403.
 */

const bodySchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  token: z.string().min(32).max(256),
});

const TIER_ORDER = { ga: 0, vip: 1, vault: 2 } as const;

export const Route = createFileRoute("/api/public/resources/read")({
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
        if (!parsed.success) {
          return new Response("Bad request", { status: 400 });
        }
        const { slug, token } = parsed.data;
        const resource = getResource(slug);
        if (!resource) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const th = hashToken(token);
        const { data, error } = await supabaseAdmin.rpc(
          "entitlement_by_token_hash",
          { _token_hash: th },
        );
        if (error) return new Response("Server error", { status: 500 });
        const row = Array.isArray(data) ? data[0] : null;
        if (!row || !row.active) {
          return new Response("Unauthorized", { status: 401 });
        }

        // scope: 'ga' | 'vip' | 'vault' | product id — normalize to a tier.
        const scope = String(row.scope ?? "").toLowerCase();
        const scopeTier = normalizeScope(scope);
        if (!scopeTier) return new Response("Forbidden", { status: 403 });
        if (TIER_ORDER[scopeTier] < TIER_ORDER[resource.tier]) {
          return new Response("Forbidden", { status: 403 });
        }
        return Response.json({
          slug: resource.slug,
          tier: resource.tier,
          name: resource.name,
          sections: resource.sections,
        });
      },
    },
  },
});

function normalizeScope(scope: string): "ga" | "vip" | "vault" | null {
  if (scope === "ga") return "ga";
  if (scope === "vip" || scope === "vip_upgrade") return "vip";
  if (scope === "vault") return "vault";
  return null;
}
