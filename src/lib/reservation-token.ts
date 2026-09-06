/**
 * Cryptographic reservation token — exactly 32 lowercase hex chars
 * (16 random bytes). Used ONLY in URLs; the row id is never exposed.
 */
export function generateReservationToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}


export function isValidReservationToken(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{32}$/.test(v);
}
