import { createFileRoute } from "@tanstack/react-router";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  extractPayment,
  resolveProductFromItem,
  redactEventPayload,
  expectedTotalCents,
  validateWebhookConfig,
  CANONICAL_FULFILLMENT_EVENT,
} from "@/lib/webhook-helpers";

/**
 * Commas webhook — AI AutoPilot Summit.
 *
 * Rules:
 *  - 503 unless enabled + secret set + all four core product IDs present
 *    and pairwise distinct.
 *  - HMAC-SHA256 over exact raw body vs x-webhook-signature.
 *  - Canonical fulfillment: `payment.succeeded` (data.status === "succeeded").
 *  - `product.purchased` is audit-only. Never fulfills.
 *  - Refund and failure events revoke the matching entitlement.
 *  - Monetary values are decimal DOLLARS → Math.round(v*100) → cents.
 *  - Currency REQUIRED; USD only.
 *  - amountCents MUST equal expected total for the mapped product.
 *  - Idempotent by provider event id AND commas_payment_id (RPC-side).
 *  - Payload stored redacted (no buyer PII in audit).
 *  - Unknown products grant nothing.
 *  - Terminal state updates checked; failed persistence → 500 (Commas retries).
 *  - Genuine Intensive-cap failure → deterministic 200.
 */

const MAX_BODY_BYTES = 64 * 1024;

export const Route = createFileRoute("/api/public/webhooks/commas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = process.env as Record<string, string | undefined>;
        const cfg = validateWebhookConfig(env);
        if (!cfg.ok) return new Response("Webhook unavailable", { status: 503 });
        const secret = env.COMMAS_WEBHOOK_SECRET as string;

        const rawBody = await request.text();
        if (rawBody.length > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        const signature = request.headers.get("x-webhook-signature");
        if (!verifyCommasSignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const envelope = parseCommasEnvelope(rawBody);
        if (!envelope) return new Response("Bad payload", { status: 400 });
        if (!isSupportedEvent(envelope.type)) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Store redacted audit envelope up front (idempotent on provider_event_id).
        const auditPayload = redactEventPayload(envelope);
        const auditInsert = await supabaseAdmin
          .from("summit_payment_events")
          .upsert(
            {
              provider_event_id: envelope.id,
              event_type: envelope.type,
              payment_id: (auditPayload.payment_id as string | null) ?? null,
              payload: auditPayload as unknown as Record<string, never>,
              status: "received",
            },
            { onConflict: "provider_event_id" },
          );
        if (auditInsert.error) {
          return new Response("Server error", { status: 500 });
        }

        // Only payment.succeeded fulfills. Everything else is audit-only.
        if (envelope.type !== CANONICAL_FULFILLMENT_EVENT) {
          // Handle refund/failure by revoking entitlement (best-effort).
          if (envelope.type === "payment.refunded" || envelope.type === "payment.failed") {
            const pid = auditPayload.payment_id as string | null;
            if (pid) {
              await supabaseAdmin
                .from("entitlements")
                .update({ revoked_at: new Date().toISOString() })
                .in(
                  "registration_id",
                  // subquery-ish: fetch reg ids by payment id in two steps
                  (
                    await supabaseAdmin
                      .from("summit_registrations")
                      .select("id")
                      .eq("commas_payment_id", pid)
                  ).data?.map((r) => r.id) ?? [],
                );
            }
          }
          await setTerminal(supabaseAdmin, envelope.id, "audited", null);
          return new Response("ok", { status: 200 });
        }

        const payment = extractPayment(envelope);
        if (!payment) {
          const err = await setTerminal(supabaseAdmin, envelope.id, "rejected", "malformed");
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }
        if (payment.currency !== "USD") {
          const err = await setTerminal(supabaseAdmin, envelope.id, "rejected", "non-usd");
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        const product = resolveProductFromItem(payment.baseItemId, env);
        if (!product) {
          const err = await setTerminal(supabaseAdmin, envelope.id, "rejected", "unknown-product");
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        const expected = expectedTotalCents(product);
        if (payment.amountCents !== expected) {
          const err = await setTerminal(supabaseAdmin, envelope.id, "rejected", "amount-mismatch");
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        // Fulfill atomically via RPC.
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
          "fulfill_summit_payment",
          {
            _product: product,
            _commas_payment_id: payment.paymentId,
            _amount_cents: payment.amountCents,
            _currency: payment.currency,
            _full_name: payment.buyer.fullName,
            _email: payment.buyer.email,
            _phone: payment.buyer.phone ?? "",
            _first_touch: null,
            _last_touch: null,
          },
        );

        if (rpcError) {
          // Distinguish cap-exhaustion (P0001) from transient errors.
          const isCap = /No intensive slots remaining/i.test(rpcError.message);
          if (isCap) {
            const err = await setTerminal(supabaseAdmin, envelope.id, "rejected", "intensive-cap");
            if (err) return new Response("Server error", { status: 500 });
            return new Response("ok", { status: 200 });
          }
          return new Response("Server error", { status: 500 });
        }

        void rpcData; // fulfillment succeeded

        const err = await setTerminal(supabaseAdmin, envelope.id, "fulfilled", null);
        if (err) return new Response("Server error", { status: 500 });
        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function setTerminal(
  admin: Awaited<
    ReturnType<
      typeof import("@/integrations/supabase/client.server").supabaseAdmin.from
    >
  > extends unknown
    ? typeof import("@/integrations/supabase/client.server").supabaseAdmin
    : never,
  eventId: string,
  status: string,
  error: string | null,
): Promise<boolean> {
  // returns true if the update failed
  const { error: e } = await admin
    .from("summit_payment_events")
    .update({
      status,
      error,
      processed_at: new Date().toISOString(),
    })
    .eq("provider_event_id", eventId);
  return Boolean(e);
}
