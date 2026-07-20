import { createFileRoute } from "@tanstack/react-router";
import {
  verifyCommasSignature,
  parseCommasEnvelope,
  isSupportedEvent,
  extractPayment,
  resolveTierFromProduct,
  detectGaBump,
  redactEventPayload,
  expectedTotalCents,
  validateWebhookConfig,
  CANONICAL_FULFILLMENT_EVENT,
} from "@/lib/webhook-helpers";

/**
 * Commas webhook — disabled-by-default, fail-closed.
 *
 * Rules (see README_SETUP.md):
 *  - 503 unless enabled AND secret set AND all five product IDs are
 *    present and pairwise distinct.
 *  - HMAC-SHA256 over the exact raw body against x-webhook-signature.
 *  - Canonical fulfillment event: `payment.succeeded` (data.status === "succeeded").
 *  - `product.purchased` is audit-only. It NEVER fulfills.
 *  - Monetary values are decimal DOLLARS → Math.round(v * 100) → cents.
 *  - Currency is REQUIRED in the payload; fulfillment allowed only when USD.
 *  - Amount cents MUST equal the expected total derived from the mapped
 *    tier (+ native GA bump). Any mismatch → generic operator-action error,
 *    NO fulfillment, NO seat claim.
 *  - GA recordings bump is detected via data.order_bumps[].item.id.
 *  - Payload stored redacted (no buyer name/email/phone/address/metadata).
 *  - Idempotent by provider event id AND by commas_payment_id (via fulfill RPC).
 *  - Unknown product ids grant nothing.
 *  - Every terminal event-state update is checked. If persisting a terminal
 *    state fails, return 500 so Commas retries.
 *  - Transient DB failure → 500. Genuine Founder-cap → deterministic 200.
 *  - Never expose internal error detail in HTTP responses.
 */

// Small guard against unbounded request bodies. Commas payloads are tiny.
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
        if (!envelope) return new Response("Bad envelope", { status: 400 });

        if (!isSupportedEvent(envelope.type)) {
          return new Response("Ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const redacted = redactEventPayload(envelope);
        const nowIso = () => new Date().toISOString();

        // Helper: persist a terminal state and return whether persisting worked.
        async function setTerminal(
          status: "processed" | "ignored" | "error",
          error?: string,
        ): Promise<boolean> {
          const patch: Record<string, unknown> = { status, processed_at: nowIso() };
          if (error !== undefined) patch.error = error;
          const { error: updErr } = await supabaseAdmin
            .from("challenge_payment_events")
            .update(patch)
            .eq("provider_event_id", envelope!.id);
          return !updErr;
        }

        // ------- Duplicate event id handling -------
        const { data: prior, error: priorErr } = await supabaseAdmin
          .from("challenge_payment_events")
          .select("id, status")
          .eq("provider_event_id", envelope.id)
          .maybeSingle();

        if (priorErr) return new Response("Store error", { status: 500 });

        if (prior) {
          if (prior.status === "processed" || prior.status === "ignored") {
            return new Response("Already handled", { status: 200 });
          }
          // received/error → resume below (do not re-insert row).
        } else {
          const { error: insErr } = await supabaseAdmin
            .from("challenge_payment_events")
            .insert({
              provider_event_id: envelope.id,
              event_type: envelope.type,
              payment_id: (redacted.payment_id as string | null) ?? null,
              payload: redacted as unknown as never,
              status: "received",
            });
          if (insErr && (insErr as { code?: string }).code !== "23505") {
            return new Response("Store error", { status: 500 });
          }
        }

        // ------- product.purchased is audit-only -------
        if (envelope.type !== CANONICAL_FULFILLMENT_EVENT) {
          if (!(await setTerminal("ignored"))) {
            return new Response("Store error", { status: 500 });
          }
          return new Response("Audit only", { status: 200 });
        }

        // ------- payment.succeeded fulfillment -------
        const payment = extractPayment(envelope);
        if (!payment) {
          if (!(await setTerminal("error", "invalid payment payload"))) {
            return new Response("Store error", { status: 500 });
          }
          return new Response("Invalid payload", { status: 400 });
        }

        const mapping = resolveTierFromProduct(payment.baseItemId, env);
        if (!mapping) {
          if (!(await setTerminal("ignored", "unknown product"))) {
            return new Response("Store error", { status: 500 });
          }
          return new Response("Unknown product", { status: 200 });
        }

        const bump =
          mapping.tier === "ga" ? detectGaBump(payment.bumpItemIds, env) : false;

        // Server-side price + currency enforcement.
        const expected = expectedTotalCents(mapping.tier, bump);
        if (payment.currency !== "USD" || payment.amountCents !== expected) {
          if (!(await setTerminal("error", "operator action required"))) {
            return new Response("Store error", { status: 500 });
          }
          // Deterministic 200 — retrying won't fix a wrong price/currency.
          return new Response("Verified", { status: 200 });
        }

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

          const ok = await setTerminal(
            "error",
            isFounderCap
              ? "founder cap reached — operator action required"
              : "fulfillment failed",
          );
          if (!ok && !isFounderCap) {
            return new Response("Fulfillment error", { status: 500 });
          }
          if (isFounderCap) {
            // Deterministic 200 so Commas stops retrying a genuine cap failure.
            return new Response("Founder cap", { status: 200 });
          }
          return new Response("Fulfillment error", { status: 500 });
        }

        const row = Array.isArray(fulfillData) ? fulfillData[0] : fulfillData;
        if (!row) return new Response("Fulfillment error", { status: 500 });

        if (!(await setTerminal("processed"))) {
          // Fulfillment succeeded but we couldn't mark it — let Commas retry;
          // fulfill_challenge_payment is idempotent by commas_payment_id.
          return new Response("Store error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
