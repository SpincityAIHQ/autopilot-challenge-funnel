/**
 * Owner/staff review access.
 *
 * The emails listed in SUMMIT_OWNER_EMAILS (the same server-only allowlist that
 * already gates the private admin dashboards) may open every lesson for review,
 * independent of Shopify purchases and of ACADEMY_PAID_ACCESS_ENABLED.
 *
 * This is a server-only check against the verified, email-confirmed Supabase
 * user. It never reads a query string, cookie, or client-supplied value, and it
 * grants nothing to anyone outside the allowlist.
 */

import type { AcademyTier } from "./academy";

/** Every paid ticket, for owner review only. */
export const STAFF_TIERS: AcademyTier[] = ["ga", "vip", "vault", "accelerator"];

export function staffEmails(): string[] {
  return (process.env.SUMMIT_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return staffEmails().includes(normalized);
}
