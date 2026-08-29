import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { generateReservationToken } from "@/lib/reservation-token";
import { CONSENT_COPY, CONSENT_COPY_VERSION, SELLER_IDENTITY } from "@/lib/consent";

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const bodySchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .regex(/^[+()\-.\s\d]+$/),
  consents: z
    .object({
      email: z.boolean(),
      sms: z.boolean(),
      ai_call: z.boolean(),
      signer_name: z.string().trim().max(80).optional().or(z.literal("")),
    })
    .optional(),
});

function hmacOf(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function sourceRouteFromRequest(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "unknown";
  try {
    const url = new URL(referer);
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== url.origin) return "unknown";
    return url.pathname.slice(0, 120) || "/";
  } catch {
    return "unknown";
  }
}

function generic500() {
  return new Response(JSON.stringify({ ok: false, error: "unavailable" }), {
    status: 500,
    headers: NO_STORE,
  });
}

export const Route = createFileRoute("/api/public/reserve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return new Response("Forbidden", { status: 403, headers: NO_STORE });
        }
        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) {
          return new Response("Service unavailable", { status: 503, headers: NO_STORE });
        }
        const rl = await consumeRateLimit(request, "reserve", 6, 60, rlSecret);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
        const raw = await request.text();
        if (raw.length > 4 * 1024) {
          return new Response("Payload too large", { status: 413, headers: NO_STORE });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400, headers: NO_STORE });
        }
        const check = bodySchema.safeParse(parsed);
        if (!check.success) {
          return new Response(JSON.stringify({ ok: false, error: "invalid" }), {
            status: 400,
            headers: NO_STORE,
          });
        }
        const { first_name, email, phone, consents } = check.data;
        const emailGranted = consents?.email === true;
        const smsGranted = consents?.sms === true;
        const aiCallGranted = consents?.ai_call === true;
        const signerName = consents?.signer_name?.trim() || null;
        if (aiCallGranted && (!signerName || signerName.length < 2)) {
          return new Response(JSON.stringify({ ok: false, error: "signature_required" }), {
            status: 400,
            headers: NO_STORE,
          });
        }

        const emailClean = email.toLowerCase();
        const phoneClean = phone.replace(/\s+/g, " ").trim();
        const sourceRoute = sourceRouteFromRequest(request);
        const requestContext =
          (request.headers.get("origin") ?? "") +
          "|" +
          (request.headers.get("referer") ?? "") +
          "|" +
          (request.headers.get("x-forwarded-for") ?? "") +
          "|" +
          (request.headers.get("host") ?? "");
        const requestHash = hmacOf(rlSecret, requestContext);
        const userAgentHash = hmacOf(rlSecret, request.headers.get("user-agent") ?? "");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Retry a small number of times on unique-token collision.
        let token = "";
        for (let attempt = 0; attempt < 4; attempt++) {
          const candidate = generateReservationToken();
          // One database transaction creates the reservation and records an
          // explicit granted/declined row for each optional marketing channel.
          // The booleans come from the unchecked controls; contact details are
          // never interpreted as consent.
          const { error } = await supabaseAdmin.rpc("create_summit_reservation_with_consents", {
            _token: candidate,
            _first_name: first_name,
            _email: emailClean,
            _phone: phoneClean,
            _email_granted: emailGranted,
            _sms_granted: smsGranted,
            _ai_call_granted: aiCallGranted,
            _ai_call_signer_name: aiCallGranted ? signerName : null,
            _source: "public-reservation",
            _source_route: sourceRoute,
            _copy_version: CONSENT_COPY_VERSION,
            _email_consent_text: CONSENT_COPY.email,
            _sms_consent_text: CONSENT_COPY.sms,
            _ai_call_consent_text: CONSENT_COPY.ai_call,
            _seller: SELLER_IDENTITY,
            _request_hash: requestHash,
            _user_agent_hash: userAgentHash,
          });
          if (!error) {
            token = candidate;
            break;
          }
          // 23505 = unique_violation — retry with fresh token
          const code = (error as { code?: string }).code;
          if (code !== "23505") {
            return generic500();
          }
        }
        if (!token) return generic500();

        return new Response(JSON.stringify({ ok: true, next: `/reserve/vip?t=${token}` }), {
          status: 200,
          headers: NO_STORE,
        });
      },
    },
  },
});
