import { academyDb, AcademyError } from "./academy.server";

export function confirmationRequired(settings: unknown): boolean {
  return Boolean(
    settings &&
      typeof settings === "object" &&
      "mailer_autoconfirm" in settings &&
      settings.mailer_autoconfirm === false,
  );
}

let checkedSettings: { url: string; expiresAt: number; required: boolean } | null = null;

// Supabase can mark an email confirmed without inbox verification when
// auto-confirm is enabled. Never use that configuration for email ticket claims.
async function requireEmailConfirmation() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AcademyError("Ticket matching is temporarily unavailable.", 503);
  if (!checkedSettings || checkedSettings.url !== url || checkedSettings.expiresAt <= Date.now()) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error("AUTH_SETTINGS_UNAVAILABLE");
      checkedSettings = {
        url,
        expiresAt: Date.now() + 60000,
        required: confirmationRequired(await response.json()),
      };
    } catch {
      throw new AcademyError("Ticket matching is temporarily unavailable. Please try again.", 503);
    }
  }
  if (!checkedSettings.required)
    throw new AcademyError("Email verification must be connected before tickets can activate.", 503);
}

export async function importedTicketGrants(userId: string): Promise<string[]> {
  const db = academyDb();
  // Skip the confirmation-settings request when this account has no imported
  // tickets. The database reads its email from auth.users, never request input.
  const matching = await db.rpc("academy_has_imported_ticket", { p_user: userId });
  if (matching.error) throw new AcademyError("Your Summit ticket could not be checked.", 503);
  if (matching.data !== true) return [];
  await requireEmailConfirmation();
  const result = await db.rpc("academy_claim_imported_tickets", { p_user: userId });
  if (result.error) throw new AcademyError("Your Summit ticket could not be activated.", 503);
  return (result.data ?? []).map((row: { tier: string }) => row.tier);
}
