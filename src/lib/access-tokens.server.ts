/**
 * Server-only access token helpers.
 * Raw tokens are NEVER stored — only a SHA-256 hex hash lives in
 * public.access_tokens. Tokens expire and are single-use.
 */

import { createHash, randomBytes } from "node:crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateAccessToken(): string {
  // 32 random bytes → 43-char URL-safe base64
  return randomBytes(32).toString("base64url");
}
