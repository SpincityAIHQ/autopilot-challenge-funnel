import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin } from "@/lib/rate-limit";

/**
 * Owner-only manual membership grant/revoke by email — the safety net when a
 * member texts instead of waiting for the Skool webhook. Same owner session as
 * the leads console, same-origin only, never cached.
 */
const SESSION_COOKIE = "summit_rs";

function noStore(): Headers {
  return new Headers({ "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" });
}

async function verifyOwner(): Promise<boolean> {
  const owners = (process.env.SUMMIT_OWNER_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!owners.length) return false;
  const sessionToken = getCookie(SESSION_COOKIE);
  if (!sessionToken || sessionToken.length < 32) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
    _session_hash: hashToken(sessionToken),
  });
  if (error) return false;
  const buyer: string | undefined = (Array.isArray(data) ? data[0] : null)?.buyer_email;
  return Boolean(buyer && owners.includes(buyer.toLowerCase()));
}

export const Route = createFileRoute("/api/public/admin/skool-membership")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = noStore();
        if (!assertSameOrigin(request)) return new Response("Forbidden", { status: 403, headers });
        if (!(await verifyOwner())) return new Response("Not found", { status: 404, headers });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400, headers });
        }
        const mod = await import("@/lib/academy-skool.server");
        const parsed = mod.parseSkoolPayload(body);
        if ("error" in parsed) return new Response(parsed.error, { status: 400, headers });
        try {
          const result = await mod.applySkoolMembership(
            parsed,
            "Skool membership access, applied by the site owner. Billed in Skool; not a Summit purchase.",
          );
          return Response.json({ ok: true, ...result }, { headers });
        } catch {
          return new Response("Membership could not be applied", { status: 503, headers });
        }
      },
    },
  },
});
