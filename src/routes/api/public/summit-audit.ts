import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Pre-Summit alignment audit — same-origin, DB rate-limited, upsert by email.
 *
 * Email resolution (in order):
 *   1. Valid resource-session cookie → derive buyer_email from
 *      session_active_scopes; ignore any body email; verification = 'session'.
 *   2. No session → require body email to match an existing registration or
 *      entitlement (case-insensitive, trimmed);
 *      verification = 'entitlement_match'.
 *   3. Neither → return 200 with a neutral message. Response is identical
 *      whether the email exists or not, so this endpoint cannot be used to
 *      probe whether an address bought a ticket.
 *
 * Honeypot: `website` field, if present with any non-empty value, returns the
 * normal success response and writes nothing.
 *
 * Tier is always derived server-side; any client-supplied tier is ignored.
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
  email: z.string().trim().email().max(255).optional(),
  business_type: optionalStr(120),
  revenue_stage: optionalStr(120),
  bottleneck: optionalStr(120),
  what_stops: optionalStr(2000),
  ai_tools: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  team_size: optionalStr(60),
  attendance: optionalStr(60),
  top_question: optionalStr(2000),
  autonomy_goal: optionalStr(120),
  anything_else: optionalStr(2000),
  // Honeypot — real users don't fill this.
  website: z.string().max(500).optional(),
});

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

const NEUTRAL_NOT_FOUND_MESSAGE =
  "We couldn't find a registration for that email. Use the link in your confirmation email, or contact Sebastian@spincityhq.com.";

function deriveTier(scopes: string[]): string | null {
  const s = new Set(scopes);
  if (s.has("vault")) return "vault";
  if (s.has("vip") || s.has("vip_upgrade")) return "vip";
  if (s.has("ga")) return "ga";
  return null;
}

function okJson(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: NO_STORE,
  });
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

        // Honeypot: silently swallow.
        if (d.website && d.website.trim().length > 0) {
          return okJson({ ok: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve email — session first, then entitlement match.
        let resolvedEmail: string | null = null;
        let verification: "session" | "entitlement_match" | null = null;
        let entitlementTier: string | null = null;

        const sessionToken = getCookie(SESSION_COOKIE);
        if (sessionToken && sessionToken.length >= 32) {
          const sessionHash = hashToken(sessionToken);
          const { data: sess } = await supabaseAdmin.rpc("session_active_scopes", {
            _session_hash: sessionHash,
          });
          const row = Array.isArray(sess) ? sess[0] : null;
          if (row?.buyer_email) {
            resolvedEmail = String(row.buyer_email).toLowerCase();
            verification = "session";
            const scopes: string[] = Array.isArray(row.scopes) ? row.scopes : [];
            entitlementTier = deriveTier(scopes);
          }
        }

        if (!resolvedEmail) {
          const bodyEmail = d.email?.trim().toLowerCase();
          if (!bodyEmail) {
            return okJson({ ok: true, message: NEUTRAL_NOT_FOUND_MESSAGE });
          }

          // Match against a confirmed registration or an active entitlement.
          const [regRes, entRes] = await Promise.all([
            supabaseAdmin
              .from("summit_registrations")
              .select("email, tier")
              .ilike("email", bodyEmail)
              .eq("payment_status", "confirmed")
              .limit(1),
            supabaseAdmin
              .from("entitlements")
              .select("buyer_email, product")
              .ilike("buyer_email", bodyEmail)
              .is("revoked_at", null)
              .limit(10),
          ]);

          const reg = regRes.data?.[0];
          const ents = entRes.data ?? [];
          if (!reg && ents.length === 0) {
            return okJson({ ok: true, message: NEUTRAL_NOT_FOUND_MESSAGE });
          }

          resolvedEmail = bodyEmail;
          verification = "entitlement_match";
          const scopes = ents.map((e) => e.product as string);
          entitlementTier = deriveTier(scopes) ?? reg?.tier ?? null;
        }

        const payload = {
          email: resolvedEmail,
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
          verification: verification ?? "entitlement_match",
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseAdmin
          .from("summit_audit")
          // Types regenerate after the verification-column migration; cast
          // keeps this compiling in the interim.
          .upsert(payload as never, { onConflict: "email" });

        if (error) {
          return new Response("Server error", { status: 500, headers: NO_STORE });
        }
        return okJson({ ok: true, verification });
      },
    },
  },
});
