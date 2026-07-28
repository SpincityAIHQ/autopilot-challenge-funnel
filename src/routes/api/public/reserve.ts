import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { generateReservationToken } from "@/lib/reservation-token";

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const bodySchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(32).regex(/^[+()\-.\s\d]+$/),
});

function generic500() {
  return new Response(
    JSON.stringify({ ok: false, error: "unavailable" }),
    { status: 500, headers: NO_STORE },
  );
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
          return new Response(
            JSON.stringify({ ok: false, error: "invalid" }),
            { status: 400, headers: NO_STORE },
          );
        }
        const { first_name, email, phone } = check.data;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Retry a small number of times on unique-token collision.
        let token = "";
        for (let attempt = 0; attempt < 4; attempt++) {
          const candidate = generateReservationToken();
          const { error } = await supabaseAdmin
            .from("summit_reservations")
            .insert({
              token: candidate,
              first_name,
              email: email.toLowerCase(),
              phone,
              tier_reserved: "ga",
              settled: false,
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

        return new Response(
          JSON.stringify({ ok: true, next: `/reserve/vip?t=${token}` }),
          { status: 200, headers: NO_STORE },
        );
      },
    },
  },
});
