import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, callerId, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(32).optional(),
  business: z.string().trim().max(160).optional(),
  goals: z.string().trim().min(10).max(2000),
  current_offer: z.string().trim().max(500).optional(),
  monthly_revenue_band: z.string().trim().max(64).optional(),
  ready_to_invest: z.union([z.boolean(), z.literal("true"), z.literal("on")]).optional(),
});

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export const Route = createFileRoute("/api/public/mentorship-application")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) {
          return new Response("Forbidden", { status: 403, headers: NO_STORE });
        }
        const rl = rateLimit(`mentorship:${callerId(request)}`, 3, 60);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
        const raw = await request.text();
        if (raw.length > 16 * 1024) {
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
        const d = check.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("mentorship_applications").insert({
          full_name: d.full_name,
          email: d.email,
          phone: d.phone ?? null,
          business: d.business ?? null,
          goals: d.goals,
          current_offer: d.current_offer ?? null,
          monthly_revenue_band: d.monthly_revenue_band ?? null,
          ready_to_invest: Boolean(d.ready_to_invest),
        });
        if (error) return new Response("Server error", { status: 500, headers: NO_STORE });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: NO_STORE,
        });
      },
    },
  },
});
