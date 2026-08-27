/**
 * Same-origin gate + rate-limit helpers.
 *
 * Same-origin: fail closed. A cross-origin browser fetch always sends
 * either an Origin or Referer header; if BOTH are missing on a POST we
 * refuse. The signed Commas webhook does NOT call assertSameOrigin —
 * its HMAC signature over the raw body is the sole authority.
 *
 * Rate limiting comes in two flavours:
 *  - consumeRateLimit(request, name, limit, windowSeconds, secret):
 *      durable, DB-backed, safe across multiple worker instances.
 *      Stores ONLY an HMAC of the caller identity, never a raw IP.
 *      This is the production limiter for browser-facing POST endpoints.
 *      Requires RATE_LIMIT_HMAC_SECRET; sensitive callers (exchange,
 *      communication-preferences) must fail closed when the secret is
 *      missing rather than silently downgrading.
 *  - rateLimit(key, limit, windowSeconds): in-memory sliding-window,
 *      retained only for unit tests. Never call from production endpoints.
 */

import { createHmac } from "node:crypto";

// ---------- Same-origin ----------

export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  // Fail closed: a legitimate browser-initiated fetch always sends at
  // least one of Origin or Referer. Reject when both are absent so a
  // scripted or curl-style POST cannot slip past the check.
  if (!origin && !referer) return false;
  // Behind a proxy/preview host the Host header can be an internal name,
  // so accept any of the forwarded host candidates.
  const hosts = new Set(
    [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      (() => {
        try {
          return new URL(request.url).host;
        } catch {
          return null;
        }
      })(),
    ]
      .filter(Boolean)
      .map((h) => (h as string).toLowerCase()),
  );
  const src = origin ?? referer ?? "";
  try {
    return hosts.has(new URL(src).host.toLowerCase());
  } catch {
    return false;
  }

}

// ---------- Caller identity (never stored raw) ----------

function rawCallerId(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Deterministic HMAC over the caller IP + bucket name. The raw IP never
 * leaves this function; only the hex digest is passed to the DB limiter.
 */
export function hashCaller(
  request: Request,
  bucket: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${bucket}\n${rawCallerId(request)}`)
    .digest("hex");
}

// Legacy — retained ONLY for tests.
export function callerId(request: Request): string {
  return rawCallerId(request);
}

// ---------- Rate-limit result shape ----------

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

// ---------- Durable, DB-backed limiter (production) ----------

/**
 * Consume one token from the shared server-side rate-limit store.
 *
 * Returns `{ ok: false, retryAfterSeconds: windowSeconds }` on any
 * transport/database error so endpoints fail closed rather than opening
 * up under partial infrastructure failure.
 *
 * `secret` must be a non-empty string; callers that treat the secret as
 * required (exchange, communication-preferences) MUST reject the request
 * upstream before invoking this helper when the secret is absent.
 */
export async function consumeRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number,
  secret: string,
): Promise<RateLimitResult> {
  if (!secret) return { ok: false, retryAfterSeconds: windowSeconds };
  const keyHash = hashCaller(request, bucket, secret);
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      _key_hash: keyHash,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) return { ok: false, retryAfterSeconds: windowSeconds };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: Boolean(row?.ok),
      retryAfterSeconds: Number(row?.retry_after ?? 0),
    };
  } catch {
    return { ok: false, retryAfterSeconds: windowSeconds };
  }
}

// ---------- In-memory limiter (tests only) ----------

interface Bucket {
  count: number;
  resetAt: number;
}
const BUCKETS: Map<string, Bucket> = new Map();

/** @deprecated Use consumeRateLimit in production. Kept for unit tests. */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (b.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  b.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
