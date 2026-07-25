import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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

export const Route = createFileRoute("/api/public/mentorship-application")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 16 * 1024) {
          return new Response("Payload too large", { status: 413 });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const check = bodySchema.safeParse(parsed);
        if (!check.success) return new Response("Bad input", { status: 400 });
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
        if (error) return new Response("Server error", { status: 500 });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
