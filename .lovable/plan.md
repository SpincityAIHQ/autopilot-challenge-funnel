# Support diagnosis: Empress can't get in (read-only, nothing changed)

## Observed facts

Account (verified in the live database just now)
- Address: empress1tashaelbey@gmail.com — one account, ID 0866087f-6f6e-4a35-91fe-2c40393b74ca
- Sign-in method: email + password only (no Google, no one-time-code login on this account)
- Email confirmed: 11 Sep 2026, 01:50 UTC. Not banned, not anonymous.
- Last successful sign-in: 11 Sep 2026, 01:53 UTC — she has not signed in successfully today.
- No password reset has ever been requested on this account.

Access (verified)
- Two active grants, both already attached to her account (21 Sep, 20:04 UTC):
  Accelerator (active through 1 Jan 2027) and Vault (active, no end date).
- Both say "owner-authorized 2026-09-21". Nothing is missing on the access side.

What actually happened today (from the sign-in service log)
- 21 Sep, 20:27 UTC: a **repeat account creation** attempt for her address, from the
  /join page. The service recorded it as "user already registered" and returned a
  success-looking response. No confirmation email is sent in that case, because the
  address was already confirmed two weeks ago.
- There is no record today of a failed password sign-in for her, only the repeat
  signup.

## Root cause (proven)

She is pressing "Create account", not "Sign in". Because her account already exists
and is already confirmed, the service accepts the request quietly (deliberate, so
strangers can't discover who has an account) and sends no mail. Our page then shows
"Check your inbox", so she waits for an email that will never arrive. The "Resend
confirmation email" button on that screen has the same outcome for an
already-confirmed address: nothing is sent, and the screen still says it was.

The endless spinner is **not** confirmed. The recorded request finished in 0.16s.
Likely she is on the "Check your inbox"/"Working…" screen with nothing progressing.
Unverified hypothesis only.

## Narrowest resolution for her, right now (no email, no reset needed)

1. Go to https://aiautopilotsummit.com/join?mode=signin
2. The heading must read "Welcome back". If it says "Create your free account",
   tap "Already have an account? Sign in" first.
3. Enter empress1tashaelbey@gmail.com and her existing password, press "Sign in".
   Her Accelerator and Vault access opens immediately — no confirmation email is
   involved.
4. If she does not remember the password: on that same "Welcome back" screen, tap
   "Forgot your password?" — that sends a reset mail (she triggers it herself; we
   send nothing from here).

## The code issue, described only — not implemented

File: src/lib/academy-join-controller.ts (signUp / resend) with src/routes/join.tsx.
An "already registered" outcome is treated identically to a fresh signup: it sets
the "Check your inbox" screen and promises an email that the service will never
send. Anti-enumeration is the right goal, but the wording is a dead end for the
person most likely to hit it — an existing customer.

Proposed fix, for approval later:
- Keep the response neutral, but change the copy on that screen to cover both
  cases: "If this address is new, a confirmation email is on its way. If you
  already have an account, nothing was sent — sign in with your password, or use
  'Forgot your password?'."
- Put a visible "Sign in instead" and "Forgot your password?" control on that
  screen (today only "Back to sign in" is there, and the reset link is absent).
- Same treatment for "Resend confirmation email" so it never claims a send.

No account existence is revealed by either change.

## Not done, by instruction

No code edited, no database change, no mail sent, no password reset, no
confirmation flag touched, no links or tokens produced.
