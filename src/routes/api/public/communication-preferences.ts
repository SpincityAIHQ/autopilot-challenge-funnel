import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { CONSENT_COPY, CONSENT_COPY_VERSION } from "@/lib/consent";

/**
 * Communication preferences POST endpoint.
 * - Same-origin required (fails closed when both Origin and Referer absent).
 * - RATE_LIMIT_HMAC_SECRET REQUIRED (sensitive consent endpoint).
 *   Missing → 503, refuse to process.
 * - Size-limited, rate-limited via durable DB store.
 * - Validates input; never logs bodies.
 * - Writes one row per channel to public.marketing_consents with copy_version
 *   and (for sms/ai_call) phone.
 * - Returns a generic success payload. No PII echoed.
 * - Adapters (Mailchimp/SMS/AI-call providers) remain OFF and are not called.
 */

const CHANNELS = ["email", "sms", "ai_call"] as const;

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^\+?[0-9()\-\s.]{7,32}$/)
    .optional()
    .or(z.literal("")),
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

        const { email, phone, channels } = parsed.data;
        const phoneClean = phone && phone.length > 0 ? phone : null;

        if ((channels.sms || channels.ai_call) && !phoneClean) {
          return respond(400, "Bad request");
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const now = new Date().toISOString();

        const rows = CHANNELS.map((ch) => {
          const granted = Boolean(channels[ch]);
          return {
            subject_email: email,
            channel: ch,
            granted,
            granted_at: granted ? now : null,
            revoked_at: granted ? null : now,
            source: `communication-preferences:${CONSENT_COPY[ch].slice(0, 24)}`,
            copy_version: CONSENT_COPY_VERSION,
            phone: ch === "email" ? null : phoneClean,
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
