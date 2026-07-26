import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { isEligibleForOneClick, isOneClickProduct } from "@/lib/one-click";
import { expectedTotalCents, UPSELLS } from "@/lib/tiers";

/**
 * Saved-card one-click upgrade — $77 VIP and $199 Vault only.
 *
 * GET  → what the buyer may see: `{ brand, last4 }`, the price, and whether a
 *        one-click is currently possible. Nothing else.
 * POST → claim the duplicate-charge guard, charge the stored card, fulfil.
 *
 * Security posture (every item is enforced below, not merely intended):
 *  - The Commas API key never reaches the browser: it is read inside
 *    commas-one-click.server.ts, which no client component imports.
 *  - Customer ids and payment-method ids never reach the browser. Only the
 *    card brand and last four are serialized.
 *  - The SERVER decides the price, from expectedTotalCents(). A price in the
 *    request body is ignored entirely.
 *  - The buyer must present a valid Summit session cookie; the email comes
 *    from that session, never from the request.
 *  - Ownership of the previous rung of the funnel is verified from live
 *    entitlements, and re-verified inside begin_one_click_charge.
 *  - Each charge requires `confirm: true`, so a click cannot happen by way of
 *    a stray fetch or a prefetch.
 *  - An atomic DB row must be claimed before any money moves.
 *  - Commas receives an Idempotency-Key equal to that row's id.
 *  - An unknown or delayed status holds the guard shut and tells the buyer not
 *    to click again, rather than inviting a second attempt.
 *  - Whenever one-click is unavailable for ANY reason, the response says so
 *    and the UI falls back to the normal Commas checkout link.
 *
 * The $1,000 Intensive is deliberately excluded — see src/lib/one-click.ts.
 */

const SESSION_COOKIE = "summit_rs";
const CURRENCY = "USD";

function noStore(json: boolean): Headers {
  const h = new Headers({ "cache-control": "private, no-store" });
  if (json) h.set("content-type", "application/json");
  return h;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: noStore(true),
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: noStore(false) });
}

/** Unavailable for any reason → the caller shows secure checkout instead. */
function unavailable(priceCents: number, reason: string): Response {
  return jsonResponse(200, {
    oneClickAvailable: false,
    card: null,
    priceCents,
    alreadyOwned: false,
    awaitingConfirmation: false,
    reason,
  });
}

interface SessionContext {
  email: string;
  scopes: string[];
}

async function resolveSession(): Promise<SessionContext | null> {
  const sessionToken = getCookie(SESSION_COOKIE);
  if (!sessionToken || sessionToken.length < 32) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
    _session_hash: hashToken(sessionToken),
  });
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.buyer_email !== "string" || row.buyer_email === "") {
    return null;
  }
  const scopes: string[] = Array.isArray(row.scopes)
    ? row.scopes.filter((s: unknown): s is string => typeof s === "string")
    : [];
  return { email: row.buyer_email, scopes };
}

export const Route = createFileRoute("/api/public/one-click-upgrade")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!assertSameOrigin(request)) return textResponse(403, "Forbidden");

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return textResponse(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "oneclick-get", 30, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore(false);
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        const url = new URL(request.url);
        const product = url.searchParams.get("product");
        if (!isOneClickProduct(product)) {
          return textResponse(400, "Bad request");
        }
        const priceCents = expectedTotalCents(product);

        const session = await resolveSession();
        if (!session) return unavailable(priceCents, "no-session");
        if (!isEligibleForOneClick(product, session.scopes)) {
          return unavailable(priceCents, "not-eligible");
        }

        const { getOneClickConfig, findSavedCard } = await import("@/lib/commas-one-click.server");
        const cfg = getOneClickConfig();
        if (!cfg) return unavailable(priceCents, "not-configured");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: stateRows, error: stateError } = await supabaseAdmin.rpc(
          "one_click_charge_state",
          { _buyer_email: session.email, _product: product },
        );
        if (stateError) return unavailable(priceCents, "state-unavailable");

        const blocking = Array.isArray(stateRows) ? stateRows[0] : null;
        if (blocking?.status === "succeeded") {
          return jsonResponse(200, {
            oneClickAvailable: false,
            card: null,
            priceCents,
            alreadyOwned: true,
            awaitingConfirmation: false,
          });
        }
        if (blocking?.status === "pending" || blocking?.status === "unknown") {
          return jsonResponse(200, {
            oneClickAvailable: false,
            card: null,
            priceCents,
            alreadyOwned: false,
            awaitingConfirmation: true,
          });
        }

        const card = await findSavedCard(session.email, cfg);
        if (!card) return unavailable(priceCents, "no-saved-card");

        // ONLY brand and last4 cross this boundary. customerId and
        // paymentMethodId stay on the server.
        return jsonResponse(200, {
          oneClickAvailable: true,
          card: { brand: card.brand, last4: card.last4 },
          priceCents,
          alreadyOwned: false,
          awaitingConfirmation: false,
        });
      },

      POST: async ({ request }) => {
        if (!assertSameOrigin(request)) return textResponse(403, "Forbidden");

        const rlSecret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
        if (!rlSecret) return textResponse(503, "Service unavailable");
        const rl = await consumeRateLimit(request, "oneclick-post", 5, 60, rlSecret);
        if (!rl.ok) {
          const h = noStore(false);
          h.set("retry-after", String(rl.retryAfterSeconds));
          return new Response("Too many requests", { status: 429, headers: h });
        }

        let parsed: { product?: unknown; confirm?: unknown };
        try {
          const raw = await request.text();
          if (raw.length > 2048) return textResponse(400, "Bad request");
          parsed = JSON.parse(raw) as { product?: unknown; confirm?: unknown };
        } catch {
          return textResponse(400, "Bad request");
        }

        const product = parsed.product;
        if (!isOneClickProduct(product)) return textResponse(400, "Bad request");
        // Explicit confirmation is mandatory for every single charge.
        if (parsed.confirm !== true) return textResponse(400, "Bad request");

        // The server owns the price. Nothing from the body influences it.
        const amountCents = expectedTotalCents(product);

        const session = await resolveSession();
        if (!session) return jsonResponse(401, { error: "no-session" });
        if (!isEligibleForOneClick(product, session.scopes)) {
          return jsonResponse(403, { error: "not-eligible", fallback: true });
        }

        const { getOneClickConfig, findSavedCard, chargeSavedCard } =
          await import("@/lib/commas-one-click.server");
        const cfg = getOneClickConfig();
        if (!cfg) {
          return jsonResponse(503, { error: "not-configured", fallback: true });
        }

        const card = await findSavedCard(session.email, cfg);
        if (!card) {
          return jsonResponse(409, { error: "no-saved-card", fallback: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Claim the guard BEFORE any money can move.
        const { data: claimRows, error: claimError } = await supabaseAdmin.rpc(
          "begin_one_click_charge",
          {
            _buyer_email: session.email,
            _product: product,
            _amount_cents: amountCents,
            _currency: CURRENCY,
          },
        );
        if (claimError) {
          const msg = claimError.message ?? "";
          if (/already owned/i.test(msg)) {
            return jsonResponse(409, { error: "already-owned" });
          }
          if (/requires an active/i.test(msg)) {
            return jsonResponse(403, { error: "not-eligible", fallback: true });
          }
          return jsonResponse(503, { error: "unavailable", fallback: true });
        }

        const claim = Array.isArray(claimRows) ? claimRows[0] : null;
        if (!claim?.charge_id) {
          return jsonResponse(503, { error: "unavailable", fallback: true });
        }
        if (claim.blocked_status === "succeeded") {
          return jsonResponse(409, { error: "already-charged" });
        }
        if (claim.blocked_status === "pending" || claim.blocked_status === "unknown") {
          return jsonResponse(409, { error: "in-progress", doNotRetry: true });
        }

        const chargeId = claim.charge_id as string;

        const result = await chargeSavedCard(
          {
            customerId: card.customerId,
            paymentMethodId: card.paymentMethodId,
            amountCents,
            currency: CURRENCY,
            // The guard row's id doubles as the idempotency key, so Commas and
            // this database agree on exactly what "one attempt" means.
            idempotencyKey: chargeId,
            description: UPSELLS[product].name,
            email: session.email,
          },
          cfg,
        );

        if (result.outcome === "failed") {
          // An explicit decline is the only outcome that releases the guard.
          await supabaseAdmin.rpc("complete_one_click_charge", {
            _charge_id: chargeId,
            _status: "failed",
            _commas_payment_id: result.paymentId,
            _error: "declined",
          });
          return jsonResponse(402, { error: "declined", fallback: true });
        }

        if (result.outcome === "unknown" || !result.paymentId) {
          // We cannot prove the money did not move. Keep the guard shut.
          await supabaseAdmin.rpc("complete_one_click_charge", {
            _charge_id: chargeId,
            _status: "unknown",
            _commas_payment_id: result.paymentId,
            _error: "indeterminate",
          });
          return jsonResponse(202, { error: "indeterminate", doNotRetry: true });
        }

        // Charge confirmed. Grant access immediately rather than waiting for
        // the webhook. fulfill_summit_payment is idempotent by payment id, so
        // the webhook for this same payment is a safe no-op afterwards.
        const { error: fulfillError } = await supabaseAdmin.rpc("fulfill_summit_payment", {
          _product: product,
          _commas_payment_id: result.paymentId,
          _amount_cents: amountCents,
          _currency: CURRENCY,
          _full_name: "",
          _email: session.email,
          _phone: "",
          _first_touch: null,
          _last_touch: null,
        });

        // The charge succeeded either way — record that first, and never let a
        // fulfillment problem reopen the guard.
        await supabaseAdmin.rpc("complete_one_click_charge", {
          _charge_id: chargeId,
          _status: "succeeded",
          _commas_payment_id: result.paymentId,
          _error: fulfillError ? "fulfillment-deferred" : null,
        });

        if (fulfillError) {
          // Paid, but access is not open yet. The Commas webhook for this
          // payment id will complete it. Do not invite another click.
          return jsonResponse(202, {
            ok: true,
            error: "fulfillment-deferred",
            doNotRetry: true,
          });
        }

        return jsonResponse(200, { ok: true });
      },
    },
  },
});
