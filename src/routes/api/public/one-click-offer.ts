import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { expectedTotalCents } from "@/lib/tiers";

const SESSION_COOKIE = "summit_rs";
const bodySchema = z.object({
  product: z.enum(["vip_upgrade", "vault"]),
  confirmed: z.literal(true),
});

function headers(): Headers {
  return new Headers({
    "cache-control": "private, no-store",
    "content-type": "application/json",
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

async function verifiedIdentity() {
  const sessionToken = getCookie(SESSION_COOKIE);
  if (!sessionToken || sessionToken.length < 32) return null;

  const sessionHash = hashToken(sessionToken);
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
    _session_hash: sessionHash,
  });
  if (error) throw new Error("session lookup failed");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.buyer_email !== "string") return null;

  return {
    buyerEmail: row.buyer_email.trim().toLowerCase(),
    scopes: Array.isArray(row.scopes)
      ? row.scopes.filter(
          (scope): scope is string => typeof scope === "string",
        )
      : [],
  };
}

export const Route = createFileRoute("/api/public/one-click-offer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!assertSameOrigin(request)) return json(403, { available: false });

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return json(503, { available: false });
        const rate = await consumeRateLimit(
          request,
          "one-click-quote",
          30,
          60,
          rlSecret,
        );
        if (!rate.ok) {
          const h = headers();
          h.set("retry-after", String(rate.retryAfterSeconds));
          return new Response(JSON.stringify({ available: false }), {
            status: 429,
            headers: h,
          });
        }

        const url = new URL(request.url);
        const product = url.searchParams.get("product");
        const server = await import("@/lib/commas-one-click.server");
        if (!server.isOneClickProduct(product)) {
          return json(400, { available: false, reason: "bad-product" });
        }

        const cfg = server.getOneClickConfig();
        if (!cfg) {
          return json(200, { available: false, reason: "not-configured" });
        }

        let identity;
        try {
          identity = await verifiedIdentity();
        } catch {
          return json(500, { available: false, reason: "server-error" });
        }
        if (!identity) {
          return json(401, { available: false, reason: "not-authenticated" });
        }

        const eligibility = server.oneClickEligibility(identity.scopes, product);
        if (!eligibility.eligible) {
          return json(403, {
            available: false,
            reason: eligibility.alreadyOwned ? "already-owned" : "not-eligible",
          });
        }

        try {
          const card = await server.findSavedCard(identity.buyerEmail, cfg);
          if (!card) {
            return json(200, { available: false, reason: "no-saved-card" });
          }
          return json(200, {
            available: true,
            product,
            amountCents: expectedTotalCents(product),
            card: { brand: card.brand, last4: card.last4 },
            successPath: server.ONE_CLICK_SUCCESS_PATH[product],
          });
        } catch {
          return json(200, { available: false, reason: "provider-unavailable" });
        }
      },

      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) return json(403, { ok: false });

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return json(503, { ok: false });
        const rate = await consumeRateLimit(
          request,
          "one-click-charge",
          5,
          60,
          rlSecret,
        );
        if (!rate.ok) {
          const h = headers();
          h.set("retry-after", String(rate.retryAfterSeconds));
          return new Response(JSON.stringify({ ok: false, reason: "rate-limit" }), {
            status: 429,
            headers: h,
          });
        }

        let parsedBody: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (raw.length > 2048) return json(400, { ok: false });
          const parsed = bodySchema.safeParse(JSON.parse(raw));
          if (!parsed.success) return json(400, { ok: false });
          parsedBody = parsed.data;
        } catch {
          return json(400, { ok: false });
        }

        const server = await import("@/lib/commas-one-click.server");
        const cfg = server.getOneClickConfig();
        if (!cfg) return json(503, { ok: false, reason: "not-configured" });

        let identity;
        try {
          identity = await verifiedIdentity();
        } catch {
          return json(500, { ok: false, reason: "server-error" });
        }
        if (!identity) {
          return json(401, { ok: false, reason: "not-authenticated" });
        }

        const eligibility = server.oneClickEligibility(
          identity.scopes,
          parsedBody.product,
        );
        if (!eligibility.eligible) {
          return json(403, {
            ok: false,
            reason: eligibility.alreadyOwned ? "already-owned" : "not-eligible",
          });
        }

        let card;
        try {
          card = await server.findSavedCard(identity.buyerEmail, cfg);
        } catch {
          return json(502, { ok: false, reason: "provider-unavailable" });
        }
        if (!card) return json(409, { ok: false, reason: "no-saved-card" });

        const idempotencyKey = server.makeIdempotencyKey(
          identity.buyerEmail,
          parsedBody.product,
        );
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const reserve = await (supabaseAdmin as any).rpc(
          "reserve_one_click_charge",
          {
            _buyer_email: identity.buyerEmail,
            _product: parsedBody.product,
            _amount_cents: expectedTotalCents(parsedBody.product),
            _idempotency_key: idempotencyKey,
            _card_last4: card.last4,
          },
        );
        if (reserve.error) {
          return json(500, { ok: false, reason: "server-error" });
        }
        const attempt = Array.isArray(reserve.data) ? reserve.data[0] : null;
        if (!attempt || typeof attempt.attempt_id !== "string") {
          return json(500, { ok: false, reason: "server-error" });
        }
        if (attempt.reserved !== true) {
          return json(409, {
            ok: false,
            reason:
              attempt.current_status === "succeeded"
                ? "already-charged"
                : "charge-processing",
          });
        }

        try {
          const charge = await server.chargeSavedCard({
            cfg,
            product: parsedBody.product,
            card,
            idempotencyKey,
          });

          // Fulfill immediately so the buyer can move through the funnel without
          // waiting for the webhook. The webhook will call the same idempotent
          // RPC again when Commas delivers payment.succeeded.
          const registration = await supabaseAdmin
            .from("summit_registrations")
            .select("full_name, phone")
            .ilike("email", identity.buyerEmail)
            .eq("payment_status", "confirmed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const profile = registration.data;
          const fulfillment = await (supabaseAdmin as any).rpc(
            "fulfill_summit_payment",
            {
              _product: parsedBody.product,
              _commas_payment_id: charge.chargeId,
              _amount_cents: expectedTotalCents(parsedBody.product),
              _currency: "USD",
              _full_name:
                typeof profile?.full_name === "string" && profile.full_name
                  ? profile.full_name
                  : "Summit Buyer",
              _email: identity.buyerEmail,
              _phone:
                typeof profile?.phone === "string" ? profile.phone : "",
              _first_touch: null,
              _last_touch: null,
            },
          );

          if (fulfillment.error) {
            await (supabaseAdmin as any).rpc("finish_one_click_charge", {
              _attempt_id: attempt.attempt_id,
              _status: "unknown",
              _provider_charge_id: charge.chargeId,
              _error_code: "payment-received-fulfillment-pending",
            });
            return json(202, {
              ok: false,
              paid: true,
              reason: "payment-received-pending",
            });
          }

          await (supabaseAdmin as any).rpc("finish_one_click_charge", {
            _attempt_id: attempt.attempt_id,
            _status: "succeeded",
            _provider_charge_id: charge.chargeId,
            _error_code: null,
          });

          return json(200, {
            ok: true,
            product: parsedBody.product,
            successPath: server.ONE_CLICK_SUCCESS_PATH[parsedBody.product],
          });
        } catch (error) {
          const oneClickError =
            error instanceof server.CommasOneClickError ? error : null;
          const terminalStatus = oneClickError?.uncertain ? "unknown" : "failed";
          await (supabaseAdmin as any).rpc("finish_one_click_charge", {
            _attempt_id: attempt.attempt_id,
            _status: terminalStatus,
            _provider_charge_id: null,
            _error_code: oneClickError?.code ?? "charge-error",
          });

          return json(oneClickError?.uncertain ? 409 : 422, {
            ok: false,
            reason: oneClickError?.uncertain
              ? "charge-status-unknown"
              : "charge-declined",
          });
        }
      },
    },
  },
});
