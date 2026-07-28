/**
 * Cryptographic reservation token — exactly 32 lowercase hex chars
 * (16 random bytes). Used ONLY in URLs; the row id is never exposed.
 */
import { randomBytes } from "node:crypto";

export function generateReservationToken(): string {
  return randomBytes(16).toString("hex");
}

export function isValidReservationToken(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{32}$/.test(v);
}
