import type { User } from "@supabase/supabase-js";
import { emailOwnershipProven } from "./academy-email-ownership.server";
import { academyDb, AcademyError } from "./academy.server";

export function confirmationRequired(settings: unknown): boolean {
  return Boolean(
    settings &&
      typeof settings === "object" &&
      "mailer_autoconfirm" in settings &&
      settings.mailer_autoconfirm === false,
  );
}

/** Existing claims are read without mutating entitlements or starting an access clock. */
export async function importedTicketGrants(user: User): Promise<string[]> {
  if (!user.email || user.is_anonymous) return [];
  const rows = await academyDb().from("academy_imported_tickets")
    .select("tier,expires_at").eq("claimed_by", user.id)
    .eq("email", user.email.trim().toLowerCase()).eq("active", true);
  if (rows.error) throw new AcademyError("Your Summit ticket could not be checked.", 503);
  return [...new Set((rows.data ?? []).filter((t) => t.expires_at === null || Date.parse(t.expires_at) > Date.now()).map((t) => t.tier))] as string[];
}

export async function claimImportedTickets(user: User): Promise<string[]> {
  if (!emailOwnershipProven(user)) throw new AcademyError("Verify your purchase email before activating your ticket.", 401);
  const result = await academyDb().rpc("academy_claim_imported_tickets", { p_user: user.id });
  if (result.error) throw new AcademyError("Your Summit ticket could not be activated.", 503);
  return (result.data ?? []).map((row: { tier: string }) => row.tier);
}
