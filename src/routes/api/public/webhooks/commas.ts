import { createFileRoute } from "@tanstack/react-router";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  extractPayment,
  resolveTierFromProduct,
} from "@/lib/webhook-helpers";

/**
 * DISABLED-BY-DEFAULT Commas webhook scaffold.
 *
 * Fail-closed behavior:
 *  - If COMMAS_WEBHOOKS_ENABLED !== "true" → 503, no processing.
 *  - If COMMAS_WEBHOOK_SECRET is missing → 503, no processing.
 *  - Signature is verified against the EXACT raw body before ANY parsing.
 *  - Unknown product ids grant nothing.
 *  - Idempotent by provider event id AND payment id.
 *  - No email/SMS sending. Delivery is a separate downstream boundary.
 *
 * External-caller path: served under /api/public/* so it is reachable by
 * Commas on the published site. Every write is behind signature verification.
 */
export const Route = createFileRoute("/api/public/webhooks/commas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = process.env;

        // Fail closed until the operator explicitly enables it.
        if (env.COMMAS_WEBHOOKS_ENABLED !== "true") {
          return new Response("Webhook disabled", { status: 503 });
        }
        const secret = env.COMMAS_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        // Read raw body BEFORE parsing — HMAC must cover exact bytes.
        const rawBody = await request.text();
        const signature = request.headers.get("x-webhook-signature");

        if (!verifyCommasSignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const envelope = parseCommasEnvelope(rawBody);
        if (!envelope) {
          return new Response("Bad envelope", { status: 400 });
        }

        // Load admin client lazily — never at module scope of a route file.
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Idempotency by provider event id. Insert first; unique-violation ⇒ replay.
        const { error: eventInsertErr } = await supabaseAdmin
          .from("challenge_payment_events")
          .insert({
            provider_event_id: envelope.id,
            event_type: envelope.type,
            payment_id:
              (envelope.data as Record<string, unknown>).payment_id?.toString() ??
              null,
            payload: envelope as unknown as never,
            status: "received",
          });

        // 23505 = unique_violation → already processed this exact event.
        if (
          eventInsertErr &&
          (eventInsertErr as { code?: string }).code === "23505"
        ) {
          return new Response("Already processed", { status: 200 });
        }
        if (eventInsertErr) {
          return new Response("Event store error", { status: 500 });
        }

        // Ignore unsupported event types cleanly.
        if (!isSupportedEvent(envelope.type)) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({ status: "ignored", processed_at: new Date().toISOString() })
            .eq("provider_event_id", envelope.id);
          return new Response("Ignored", { status: 200 });
        }

        const payment = extractPayment(envelope);
        if (!payment) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "error",
              error: "missing payment fields",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Missing payment fields", { status: 400 });
        }

        const mapping = resolveTierFromProduct(payment.productId, env);
        if (!mapping) {
          // Unknown product → grant nothing.
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "ignored",
              error: "unknown product",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Unknown product", { status: 200 });
        }

        // Idempotency by payment id. If a registration already exists, do nothing more.
        const { data: existing } = await supabaseAdmin
          .from("challenge_registrations")
          .select("id")
          .eq("commas_payment_id", payment.paymentId)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Registration already exists", { status: 200 });
        }

        const { data: reg, error: regErr } = await supabaseAdmin
          .from("challenge_registrations")
          .insert({
            full_name: payment.buyer.fullName ?? "Unknown",
            email: payment.buyer.email ?? "unknown@unknown.invalid",
            phone: payment.buyer.phone,
            tier: mapping.tier,
            bump: mapping.bump,
            amount_cents: payment.amountCents ?? 0,
            currency: payment.currency,
            commas_payment_id: payment.paymentId,
            status: "confirmed",
          })
          .select("id")
          .single();

        if (regErr || !reg) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "error",
              error: regErr?.message ?? "registration insert failed",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Registration failed", { status: 500 });
        }

        if (mapping.tier === "founder") {
          const { error: seatErr } = await supabaseAdmin.rpc(
            "claim_lowest_founder_seat",
            { _registration_id: reg.id },
          );
          if (seatErr) {
            await supabaseAdmin
              .from("challenge_payment_events")
              .update({
                status: "error",
                error: seatErr.message,
                processed_at: new Date().toISOString(),
              })
              .eq("provider_event_id", envelope.id);
            return new Response("Seat claim failed", { status: 500 });
          }
        }

        await supabaseAdmin
          .from("challenge_payment_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("provider_event_id", envelope.id);

        // Post-verification delivery boundary:
        // downstream email/SMS providers would be called from here later.
        // Intentionally not implemented yet.

        return new Response("ok", { status: 200 });
      },
    },
  },
});
