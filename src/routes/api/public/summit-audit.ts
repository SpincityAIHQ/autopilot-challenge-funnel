import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Pre-Summit alignment audit — same-origin, DB rate-limited, upsert by email.
 * The client-provided tier is IGNORED; the server derives the tier from the
 * verified resource session cookie (if any) via session_active_scopes.
 */

const SESSION_COOKIE = "summit_rs";

const trimmedString = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(max));

const optionalStr = (max: number) =>
  trimmedString(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

const bodySchema = z.object({
  email: z.string().trim().email().max(255),
  business_type: optionalStr(120),
  revenue_stage: optionalStr(120),
  bottleneck: optionalStr(120),
  what_stops: optionalStr(2000),
  ai_tools: z
    .array(z.string().trim().min(1).max(60))
    .max(20)
    .optional(),
  team_size: optionalStr(60),
  attendance: optionalStr(60),
  top_question: optionalStr(2000),
  autonomy_goal: optionalStr(120),
  anything_else: optionalStr(2000),
});

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

function deriveTier(scopes: string[]): string | null {
  const s = new Set(scopes);
  if (s.has("vault")) return "vault";
  if (s.has("vip") || s.has("vip_upgrade")) return "vip";
  if (s.has("ga")) return "ga";
  return null;
}

export const Route = createFileRoute("/api/public/summit-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return new Response("Forbidden", { status: 403, headers: NO_STORE });
        }
        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) {
          return new Response("Service unavailable", {
            status: 503,
            headers: NO_STORE,
          });
        }
        const rl = await consumeRateLimit(request, "audit", 5, 60, rlSecret);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSeconds) },
          });
        }

        const raw = await request.text();
        if (raw.length > 32 * 1024) {
          return new Response("Payload too large", {
            status: 413,
            headers: NO_STORE,
          });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400, headers: NO_STORE });
        }
        const check = bodySchema.safeParse(parsed);
        if (!check.success) {
          return new Response("Bad input", { status: 400, headers: NO_STORE });
        }
        const d = check.data;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Server-side tier lookup. NEVER trust a client-supplied value.
        let entitlementTier: string | null = null;
        const sessionToken = getCookie(SESSION_COOKIE);
        if (sessionToken && sessionToken.length >= 32) {
          const sessionHash = hashToken(sessionToken);
          const { data: sess } = await supabaseAdmin.rpc(
            "session_active_scopes",
            { _session_hash: sessionHash },
          );
          const row = Array.isArray(sess) ? sess[0] : null;
          const scopes: string[] =
            row && Array.isArray(row.scopes) ? row.scopes : [];
          entitlementTier = deriveTier(scopes);
        }

        const emailLower = d.email.toLowerCase();
        const payload = {
          email: emailLower,
          business_type: d.business_type ?? null,
          revenue_stage: d.revenue_stage ?? null,
          bottleneck: d.bottleneck ?? null,
          what_stops: d.what_stops ?? null,
          ai_tools: d.ai_tools ?? null,
          team_size: d.team_size ?? null,
          attendance: d.attendance ?? null,
          top_question: d.top_question ?? null,
          autonomy_goal: d.autonomy_goal ?? null,
          anything_else: d.anything_else ?? null,
          entitlement_tier: entitlementTier,
          updated_at: new Date().toISOString(),
        };

        // Upsert on lowercased email — people can revise their answers.
        const { error } = await supabaseAdmin
          .from("summit_audit")
          .upsert(payload, { onConflict: "email" });

        if (error) {
          return new Response("Server error", { status: 500, headers: NO_STORE });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: NO_STORE,
        });
      },
    },
  },
});
