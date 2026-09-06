# AI Spin and purchase access — September 6, 2026

## Customer journey

Free training invitation → free classroom → GA / VIP / Emerald Summit tiers → Shopify payment → private access email → verified account at `/redeem` → matching lessons. Accelerator uses the same purchase and redemption flow. `/ai-spin` provides text help for entitled lessons; a redeemed, active Accelerator entitlement is required for the live avatar.

AI Spin identifies itself as Spin's AI representation. It uses the current lesson notes and that student's saved quiz/workbook/reviewer feedback. Watching, knowledge checks and instructor-approved application remain separate evidence. Current in-app next steps use transparent rules from these signals; no predictive mastery score is invented.

## Purchase code implementation

The server reconciles current Shopify order state, then issues at most one code generation per eligible order line. Only known, paid, non-test, single-seat purchases without a review hold qualify. Codes contain 128 pseudorandom bits, derived from a dedicated managed secret and random identifiers. Only the verification hash and derivation metadata are stored. Codes are never analytics properties, URL parameters or client-readable table rows.

Redemption requires a confirmed account matching the purchasing email, a new Shopify verification, a valid code, and an atomic database transaction. Access belongs to the redeemed user ID, with a fixed expiry captured at redemption. Retrying the same code in that account is idempotent. Another account cannot take it; deleting a user does not reopen it. Refunds, email changes and inactive order lines block further access. Current purchase-state cache is at most five minutes; media links previously issued can last up to one hour. New avatar sessions force a current Shopify check.

Unredeemed codes expire after 30 days and can be regenerated for a still-valid purchase; the old code becomes invalid. Reissue retains the original purchased term. Claimed codes cannot be regenerated to extend access. An already accepted or uncertain access email is not automatically resent by the “Check for my access email” action. Support must reconcile delivery before requeueing it. Do not rotate `ACADEMY_ACCESS_CODE_SECRET` while codes remain outstanding without a key-version migration/reissue procedure.

`ACADEMY_ACCESS_TERMS_JSON` must contain the actual approved term per tier, with `hours`, `starts:"redemption"` and an explicit `version`. There are deliberately no invented default access durations. Fixed event/cohort-end terms need an explicit policy extension before activation. Code issuance/redemption and paid access stay disabled until the Shopify terms match this policy.

## GHL workflows to connect

The transactional access queue is independent of learner signup and marketing consent. `ACADEMY_GHL_ACCESS_WEBHOOK_URL` must be the inbound URL of a dedicated access workflow on `services.leadconnectorhq.com/hooks/...`. Add idempotency on the immutable `event_id`; never add access codes to analytics or contact-wide public fields. Use a transactional sender with the necessary account configuration.

| Event | Timing / eligibility | Message action |
|---|---|---|
| `purchase_access_code` | After verified eligible payment; independent of marketing opt-in | Email the code, tier, redemption link, code expiry and purchased access term |
| `webinar_registered` | Registration, if optional emails consented | Welcome and free-classroom link |
| `webinar_not_started` | 24 hours after registration; cancel after recorded viewing or purchase | Invite them back to the free training |
| `learning_practice` | Latest quiz below 80%, after two hours without a new progress write | Offer a smaller example and AI Spin chat |
| `learning_feedback` | Instructor requests revision | Link to private instructor feedback |
| `learning_approved` | Instructor approves submitted work | Acknowledge the reviewed work and invite the next practice |
| `learning_stalled` | Draft activity with no progress write for three days | Offer help completing one part |

The learning scheduler queues at most one new learning message per student per 24 hours and deduplicates each lesson/content-version/signal. Eligibility, consent and paid lesson access are checked again before GHL receives it. Payloads include minimal lesson/quiz/status fields; no workbook text, raw chat, private reviewer feedback or answer keys. Withdrawing optional email consent cancels these messages. These reminders are rule-triggered AI Spin coaching templates, not autonomous AI-written outbound messages.

Access delivery retries transient failures only when no external send was attempted, with backoff and five attempts. An uncertain send remains `unknown` for reconciliation. `accepted` means GHL accepted the request; it does not prove inbox delivery. Existing reminder delivery has the same acceptance limitation. Install the authenticated integration scheduler separately; adding its route does not schedule it.

### Transactional access email draft

Subject: Your AI AutoPilot access code

Your {{tier}} purchase is ready to activate. Sign in with this email address at {{redeem_url}}, then enter:

{{access_code}}

Redeem this code by {{code_expires_at}}. Your purchased access lasts {{access_hours}} hours from redemption under {{terms_version}}. Keep the code private. If you used another account email or need help, contact Info@NuAmenti.com with your Shopify order number.

This is a purchase-access message; it does not enroll the buyer in marketing. The actual workflow must render readable dates/tier names and the verified purchase terms before release.

## HeyGen LiveAvatar

The integration uses `@heygen/liveavatar-web-sdk@0.0.18`. Server credentials, Spin's actual LiveAvatar avatar ID and voice ID are required. A regular HeyGen Digital Twin is not automatically a LiveAvatar. Current owner connection has not been verified; no substitute identity or generated avatar is used.

Server token creation requires an active redeemed Accelerator purchase and reserves bounded session time in the database. Defaults are five minutes/session, fifteen reserved minutes/student/day and sixty reserved minutes globally/day, with one open session per student. These are operational request caps to review against actual account capacity, not a promise of unlimited streaming or exact billed usage.

FULL mode omits `context_id` and uses `PUSH_TO_TALK`. The app's own tutor generates the answer; the avatar receives only that answer to speak, through `avatar.speak_text`. It never invokes `avatar.speak_response`. Explicit consent precedes session creation. Microphone permission is a separate action; voice begins muted and finalized transcripts go to the same authenticated tutor. HeyGen processes enabled microphone audio/transcripts. The learner's full workbook is not sent to HeyGen.

The client closes tracks on cancellation, hidden tab and unmount; a server stop endpoint checks session ownership. Provider duration caps remain the backstop if stop cannot be confirmed. Activation requires a real provider test of video/audio, exact-text speech, no unsolicited provider answer, microphone cleanup and session billing/limits. The connected avatar itself has not been tested in this environment.

## Validation and release

Implemented in the existing Summit project; preview only. Initial verification: 18 targeted application tests pass, and 14 local PostgreSQL checks pass for code lifecycle, buyer binding, refunds, expired reissue, deletion, RLS, avatar entitlement/concurrency, delivery claims and learning-message dedup/consent. Production build and TypeScript checks are part of the final handoff. Existing legacy landing-copy test failures remain documented separately.

Remaining activation inputs: verified Shopify app credentials and subscriptions, confirmed access terms, dedicated code secret, actual GHL inbound workflows and scheduler, LiveAvatar account/identity/voice and plan capacity, final recordings and the browser/email/payment/provider walkthrough. No live Shopify payment, access email, GHL coaching send or HeyGen streaming session is claimed by local tests.

## Primary references

- Shopify Order: https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- LiveAvatar configuration: https://docs.liveavatar.com/docs/full-mode/configuration
- LiveAvatar token: https://docs.liveavatar.com/api-reference/sessions/create-session-token
- LiveAvatar stop: https://docs.liveavatar.com/api-reference/sessions/stop-session
- Official SDK: https://github.com/heygen-com/liveavatar-web-sdk
- HeyGen / LiveAvatar identity: https://help.heygen.com/en/articles/12758866-liveavatar-faq
