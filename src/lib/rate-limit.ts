/**
 * Minimal in-memory sliding-window rate limiter for public form endpoints.
 * Best-effort; the source of truth is per-record uniqueness in Postgres.
 * Enough to slow spam without depending on external infrastructure.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS: Map<string, Bucket> = new Map();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

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
    return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort caller id from headers; never used for auth. */
export function callerId(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true; // same-origin POST from server-generated form
  const host = request.headers.get("host") ?? "";
  const src = origin ?? referer ?? "";
  try {
    return new URL(src).host === host;
  } catch {
    return false;
  }
}
