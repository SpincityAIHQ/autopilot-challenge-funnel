# Verified purchase activation

Purchased access starts only when the signed-in learner chooses **Activate my purchased lessons** at `/redeem`. Signup, the free webinar, dashboard visits, message processing and ordinary entitlement reads do not claim tickets or start a redemption-based clock. Previously issued purchase codes continue to work.

The app matches the authenticated email to verified paid Shopify grants. Before each claim it reconciles the order with Shopify and uses the existing locked redemption function. Refunds, cancellations, test/unpaid orders, team quantities, review holds, another account's redemption and original expiry rules remain enforced. Historical imported tickets are read without mutation; their existing fixed expiry is preserved when explicitly claimed.

## Native email verification

The current implicit Auth session does not distinguish email OTP from phone OTP. Neither `email_confirmed_at` under historical auto-confirm nor user-editable metadata is sufficient purchase-ownership evidence.

The native signup confirmation and fresh email sign-in links must reach the app before the one-use token is consumed. The app validates that token using Supabase `verifyOtp` with type `email`, saves proof bound to the returned user's email and confirmation timestamp in server-controlled `app_metadata`, and returns the native sign-in session through a same-origin, private/no-store response. Token fragments are removed immediately; tokens and session credentials must never be logged.

Enable **Confirm email** for new signups (`mailer_autoconfirm=false`) and prove that the native Auth sender reaches the inbox. After deploying the callback, change the **Confirm signup** and **Magic Link** Auth email templates to use this link:

```html
<a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}&amp;type=email">Verify my email and open my account</a>
```

These app flows always supply a `/join` redirect. Configure the production Site URL and allowed `/join` redirect URLs. For other external Auth integrations that omit `RedirectTo`, supply a valid app redirect or add an appropriate template fallback. Preserve existing email branding and sender settings. Do not change password-recovery templates to this link.

Fresh signups use their ordinary single confirmation email; they do not need a second verification code. Returning accounts without observed inbox proof use **Email me a verification link** on `/redeem`, then return to explicitly activate. No guessed verification dates or cutoff are used. Existing active claims and legacy purchase codes remain usable.

## Activation gates

- `ACADEMY_EMAIL_TICKETS_ENABLED=true`: enables explicit matching and no-purchase-code delivery copy. Leave off until email proof, Shopify reconciliation and access terms are verified.
- `ACADEMY_EMAIL_TICKET_LINKS_ENABLED=true`: enables fresh native verification links. Leave off until both Auth templates and real inbox delivery are verified.
- Existing Shopify and access settings remain required: shop/app credentials, webhook enablement, `ACADEMY_PAID_ACCESS_ENABLED`, `ACADEMY_ACCESS_CODES_ENABLED`, `ACADEMY_ACCESS_CODE_SECRET`, `ACADEMY_ACCESS_TERMS_JSON`, and purchase email configuration.

Access-confirmation queue failure does not block a committed entitlement. The result reports `confirmationPending`; repeating activation or the same legacy code repairs queueing idempotently without extending access. This is distinct from proving that GHL actually delivered the message.

## Verification limits

Local fixtures execute the actual claim/redemption code, intercepted provider calls and existing PostgreSQL issuance, reconciliation, redemption and message-queue functions. Separate fixtures exercise native email-proof failure modes and the compiled join callback, including failed-link recovery. They do not prove production SMTP/GHL delivery or a real paid order.

Before launch, prove a fresh signup's one-click email confirmation, a historical account's fresh link, an actual paid order, tier-correct activation, fixed expiry on retry, and inbox confirmation. The Shopify transport helper must ship with the updated `/studio` readiness check.

Sources: [Supabase email links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [native OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [server-controlled user metadata](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
