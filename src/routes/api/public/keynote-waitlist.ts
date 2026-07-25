import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().max(120).optional(),
  email_marketing_consent: z.boolean().optional(),
  source: z.string().trim().max(64).optional(),
});

export const Route = createFileRoute("/api/public/keynote-waitlist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 8 * 1024) {
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
        const { email, full_name, email_marketing_consent, source } = check.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("keynote_waitlist")
          .insert({
            email,
            full_name: full_name ?? null,
            email_marketing_consent: Boolean(email_marketing_consent),
            email_marketing_consent_at: email_marketing_consent ? new Date().toISOString() : null,
            source: source ?? "keynote-page",
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
