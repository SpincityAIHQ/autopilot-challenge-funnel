import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { isValidReservationToken } from "@/lib/reservation-token";
import {
  computeReserveTransition,
  isAtOrAbove,
  type ReserveTier,
} from "@/lib/reserve-tier-transition";
import { resolveReserveCheckoutUrlFromProcessEnv } from "@/lib/reserve-checkout";

const NO_STORE = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const bodySchema = z.object({
  token: z.string(),
  step: z.enum(["vip", "vault"]),
});

function neutral(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ ok: false, error, ...(extra ?? {}) }),
    { status, headers: NO_STORE },
  );
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

        // Compare-and-set loop: never write a lower tier than what's already
        // in the row. On concurrent race we re-read and only accept a state
        // at or above the intended target.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: current, error: fetchErr } = await supabaseAdmin
            .from("summit_reservations")
            .select("tier_reserved")
            .eq("token", token)
            .maybeSingle();
          if (fetchErr) return neutral(500, "unavailable");
          if (!current) return neutral(404, "not_found");

          const currentTier = current.tier_reserved as ReserveTier;
          const decision = computeReserveTransition(currentTier, step);

          if (decision.kind === "vip_required") {
            return neutral(409, "vip_required", { next: `/reserve/vip?t=${token}` });
          }

          // For the vault step, resolve + validate the checkout URL BEFORE
          // committing / returning success. Fail closed if missing.
          let nextUrl: string | null = null;
          if (step === "vip") {
            nextUrl = `/reserve/vault?t=${token}`;
          } else {
            nextUrl = resolveReserveCheckoutUrlFromProcessEnv("ga_vip_vault");
            if (!nextUrl) {
              return new Response(
                JSON.stringify({ ok: false, error: "unavailable" }),
                { status: 503, headers: NO_STORE },
              );
            }
          }

          if (decision.kind === "noop") {
            return new Response(
              JSON.stringify({ ok: true, next: nextUrl }),
              { status: 200, headers: NO_STORE },
            );
          }

          // Compare-and-set: only update rows still at currentTier.
          const target = decision.next;
          const { data: updated, error: updErr } = await supabaseAdmin
            .from("summit_reservations")
            .update({ tier_reserved: target })
            .eq("token", token)
            .eq("tier_reserved", currentTier)
            .select("tier_reserved");
          if (updErr) return neutral(500, "unavailable");
          if (updated && updated.length > 0) {
            return new Response(
              JSON.stringify({ ok: true, next: nextUrl }),
              { status: 200, headers: NO_STORE },
            );
          }
          // Concurrent update. Re-read; accept if already at-or-above target.
          const { data: recheck } = await supabaseAdmin
            .from("summit_reservations")
            .select("tier_reserved")
            .eq("token", token)
            .maybeSingle();
          if (!recheck) return neutral(404, "not_found");
          const observed = recheck.tier_reserved as ReserveTier;
          if (isAtOrAbove(observed, target)) {
            return new Response(
              JSON.stringify({ ok: true, next: nextUrl }),
              { status: 200, headers: NO_STORE },
            );
          }
          // Otherwise loop and retry with the fresh observed tier.
        }
        return neutral(409, "conflict");
      },
    },
  },
});
