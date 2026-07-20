import { createFileRoute } from "@tanstack/react-router";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  extractPayment,
  resolveTierFromProduct,
  detectGaBump,
  redactEventPayload,
  CANONICAL_FULFILLMENT_EVENT,
} from "@/lib/webhook-helpers";

/**
 * Commas webhook — disabled-by-default, fail-closed.
 *
 * Rules (see README_SETUP.md):
 *  - 503 unless COMMAS_WEBHOOKS_ENABLED === "true" AND COMMAS_WEBHOOK_SECRET set.
 *  - HMAC-SHA256 over the exact raw body against x-webhook-signature.
 *  - Canonical fulfillment event: `payment.succeeded` with data.status === "succeeded".
 *  - `product.purchased` is audit-only. It NEVER fulfills.
 *  - Monetary values are decimal DOLLARS → Math.round(v * 100) → cents.
 *  - GA recordings bump is detected via data.order_bumps[].item.id.
 *  - Payload stored redacted (no buyer name/email/phone/address/metadata).
 *  - Idempotent by provider event id AND by commas_payment_id (via fulfill RPC).
 *  - Unknown product ids grant nothing.
 *  - Transient DB failure → 500 (Commas will retry).
 *  - Founder-cap "no seat" → recorded, deterministic 200 (no retry loop),
 *    grants nothing.
 *  - Never expose internal error detail in HTTP responses.
 */
export const Route = createFileRoute("/api/public/webhooks/commas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = process.env;

        if (env.COMMAS_WEBHOOKS_ENABLED !== "true") {
          return new Response("Webhook disabled", { status: 503 });
        }
        const secret = env.COMMAS_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const rawBody = await request.text();
        const signature = request.headers.get("x-webhook-signature");
        if (!verifyCommasSignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const envelope = parseCommasEnvelope(rawBody);
        if (!envelope) return new Response("Bad envelope", { status: 400 });

        if (!isSupportedEvent(envelope.type)) {
          // Store nothing for unknown types (we cannot even guarantee shape).
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const redacted = redactEventPayload(envelope);

        // ------- Duplicate event id handling -------
        // Look up prior state instead of assuming "already processed."
        const { data: prior, error: priorErr } = await supabaseAdmin
          .from("challenge_payment_events")
          .select("id, status")
          .eq("provider_event_id", envelope.id)
          .maybeSingle();

        if (priorErr) {
          // Transient — let Commas retry.
          return new Response("Store error", { status: 500 });
        }

        if (prior) {
          if (prior.status === "processed" || prior.status === "ignored") {
            return new Response("Already handled", { status: 200 });
          }
          // received/error → resume safely below (do not re-insert row).
        } else {
          const { error: insErr } = await supabaseAdmin
            .from("challenge_payment_events")
            .insert({
              provider_event_id: envelope.id,
              event_type: envelope.type,
              payment_id:
                (redacted.payment_id as string | null) ?? null,
              payload: redacted as unknown as never,
              status: "received",
            });
          if (insErr) {
            // 23505 = unique_violation → concurrent insert; treat as replay-safe.
            if ((insErr as { code?: string }).code !== "23505") {
              return new Response("Store error", { status: 500 });
            }
          }
        }

        // ------- product.purchased is audit-only -------
        if (envelope.type !== CANONICAL_FULFILLMENT_EVENT) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "ignored",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Audit only", { status: 200 });
        }

        // ------- payment.succeeded fulfillment -------
        const payment = extractPayment(envelope);
        if (!payment) {
          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "error",
              error: "invalid payment payload",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);
          return new Response("Invalid payload", { status: 400 });
        }

        const mapping = resolveTierFromProduct(payment.baseItemId, env);
        if (!mapping) {
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

        const bump =
          mapping.tier === "ga" ? detectGaBump(payment.bumpItemIds, env) : false;

        const { data: fulfillData, error: fulfillErr } = await supabaseAdmin.rpc(
          "fulfill_challenge_payment",
          {
            _commas_payment_id: payment.paymentId,
            _tier: mapping.tier,
            _bump: bump,
            _amount_cents: payment.amountCents,
            _currency: payment.currency,
            _full_name: payment.buyer.fullName,
            _email: payment.buyer.email,
            _phone: payment.buyer.phone ?? "",
          },
        );

        if (fulfillErr) {
          const isFounderCap =
            mapping.tier === "founder" &&
            typeof fulfillErr.message === "string" &&
            /founder seats remaining|seat claim race lost/i.test(fulfillErr.message);

          await supabaseAdmin
            .from("challenge_payment_events")
            .update({
              status: "error",
              error: isFounderCap
                ? "founder cap reached — operator action required"
                : "fulfillment failed",
              processed_at: new Date().toISOString(),
            })
            .eq("provider_event_id", envelope.id);

          if (isFounderCap) {
            // Deterministic 200 so Commas stops retrying a genuine cap failure.
            return new Response("Founder cap", { status: 200 });
          }
          // Transient — allow Commas to retry.
          return new Response("Fulfillment error", { status: 500 });
        }

        // rpc returns TABLE → array of rows
        const row = Array.isArray(fulfillData) ? fulfillData[0] : fulfillData;
        if (!row) {
          return new Response("Fulfillment error", { status: 500 });
        }

        await supabaseAdmin
          .from("challenge_payment_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("provider_event_id", envelope.id);

        // Post-verification delivery boundary: transactional email/SMS
        // is a separate downstream service and is intentionally not wired here.
        return new Response("ok", { status: 200 });
      },
    },
  },
});
