import type { User } from "@supabase/supabase-js";
import { academyDb, AcademyError } from "./academy.server";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

/** Only a native email token consumed by this server can establish this proof. */
export function emailOwnershipProven(user: User): boolean {
  const proof = user.app_metadata?.academy_email_ownership;
  return Boolean(!user.is_anonymous && user.email && user.email_confirmed_at &&
    proof?.version === 1 && proof.email === normalizeEmail(user.email) &&
    proof.emailConfirmedAt === user.email_confirmed_at &&
    typeof proof.verifiedAt === "string" && Number.isFinite(Date.parse(proof.verifiedAt)));
}

/** Native signup and magic-link callback. This does not activate purchased access. */
export async function completeEmailVerification(tokenHash: string) {
  if (!/^[a-f0-9]{56,64}$/i.test(tokenHash))
    throw new AcademyError("This verification link is invalid. Request a fresh email link.");
  // verifyOtp installs a user session on its client: never reuse it for admin work.
  const verification = await academyDb().auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  const user = verification.data?.user;
  const session = verification.data?.session;
  if (verification.error || !user || !session || !user.email || !user.email_confirmed_at || user.is_anonymous)
    throw new AcademyError("This verification link expired or was already used. Request a fresh email link.", 401);
  const saved = await academyDb().auth.admin.updateUserById(user.id, {
    app_metadata: { academy_email_ownership: {
      version: 1, email: normalizeEmail(user.email),
      emailConfirmedAt: user.email_confirmed_at, verifiedAt: new Date().toISOString(),
    } },
  });
  if (saved.error || !saved.data.user || !emailOwnershipProven(saved.data.user))
    throw new AcademyError("Email verification could not be saved. Request a fresh email link.", 503);
  // Only the same-origin sign-in callback receives these; never persist or log them.
  return { access_token: session.access_token, refresh_token: session.refresh_token };
}

export async function requestTicketVerification(user: User) {
  if (process.env.ACADEMY_EMAIL_TICKET_LINKS_ENABLED !== "true")
    throw new AcademyError("Email-link activation is being connected. Use your purchase code below or contact the team.", 503);
  if (!user.email || user.is_anonymous) throw new AcademyError("Sign in with your purchase email.", 401);
  const sent = await academyDb().auth.signInWithOtp({
    email: normalizeEmail(user.email),
    options: { shouldCreateUser: false, emailRedirectTo: "https://aiautopilotsummit.com/join?mode=signin&next=%2Fredeem" },
  });
  if (sent.error) throw new AcademyError("The email link could not be sent. Wait a minute and try again.", 503);
  return { message: "Check your inbox for a fresh verification link. It returns you here to activate your ticket when you are ready." };
}
