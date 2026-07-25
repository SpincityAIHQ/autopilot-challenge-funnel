import { createFileRoute } from "@tanstack/react-router";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  isReversalEvent,
  extractPayment,
  extractPaymentIdForReversal,
  resolveProductFromItem,
  redactEventPayload,
  expectedTotalCents,
  validateWebhookConfig,
  CANONICAL_FULFILLMENT_EVENT,
} from "@/lib/webhook-helpers";

/**
 * Commas webhook — AI AutoPilot Summit.
 *
 * Enable/gate rules:
 *  - 503 unless enabled + secret set + 5 core product ids present and distinct.
 *  - HMAC-SHA256 over the exact raw body vs x-webhook-signature.
 *  - 413 for bodies over 64KB.
 *
 * Event handling:
 *  - `payment.succeeded` is the canonical fulfillment path.
 *  - `product.purchased` is audit-only. Never fulfills.
 *  - `payment.refunded` | `payment.failed` | `payment.disputed` → atomic reversal
 *     via reverse_summit_payment RPC (revokes entitlements, releases intensive slot).
 *
 * Fulfillment guarantees:
 *  - Monetary values are decimal DOLLARS → Math.round(v*100) → cents.
 *  - Currency REQUIRED and MUST be USD.
 *  - amountCents MUST equal expected total for the mapped product.
 *  - Idempotent by provider_event_id AND commas_payment_id (RPC-side).
 *  - Payload stored redacted (no buyer PII in audit).
 *  - Unknown products grant nothing.
 *  - VIP-upgrade + Vault require an existing GA or VIP (enforced in RPC).
 *  - Terminal state persist failure → 500 (Commas retries).
 *  - Genuine Intensive-cap failure → deterministic 200 (no retry, no seat).
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

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

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

        // Reversal branch — refund / failed / disputed all revoke atomically.
        if (isReversalEvent(envelope.type)) {
          const pid = extractPaymentIdForReversal(envelope);
          if (!pid) {
            const err = await setTerminal(
              supabaseAdmin,
              envelope.id,
              "rejected",
              "reversal-no-payment-id",
            );
            if (err) return new Response("Server error", { status: 500 });
            return new Response("Ignored", { status: 200 });
          }
          const { error: revErr } = await supabaseAdmin.rpc(
            "reverse_summit_payment",
            { _commas_payment_id: pid },
          );
          if (revErr) {
            return new Response("Server error", { status: 500 });
          }
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "reversed",
            null,
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("ok", { status: 200 });
        }

        // product.purchased is audit-only.
        if (envelope.type !== CANONICAL_FULFILLMENT_EVENT) {
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "audited",
            null,
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("ok", { status: 200 });
        }

        const payment = extractPayment(envelope);
        if (!payment) {
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "rejected",
            "malformed",
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }
        if (payment.currency !== "USD") {
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "rejected",
            "non-usd",
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        const product = resolveProductFromItem(payment.baseItemId, env);
        if (!product) {
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "rejected",
            "unknown-product",
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        const expected = expectedTotalCents(product);
        if (payment.amountCents !== expected) {
          const err = await setTerminal(
            supabaseAdmin,
            envelope.id,
            "rejected",
            "amount-mismatch",
          );
          if (err) return new Response("Server error", { status: 500 });
          return new Response("Ignored", { status: 200 });
        }

        const { error: rpcError } = await supabaseAdmin.rpc(
          "fulfill_summit_payment",
          {
            _product: product,
            _commas_payment_id: payment.paymentId,
            _amount_cents: payment.amountCents,
            _currency: payment.currency,
            _full_name: payment.buyer.fullName,
            _email: payment.buyer.email,
            _phone: payment.buyer.phone ?? "",
            // ATTRIBUTION BLOCKED (see docs/operator-launch-checklist.md).
            // The exact Commas metadata/custom-field name for first/last-touch
            // is not yet confirmed by a signed sample payload. Until then we
            // pass null rather than guess field names and mis-attribute.
            _first_touch: null,
            _last_touch: null,
          },
        );

        if (rpcError) {
          const msg = rpcError.message ?? "";
          // Durable operator-action record: cap and precondition rejections
          // MUST persist a terminal row with product + reason. If the
          // durable write fails we return 500 so Commas retries — never a
          // silent 200 on a paid event that leaves no operator trail.
          if (/No intensive slots remaining/i.test(msg)) {
            const err = await setTerminal(
              supabaseAdmin,
              envelope.id,
              "rejected",
              "intensive-cap",
              product,
              payment.paymentId,
            );
            if (err) return new Response("Server error", { status: 500 });
            return new Response("ok", { status: 200 });
          }
          // Sequential-funnel precondition family: both wording variants
          // ("requires an existing GA registration", "requires an active
          // VIP entitlement", "requires an active Vault entitlement") are
          // permanent for the same payment — do NOT retry indefinitely.
          if (
            /requires an existing/i.test(msg) ||
            /requires an active/i.test(msg) ||
            /precondition/i.test(msg)
          ) {
            const err = await setTerminal(
              supabaseAdmin,
              envelope.id,
              "rejected",
              "precondition-not-met",
              product,
              payment.paymentId,
            );
            if (err) return new Response("Server error", { status: 500 });
            return new Response("ok", { status: 200 });
          }
          return new Response("Server error", { status: 500 });
        }

        const err = await setTerminal(
          supabaseAdmin,
          envelope.id,
          "fulfilled",
          null,
        );
        if (err) return new Response("Server error", { status: 500 });
        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function setTerminal(
  admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  eventId: string,
  status: string,
  error: string | null,
  product?: string | null,
  paymentId?: string | null,
): Promise<boolean> {
  const update = {
    status,
    error,
    processed_at: new Date().toISOString(),
    ...(product ? { product } : {}),
    ...(paymentId ? { payment_id: paymentId } : {}),
  };
  const { error: e } = await admin
    .from("summit_payment_events")
    .update(update)
    .eq("provider_event_id", eventId);
  return Boolean(e);
}
