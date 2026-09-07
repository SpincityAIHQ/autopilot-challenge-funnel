import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1).max(120),
  email_marketing_consent: z.boolean().optional(),
  source: z.string().trim().max(64).optional(),
  attribution: z.record(z.string(), z.string().max(128)).optional(),
});

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export const Route = createFileRoute("/api/public/training-waitlist")({
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
        const rl = await consumeRateLimit(request, "training-waitlist", 5, 60, rlSecret);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
        const raw = await request.text();
        if (raw.length > 8 * 1024) {
          return new Response("Payload too large", { status: 413, headers: NO_STORE });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400, headers: NO_STORE });
        }
        const check = bodySchema.safeParse(parsed);
        if (!check.success) return new Response("Bad input", { status: 400, headers: NO_STORE });
        const { email, full_name, email_marketing_consent, source, attribution } = check.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("training_waitlist").insert({
          email,
          full_name,
          email_marketing_consent: Boolean(email_marketing_consent),
          email_marketing_consent_at: email_marketing_consent ? new Date().toISOString() : null,
          source: source ?? "landing",
          attribution: attribution ?? {},
        });
        // A repeat signup is a success from the visitor's point of view.
        if (error && !`${error.code}`.startsWith("23")) {
          return new Response("Server error", { status: 500, headers: NO_STORE });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: NO_STORE });
      },
    },
  },
});
