/**
 * Signup and magic-link emails must NOT point at Supabase's verify endpoint:
 * that consumes the one-use token before our same-origin POST callback can
 * verify it and save email-bound ownership proof. Instead we rebuild the link
 * as an app URL carrying the token hash in the fragment, which never reaches
 * a server log, a Referer header or a query string.
 *
 * Fail closed: if no usable token hash is present we throw, so no email goes
 * out with a link that would silently bypass verification.
 */

export const JOIN_CALLBACK_ORIGIN = "https://aiautopilotsummit.com";
const ALLOWED_NEXT = ["/redeem", "/learn"] as const;

const TOKEN_HASH = /^[a-f0-9]{56,64}$/i;

function tokenHashFrom(data: { url?: string | null } & Record<string, unknown>): string | null {
  const direct = data["token_hash"];
  if (typeof direct === "string" && TOKEN_HASH.test(direct)) return direct;
  if (typeof data.url === "string") {
    try {
      const query = new URL(data.url).searchParams;
      for (const key of ["token_hash", "token"]) {
        const value = query.get(key);
        if (value && TOKEN_HASH.test(value)) return value;
      }
    } catch {
      /* fall through to fail closed */
    }
  }
  return null;
}

/** Only a short local path we own may be carried forward. */
function validatedNext(data: { url?: string | null } & Record<string, unknown>): string | null {
  const candidates: string[] = [];
  const direct = data["redirect_to"];
  if (typeof direct === "string") candidates.push(direct);
  if (typeof data.url === "string") {
    try {
      const redirect = new URL(data.url).searchParams.get("redirect_to");
      if (redirect) candidates.push(redirect);
    } catch {
      /* ignore */
    }
  }
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate, JOIN_CALLBACK_ORIGIN);
      const next = parsed.searchParams.get("next");
      if (next && (ALLOWED_NEXT as readonly string[]).includes(next)) return next;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function buildJoinVerificationUrl(
  data: { url?: string | null } & Record<string, unknown>,
): string {
  const tokenHash = tokenHashFrom(data);
  if (!tokenHash) throw new Error("Auth email rejected: no verification token hash present.");
  const next = validatedNext(data);
  const query = new URLSearchParams({ mode: "signin" });
  if (next) query.set("next", next);
  return `${JOIN_CALLBACK_ORIGIN}/join?${query.toString()}#token_hash=${tokenHash}&type=email`;
}
