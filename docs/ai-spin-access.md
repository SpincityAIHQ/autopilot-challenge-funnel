# AI Spin and purchase access — September 6, 2026

## Customer journey

Free training invitation → free classroom → GA / VIP / Emerald Summit tiers → Shopify payment → private access email → verified account at `/redeem` → matching lessons. Accelerator uses the same purchase and redemption flow. `/ai-spin` provides text help for entitled lessons; a redeemed, active Accelerator entitlement is required for the live avatar.

Thoth is the public tutor (every ticket); AI Spin is Spin's AI representation inside the Accelerator only, with the live avatar. AI Spin identifies itself as Spin's AI representation. It is briefed with the student's ticket (Free Training, General Admission, Summit + VIP, Emerald Vault Key, Autopilot Accelerator), the current lesson notes and chapters, their watch telemetry (coverage, drop-off timestamp, unwatched spans, missed chapters), their saved quiz/workbook/reviewer feedback, their journey across lessons, the next stage available to them and the platform links. It greets by ticket, never by email; holds the student to the part they missed with warmth; and invites the next stage once per answer, with grace, never with pressure or invented urgency. Accelerator members may be pointed to `/book`. Watching, knowledge checks and instructor-approved application remain separate evidence. Current in-app next steps use transparent rules from these signals; no predictive mastery score is invented. See [vimeo-slots.md](vimeo-slots.md).

## Purchase code implementation

The server reconciles current Shopify order state, then issues at most one code generation per eligible order line. Only known, paid, non-test, single-seat purchases without a review hold qualify. Codes contain 128 pseudorandom bits, derived from a dedicated managed secret and random identifiers. Only the verification hash and derivation metadata are stored. Codes are never analytics properties, URL parameters or client-readable table rows.

Redemption requires a confirmed account matching the purchasing email, a new Shopify verification, a valid code, and an atomic database transaction. Access belongs to the redeemed user ID, with a fixed expiry captured at redemption. Retrying the same code in that account is idempotent. Another account cannot take it; deleting a user does not reopen it. Refunds, email changes and inactive order lines block further access. Current purchase-state cache is at most five minutes; media links previously issued can last up to one hour. New avatar sessions force a current Shopify check.

Unredeemed codes expire after 30 days and can be regenerated for a still-valid purchase; the old code becomes invalid. Reissue retains the original purchased term. Claimed codes cannot be regenerated to extend access. An already accepted or uncertain access email is not automatically resent by the “Check for my access email” action. Support must reconcile delivery before requeueing it. Do not rotate `ACADEMY_ACCESS_CODE_SECRET` while codes remain outstanding without a key-version migration/reissue procedure.

`ACADEMY_ACCESS_TERMS_JSON` must contain the actual approved term per tier, with `hours`, `starts:"redemption"` and an explicit `version`. There are deliberately no invented default access durations. New Accelerator codes additionally require `ACADEMY_ACCELERATOR_ENDS_AT`, an explicit ISO timestamp with a timezone. Each code captures that programme end permanently; code redemption and reissue cannot extend it. Access ends at the earlier of the purchased rolling hours and that captured end. GA, VIP and Vault retain their existing rolling policy. Existing issued codes retain their original purchased terms and are not silently shortened by later configuration changes. Imported Accelerator tickets already require their own explicit `expires_at`; this setting does not rewrite those imported terms. Code issuance/redemption and paid access stay disabled until the Shopify terms match this policy.

### Current Shopify terms checked September 6

| Tier        | What the product currently establishes                                               | Still undefined for the new app                                                |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| GA          | 48-hour replay access                                                                | Start anchor; duration of notes, activities and AI chat                        |
| VIP         | 30-day recording access                                                              | Start anchor; duration of workbooks and AI chat                                |
| Emerald     | Includes VIP; separate thirty-day NuAmenti Gold benefit tied to old August 10 launch | Current Emerald recording/app term; replacement of stale software-benefit date |
| Accelerator | Fixed September–December 2026 implementation programme                               | Exact end/date zone, post-program resources and live-avatar access             |

Do not treat these as permission to expire every learning feature together. The rolling all-tier policy is an unactivated implementation option; if replay-only expiry, lifetime resources or fixed cohort dates are selected, model those entitlements separately before enabling it.

## GHL delivery

The transactional access queue is independent of learner signup and marketing consent. New delivery uses the direct GHL API; see `ghl-direct-messages.md` and `ghl-launch-readiness.md` for configuration and live proof. Each channel has a durable event, current identity/consent checks and a provider acceptance record. Never add access codes to analytics or contact-wide public fields. Use the configured transactional sender. Legacy workflow transport remains an explicit compatibility option.

| Event                  | Timing / eligibility                                                                              | Message action                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `purchase_access_code` | After verified eligible payment; independent of marketing opt-in                                  | Email the code, tier, redemption link, code expiry and purchased access term                                                  |
| `webinar_registered`   | Registration; transactional welcome, with a separate consented SMS job                           | Welcome and free-classroom primer                                                                                             |
| `webinar_not_started`  | 24 hours after registration; cancel after recorded viewing or purchase                            | Invite them back to the free training                                                                                         |
| `learning_practice`    | Latest quiz below 80%, after two hours without a new progress write                               | Offer a smaller example and AI Spin chat                                                                                      |
| `learning_feedback`    | Instructor requests revision                                                                      | Link to private instructor feedback                                                                                           |
| `learning_approved`    | Instructor approves submitted work                                                                | Acknowledge the reviewed work and invite the next practice                                                                    |
| `learning_stalled`     | Draft activity with no progress write for three days (lessons only)                               | Offer help completing one part                                                                                                |
| `learning_dropoff`     | Positive recorded viewing below 90%; no recorded learning activity for 48 hours                  | Resume link and accurate brief-start, first-hour, verified-break or general recovery wording                                   |

Optional reminders share a 24-hour cap and one in-flight job per learner, including `webinar_not_started`, and deduplicate each lesson/content-version/signal. Eligibility, consent and paid lesson access are checked again after drafting and contact preparation. Messages use authored factual copy; Thoth can add one validated reflective coaching question, with an authored fallback. The drafting model does not receive raw workbook text, chat, private reviewer feedback or answer keys. Withdrawing optional email consent cancels reminders.

Access delivery retries transient failures only when no external send was attempted, with backoff and five attempts. An uncertain send remains `unknown` for reconciliation. `accepted` means GHL accepted the request; it does not prove inbox delivery. Existing reminder delivery has the same acceptance limitation. Install the authenticated integration scheduler separately; adding its route does not schedule it.

### Transactional access email draft

Subject: Your AI AutoPilot access code

Your {{tier}} purchase is ready to activate. Sign in with this email address at {{redeem_url}}, then enter:

{{access_code}}

Redeem this code by {{code_expires_at}}. Your purchased access lasts up to {{access_hours}} hours from redemption under {{terms_version}}. For an Accelerator code with {{programme_ends_at}}, access ends no later than that captured programme end; activating later does not extend it. Keep the code private. If you used another account email or need help, contact Info@NuAmenti.com with your Shopify order number.

This is a purchase-access message; it does not enroll the buyer in marketing. The actual workflow must render readable dates/tier names and the verified purchase terms before release.

## 1-on-1 booking

`/book` is part of the Accelerator ticket. `ACADEMY_BOOKING_URL` is returned only to students with active redeemed Accelerator access. Non-members see the Accelerator invitation instead.

## HeyGen LiveAvatar

The integration uses `@heygen/liveavatar-web-sdk@0.0.18`. Server credentials, Spin's actual LiveAvatar avatar ID and voice ID are required. A regular HeyGen Digital Twin is not automatically a LiveAvatar. Current owner connection has not been verified; no substitute identity or generated avatar is used.

Server token creation requires an active redeemed Accelerator purchase and reserves bounded session time in the database. Defaults are five minutes/session, fifteen reserved minutes/student/day and sixty reserved minutes globally/day, with one open session per student. These are operational request caps to review against actual account capacity, not a promise of unlimited streaming or exact billed usage.

FULL mode omits `context_id` and uses `PUSH_TO_TALK`. The app's own tutor generates the answer; the avatar receives only that answer to speak, through `avatar.speak_text`. It never invokes `avatar.speak_response`. Explicit consent precedes session creation. Microphone permission is a separate action; voice begins muted and finalized transcripts go to the same authenticated tutor. HeyGen processes enabled microphone audio/transcripts. The learner's full workbook is not sent to HeyGen.

The client closes tracks on cancellation, hidden tab and unmount; a server stop endpoint checks session ownership. Provider duration caps remain the backstop if stop cannot be confirmed. Activation requires a real provider test of video/audio, exact-text speech, no unsolicited provider answer, microphone cleanup and session billing/limits. The connected avatar itself has not been tested in this environment.

## Validation and release

Implemented in the existing Summit project; preview only. Verification: production build and TypeScript checks pass, 18 targeted application tests pass, and 14 local PostgreSQL checks pass for code lifecycle, buyer binding, refunds, expired reissue, deletion, RLS, avatar entitlement/concurrency, delivery claims and learning-message dedup/consent. The additive migration was applied and recorded in the existing database; all three new tables have RLS and deny anonymous reads/client writes. Existing legacy landing-copy test failures remain documented separately. Daily Revenue Watch was extended to include aggregate code-delivery failures/redemptions and reserved avatar-session time, without exposing tokens or codes or confusing reserved minutes with actual billed use.

Remaining activation inputs: verified Shopify app credentials and subscriptions, confirmed access terms, dedicated code secret, actual GHL inbound workflows and scheduler, LiveAvatar account/identity/voice and plan capacity, final recordings and the browser/email/payment/provider walkthrough. No live Shopify payment, access email, GHL coaching send or HeyGen streaming session is claimed by local tests.

### Preview runtime acceptance

The new `/redeem`, `/ai-spin`, `/learn` and `/class` pages returned HTTP 200. An initial authenticated test exposed missing managed credential injection in the preview web-server process. Lovable repaired the managed binding and restarted the preview server through its supported path; no application source, secret files or activation flags were changed for that repair.

After the repair, a legitimate temporary student session verified `/api/academy/ai-spin` HTTP 200 with provider disclosure, `/api/academy/dashboard` HTTP 200 with saved free-lesson work, and `/api/academy/avatar-start` HTTP 403 for a free learner. One real tutor answer used the synthetic workbook context. Paid/code/email/GHL/avatar integrations remain off/unconfigured. The separate built-preview authentication wall is not an app authentication test. Root database readback confirmed zero remaining synthetic QA accounts after cleanup. Actual purchase-code fulfillment and LiveAvatar streaming still require the activation inputs above.

## Primary references

- Shopify Order: https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- LiveAvatar configuration: https://docs.liveavatar.com/docs/full-mode/configuration
- LiveAvatar token: https://docs.liveavatar.com/api-reference/sessions/create-session-token
- LiveAvatar stop: https://docs.liveavatar.com/api-reference/sessions/stop-session
- Official SDK: https://github.com/heygen-com/liveavatar-web-sdk
- HeyGen / LiveAvatar identity: https://help.heygen.com/en/articles/12758866-liveavatar-faq

## Fixed Accelerator cutoff deployment

1. Apply `scripts/accelerator-cohort-end.sql` before deploying callers that pass `p_programme_end`. It is additive and repeatable: the optional eighth RPC argument preserves existing GA/VIP/Vault callers, existing rows keep a null cutoff, and all functions remain service-role-only with invoker security. It does not edit customer data or assign an inferred programme date.
2. Deploy the accompanying app changes. Set `ACADEMY_ACCELERATOR_ENDS_AT` only after the exact approved timestamp and timezone are known, alongside the approved Accelerator hours/version in `ACADEMY_ACCESS_TERMS_JSON`. A date without a time/zone, invalid calendar date, missing end, infinity, or an elapsed end cannot create a new Accelerator code.
3. Check that a new verified Accelerator purchase captures the configured end, that the purchase email discloses it, and that activation ends at that cap. Changing the server setting affects only newly issued purchases; it does not extend or shorten already-issued codes. Expired codes cannot be reissued past their captured programme end.

The Supabase CLI was unavailable and a bounded official CLI invocation was blocked by network approval cancellation during preparation. This SQL is delivered as a reviewed deployment script; no migration filename was invented and no live database apply is claimed. Record the actual database application through the project's normal migration/deployment process.
