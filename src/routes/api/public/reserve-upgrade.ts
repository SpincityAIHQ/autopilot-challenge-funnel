import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { isValidReservationToken } from "@/lib/reservation-token";

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const bodySchema = z.object({
  token: z.string(),
  step: z.enum(["vip", "vault"]),
});

type Tier = "ga" | "ga_vip" | "ga_vip_vault";

const RANK: Record<Tier, number> = { ga: 0, ga_vip: 1, ga_vip_vault: 2 };

function neutral(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: NO_STORE,
  });
}

export const Route = createFileRoute("/api/public/reserve-upgrade")({
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
        const rl = await consumeRateLimit(request, "reserve-upgrade", 10, 60, rlSecret);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
        const raw = await request.text();
        if (raw.length > 2 * 1024) {
          return new Response("Payload too large", { status: 413, headers: NO_STORE });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400, headers: NO_STORE });
        }
        const check = bodySchema.safeParse(parsed);
        if (!check.success) return neutral(400, "invalid");
        const { token, step } = check.data;
        if (!isValidReservationToken(token)) return neutral(400, "invalid");

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: current, error: fetchErr } = await supabaseAdmin
          .from("summit_reservations")
          .select("tier_reserved")
          .eq("token", token)
          .maybeSingle();
        if (fetchErr) return neutral(500, "unavailable");
        if (!current) return neutral(404, "not_found");

        const currentTier = current.tier_reserved as Tier;
        const target: Tier = step === "vip" ? "ga_vip" : "ga_vip_vault";

        // Vault step requires an already-VIP reservation (or already-vault).
        if (step === "vault" && RANK[currentTier] < RANK.ga_vip) {
          return new Response(
            JSON.stringify({ ok: false, error: "vip_required", next: `/reserve/vip?t=${token}` }),
            { status: 409, headers: NO_STORE },
          );
        }

        // Idempotent: never downgrade.
        if (RANK[target] > RANK[currentTier]) {
          const { error: updErr } = await supabaseAdmin
            .from("summit_reservations")
            .update({ tier_reserved: target })
            .eq("token", token);
          if (updErr) return neutral(500, "unavailable");
        }

        const next =
          step === "vip"
            ? `/reserve/vault?t=${token}`
            : null; // vault step: client navigates to external checkout it validates itself
        return new Response(
          JSON.stringify({ ok: true, next }),
          { status: 200, headers: NO_STORE },
        );
      },
    },
  },
});
