import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCookie } from "@tanstack/react-start/server";
import { createHmac } from "node:crypto";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import {
  CONSENT_COPY,
  CONSENT_COPY_VERSION,
  SELLER_IDENTITY,
} from "@/lib/consent";

/**
 * Communication preferences POST endpoint.
 *
 * SECURITY MODEL — identity is SERVER-DERIVED, never client-supplied:
 *  - The buyer's HttpOnly `summit_rs` resource session cookie identifies
 *    the subject. The client CANNOT send an email field, so nobody can
 *    opt another person in or revoke someone else.
 *  - Missing/invalid session → 401. The client renders a warm resend
 *    instruction instead of a form. Transactional access email delivery
 *    is a SEPARATE flow (magic link over /api/public/resources/exchange)
 *    and is unaffected by these marketing preferences.
 *  - Same-origin required (fails closed when both Origin and Referer absent).
 *  - RATE_LIMIT_HMAC_SECRET required (sensitive consent endpoint).
 *  - Size-limited, rate-limited via durable DB store.
 *  - Adapters (Mailchimp / SMS / AI-call providers) remain OFF and are
 *    NOT called from here.
 *
 * EVIDENCE persisted per row in public.marketing_consents:
 *   subject_email      — derived from the session, never from the body
 *   channel            — email | sms | ai_call
 *   granted            — true/false (independent per channel)
 *   granted_at / revoked_at
 *   source             — 'communication-preferences'
 *   source_route       — full pathname the consent was captured on
 *   copy_version       — CONSENT_COPY_VERSION
 *   consent_text       — the EXACT string displayed at capture time
 *   seller             — SELLER_IDENTITY
 *   signer_name        — required when granting ai_call (typed e-signature)
 *   phone              — persisted only for sms / ai_call rows
 *   request_hash       — HMAC(secret, origin|referer|xff|host)
 *   user_agent_hash    — HMAC(secret, user-agent)
 *
 * The last two hashes are privacy-preserving: raw IP/UA never touch the row.
 */

const CHANNELS = ["email", "sms", "ai_call"] as const;
const SESSION_COOKIE = "summit_rs";
const SOURCE_ROUTE_DEFAULT = "/communication-preferences";

const bodySchema = z.object({
  // NOTE: no `email` here — subject is derived from the session cookie.
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^\+?[0-9()\-\s.]{7,32}$/)
    .optional()
    .or(z.literal("")),
  signerName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  sourceRoute: z.string().trim().max(120).optional().or(z.literal("")),
  channels: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      ai_call: z.boolean().optional(),
    })
    .default({}),
});

function noStore(contentType?: string): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (contentType) h.set("content-type", contentType);
  return h;
}
function respond(status: number, body: string, contentType?: string): Response {
  return new Response(body, { status, headers: noStore(contentType) });
}
function ok(): Response {
  return respond(200, JSON.stringify({ ok: true }), "application/json");
}
function hmacOf(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export const Route = createFileRoute("/api/public/communication-preferences")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) return respond(403, "Forbidden");

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return respond(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "commprefs", 10, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore();
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        // --- Identity: server-derived from HttpOnly session cookie. ---
        const sessionToken = getCookie(SESSION_COOKIE);
        if (!sessionToken || sessionToken.length < 32) {
          return respond(401, JSON.stringify({ error: "session_required" }), "application/json");
        }
        const sessionHash = hashToken(sessionToken);
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: sessRows, error: sessErr } = await supabaseAdmin.rpc(
          "session_active_scopes",
          { _session_hash: sessionHash },
        );
        if (sessErr) return respond(500, "Server error");
        const sessRow = Array.isArray(sessRows) ? sessRows[0] : null;
        const subjectEmail: string | undefined = sessRow?.buyer_email;
        if (!subjectEmail) {
          return respond(401, JSON.stringify({ error: "session_required" }), "application/json");
        }

        // --- Body ---
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

        const { phone, signerName, sourceRoute, channels } = parsed.data;
        const phoneClean = phone && phone.length > 0 ? phone : null;
        const signer = signerName && signerName.length > 0 ? signerName : null;
        const routeClean =
          sourceRoute && sourceRoute.length > 0 ? sourceRoute : SOURCE_ROUTE_DEFAULT;

        if ((channels.sms || channels.ai_call) && !phoneClean) {
          return respond(400, "Bad request");
        }
        // AI/prerecorded-call opt-in requires a typed name e-signature.
        if (channels.ai_call && !signer) {
          return respond(400, JSON.stringify({ error: "signature_required" }), "application/json");
        }

        // Privacy-preserving request evidence hashes.
        const requestContext =
          (request.headers.get("origin") ?? "") +
          "|" +
          (request.headers.get("referer") ?? "") +
          "|" +
          (request.headers.get("x-forwarded-for") ?? "") +
          "|" +
          (request.headers.get("host") ?? "");
        const uaHeader = request.headers.get("user-agent") ?? "";
        const requestHash = hmacOf(rlSecret, requestContext);
        const userAgentHash = hmacOf(rlSecret, uaHeader);

        const now = new Date().toISOString();
        const rows = CHANNELS.map((ch) => {
          const granted = Boolean(channels[ch]);
          return {
            subject_email: subjectEmail,
            channel: ch,
            granted,
            granted_at: granted ? now : null,
            revoked_at: granted ? null : now,
            source: "communication-preferences",
            source_route: routeClean,
            copy_version: CONSENT_COPY_VERSION,
            consent_text: CONSENT_COPY[ch],
            seller: SELLER_IDENTITY,
            signer_name: ch === "ai_call" && granted ? signer : null,
            phone: ch === "email" ? null : phoneClean,
            request_hash: requestHash,
            user_agent_hash: userAgentHash,
          };
        });

        const { error } = await supabaseAdmin
          .from("marketing_consents")
          .insert(rows);
        if (error) return respond(500, "Server error");

        return ok();
      },
    },
  },
});
