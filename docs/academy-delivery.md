# AI AutoPilot learning platform — September 6, 2026

Vimeo slots for every stage, watch telemetry, the ticket-aware AI Spin brief, the Accelerator day replays and the 1-on-1 booking page are documented in [vimeo-slots.md](vimeo-slots.md). That document is the slot map to fill before public launch. The purchasing, AI Spin and avatar implementation is documented in [ai-spin-access.md](ai-spin-access.md). Code redemption now binds paid access to the student account. That document supersedes the original email-only grant design and earlier tutor naming below.

## Current scope

The new primary journey is `/` → `/join` → `/class` → `/summit` → `/learn` → `/accelerator`.
`/lesson/:lessonId` contains teaching notes, a knowledge check and a saved activity sheet. `/studio` is protected by the server-assigned `app_metadata.academy_role` owner/instructor role. The public webinar sells the Summit. Accelerator is downstream.

This work extends the existing Lovable project and its connected repository. It does not replace the production domain or publish the new public experience. Existing legacy checkout/resource routes remain available.

## Implemented

- Free classroom and signed-in learning dashboard; seven curriculum units, distinct formative knowledge checks, workbook drafts/submissions, instructor review and downloadable personal activity text.
- Verified Supabase user identity and email; server-only writes; per-student read policies. Student metadata cannot grant instructor privileges.
- Video intervals, resume position and configured recording version/duration. Coverage is client-reported viewing telemetry; it does not establish attention or mastery. Seeking gaps and repeated intervals do not inflate coverage. Paid video URLs are signed from a private storage bucket after access checks.
- Server-scored formative quizzes. Instructor decisions and workbook snapshots remain separate from quiz scores. Editing reviewed work returns it to draft.
- Contextual AI tutor adapter with approved lesson notes, current student's workbook/progress, explicit per-request data consent, fixed provider endpoint, no model tools, server-side keys, bounded input/output, user quotas and a global daily cap. Requires the secure database and AI runtime connections; no simulated AI answers.
- Shopify raw-body HMAC verification, durable receipt deduplication, current-order reconciliation, pagination, out-of-order snapshot protection, known variant mappings and line-level revocation. Test/cancelled/unpaid orders do not grant access. Group quantities require review; one purchaser is not silently counted as multiple learners.
- GHL event outbox and authenticated processing endpoint. Optional marketing consent and current viewing/purchase state are rechecked at delivery. An uncertain external delivery is marked unknown for reconciliation rather than automatically resent.

## Configuration and activation still required

1. Completed: the generated migration `20260906060149_summit_learning_platform.sql` was applied through the existing project's database connector on September 6. All 12 tables and seven privileged functions were read back. The exact SQL is recorded in `supabase_migrations.schema_migrations`; do not reapply it.
2. The latest Lovable request-runtime diagnosis confirmed the managed service-role database connection and rate-limit secret are present. Confirm auth email delivery, signup/confirmation/reset redirect allowlist for preview and final domain, and the instructor's verified app account. Set its `raw_app_meta_data.academy_role` only through an authorized server/admin path.
3. Record the new free-webinar VSL and final webinar. The existing Vimeo sales VSL promotes the past live event and is deliberately not substituted for the new invitation. Set `VITE_ACADEMY_VSL_URL` to a supported Vimeo/YouTube invitation. VSL iframe progress is not instrumented; it is a funnel video, not a lesson.
4. Preferred: paste the Vimeo link for each lesson and Accelerator day into its `ACADEMY_VIMEO_<SLOT>` key (see [vimeo-slots.md](vimeo-slots.md)). The Vimeo player API supplies watch telemetry; duration is confirmed through Vimeo oEmbed. Fallback for the free training only: `ACADEMY_MEDIA_FREE_WEBINAR` with `ACADEMY_MEDIA_DURATION_FREE_WEBINAR` and `ACADEMY_MEDIA_VERSION_FREE_WEBINAR`. Add captions through `ACADEMY_CAPTIONS_FREE_WEBINAR`.
5. Fallback for paid lessons without a Vimeo slot: upload media to a private `academy-media` bucket. Set `ACADEMY_MEDIA_PATH_<LESSON_ID_IN_UPPER_SNAKE_CASE>`, its duration/version, and optionally `ACADEMY_MEDIA_BUCKET`. No public read policy. Signed links expire after one hour; reload the lesson to resume if a long recording's link expires. Configure permitted CORS and captions. Complete recordings/transcripts/activity assets must be reviewed before paid course fulfillment is described as ready.
6. The tutor calls the managed Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with the platform-provisioned server-side `LOVABLE_API_KEY`, default model `google/gemini-3.7-flash` (override with `ACADEMY_TUTOR_MODEL`). No user-supplied AI key is required. Its configuration permits activation unless `ACADEMY_TUTOR_ENABLED=false`, but this is not evidence of an operating tutor: authenticated database access, `LOVABLE_API_KEY` and `RATE_LIMIT_HMAC_SECRET` must all work in the serving runtime. The learner-facing disclosure is derived from the configured model id. Optional `ACADEMY_TUTOR_DAILY_LIMIT` (100 requests/day default) plus the 15/hour per-learner and 60/hour network caps remain; these are request caps, not a dollar-denominated spend guarantee. Learners see which AI service receives their question and lesson work before consenting. Credit or policy denials surface as an honest paused state.
7. Shopify: securely configure `ACADEMY_SHOPIFY_SHOP` (the actual myshopify.com hostname), `SHOPIFY_ADMIN_ACCESS_TOKEN`, `ACADEMY_SHOPIFY_WEBHOOK_SECRET`, `ACADEMY_SHOPIFY_ENABLED=true`. Subscribe orders/paid, orders/updated, orders/cancelled, refunds/create to `/api/public/webhooks/shopify`. Pin Admin API 2026-07. Keep `ACADEMY_PAID_ACCESS_ENABLED=false` until access-duration terms, expiry implementation and paid-media fulfillment are verified. The current grant model must not be used to promise perpetual access.
8. Backfill and reconcile existing paid Shopify orders before launch. Verify paid→access, duplicates, cancellation, partial/full refunds, deleted variants, multi-seat assignment and account email mismatch. Do not count upgrades as new unique students. The learner dashboard does not infer paid access from a return URL or a cart click.
9. Schedule authenticated POST `/api/academy/process-integrations` every minute with a dedicated 32+ character `ACADEMY_SCHEDULER_SECRET`. Keep it server-side. No scheduler has been installed by adding the endpoint.
10. GHL: configure `ACADEMY_GHL_WEBHOOK_URL` from the actual inbound workflow and `ACADEMY_GHL_ENABLED=true` only after test routing. Workflow must deduplicate `event_id`, honor its own unsubscribe/suppression state, and acknowledge receipt. `delivered` in the app means HTTP acceptance, not proof that an email reached an inbox. Built events: webinar_registered and webinar_not_started (24 hours later). This is an on-demand flow; live-webinar reminder times require an actual session schedule. SMS is not enabled or consented by the email checkbox.

### Secure runtime setup boundary

Lovable documents **More → Cloud → Secrets → Add secret** for ordinary runtime secrets. `SUPABASE_*` names are reserved and platform-managed; do not try to enter the service-role key as an ordinary secret, expose it in chat, or commit it. For external Supabase integrations, **Manage secrets** opens that backend's dashboard, whose documented secret injection applies to Edge Functions. That alone does not establish availability in this app's TanStack server routes. Build secrets are not published runtime secrets. In this project, the latest request-runtime diagnosis confirmed managed credentials are available and the learning tables respond successfully. No owner credential entry or backend replacement is currently indicated. A standalone shell environment check is insufficient on edge runtimes.

## Evidence and release state

- Production build and TypeScript checks passed during implementation.
- 12 targeted behavior tests pass: coverage, tiers, distinct assessments, scoring, HMAC, refunds, test/cancelled orders, group seats, deleted variants, streaming request limits and tutor provider disclosure.
- 12 local PostgreSQL tests pass: schema, registration dedup, viewing union, quiz dedup, media replacement, review provenance, cross-user RLS, refund ordering, cancellation, outbox claim and user/global quotas.
- Remote schema/function readback confirms row isolation enabled and privileged writers inaccessible to anonymous/authenticated clients.
- The managed AI gateway returned a real HTTP 200 text response in an isolated provider check. The public free lesson API returned HTTP 200 with authored notes. These checks do not verify the authenticated tutor.
- An earlier development check returned HTTP 503 before user verification. A subsequent request-runtime diagnosis superseded that blocker: managed database and rate-limit credentials were present, privileged learning-table reads succeeded, and unauthenticated academy requests returned HTTP 401. The built preview has a separate Lovable authentication wall, so its external HTTP 401 cannot establish the app's authentication behavior. Authenticated acceptance evidence is recorded separately below.
- The original repository already failed 12 legacy landing-copy tests. Current implementation has 10 of those same failures and no new failing test names. These expect the previous live-event reservation form/Event schema. They are not represented as a green release gate.
- Authenticated API acceptance passed in the Lovable preview development runtime with two synthetic accounts: registration, free lesson, server-scored quiz persisted at 1/3, five-field workbook saved and reread, cross-student read isolation, direct cross-student write denial, instructor denial and unpaid-lesson denial. One real contextual tutor request returned HTTP 200 with 1,125 characters grounded in the current lesson and synthetic business work. This verifies the server learning loop; it is not a browser or production-domain walkthrough.
- Both synthetic accounts used no marketing consent. Their expected registration/reminder outbox rows were cancelled, and Shopify, paid access and GHL sends remained disabled. Both accounts were deleted through Auth Admin; all their learning/outbox records were checked at zero, with no real learner records removed. Shared usage counters were retained.
- Browser signup/email delivery, instructor review as the real owner, real media playback, Shopify purchase/refund fulfillment and GHL delivery remain unverified. This is an implementation preview, not a claim that the whole acquisition system is operating.

## Interface

The academy shell was rebuilt on the Diamond Standard system: near-black ground with one faint grid and two soft light sources, gold signal for labels and tickets, emerald for actions and watched spans, Orbitron display, Rajdhani headings, Space Mono labels and Inter body copy. Body text is 16.5px on a 17:1 contrast ground, secondary text stays above 9:1, and nothing decorative sits behind body copy. The sticky header shows the student's routes once signed in, including Book 1-on-1 for Accelerator tickets. The classroom outline groups Free training, Summit and Accelerator with locked and coming-soon states; the watch map, telemetry strip and threaded AI Spin panel sit beside every recording.

## Learning and measurement

Track watching, understanding and applied work independently. Watch maps and drop-off timestamps are viewing telemetry; they feed AI Spin and the coaching emails but do not establish mastery. The tutor uses those signals to suggest a smaller explanation, practice or instructor help. It cannot grant access, change scores or approve submitted work. The current notes cite headings, not invented video timestamps. Timestamped transcripts and stronger assessment banks can be added after the final recordings are supplied.

The instructor page reports actual saved platform counts, not sample dashboards or ad ROAS. Optional campaign attribution is allowlisted and stored only with marketing consent. First-touch anonymous VSL analytics, ad-spend ingestion and experiment reports remain acquisition work. The existing daily 8 a.m. America/New_York SpinCityHQ Revenue Watch was updated to read aggregate platform learning and integration state alongside Shopify when accessible. Its first completed report has not been verified; schema presence or empty counts do not establish that the funnel operates. The report does not change ad budgets or send customer messages.

## Source basis

Public teaching is newly authored from the approved teaching themes: actual intelligence, a bounded job card, human exception handling, completion receipts and operating ownership. Credit Hitsuyo Aku for Diagnose → Stabilize → Instrument → Coordinate → Automate. No private consultation identities, raw transcripts, customer analytics, income testimonials or accreditation claims are included in the course source.

## Technical references

- Shopify order reconciliation and current quantities: https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order and https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem
- Webhook verification and delivery behavior: https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Lovable runtime secrets and reserved names: https://docs.lovable.dev/features/secrets
- Lovable build-secret scope: https://docs.lovable.dev/features/build-secrets
- TanStack request-time environment: https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables
- Native media played intervals: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/played
- Tutor API: managed Lovable AI gateway endpoint above; the exact default model returned a real response during the provider check on September 6.

## Rollback

The source baseline is 09362a8e52fbe1b2ee5edc82d784f16915ee1d9a. Revert the new commit rather than rewriting published history. Keep new learner records; do not drop tables as an ordinary rollback. Disable tutor, Shopify and GHL feature flags to stop their integrations. Publishing the custom domain is a separate release action after the live acceptance checks.

## Existing website baseline

Lovable reports 703 visitors / 1,166 pageviews / 65% bounce for Aug 7–Sep 5 UTC; 179 visitors / 260 pageviews / 82% bounce for Aug 30–Sep 5. Mobile counts are 547 and 143 respectively. Instagram referrers account for 347 and 110 of the reported visitors, but paid versus organic is unknown. These counts are not yet linked to student events or Shopify orders. They support a mobile-first classroom, not a claimed webinar conversion rate.

## Native email (September 11, 2026 direction)

Lovable-managed email is the primary EMAIL sender; GoHighLevel is optional and still owns SMS, CRM sync, pipeline and phone.

Flags (server-side):

- `ACADEMY_MESSAGE_TRANSPORT` — `lovable` (default) | `ghl` | `off`. Selection only; unrecognised values fail closed to `off`.
- `ACADEMY_NATIVE_EMAIL_ENABLED` — the actual native send gate. Default false. Currently **false**: no customer native email may leave the app.
- `ACADEMY_OWNER_EMAIL_TEST_ENABLED` — independent owner-inbox test gate. Default false. It requires sender configuration (`LOVABLE_API_KEY`) but **not** `ACADEMY_NATIVE_EMAIL_ENABLED`, so owner proof never requires enabling customer dispatch first.
- `ACADEMY_OWNER_TEST_EMAIL` — verified owner recipient (default `sebastian@spincityhq.com`); the harness refuses any other address.
- `LOVABLE_API_KEY` — required server credential. Present.
- Existing master/sequence flags (`ACADEMY_LEARNING_NUDGES_ENABLED`, `ACADEMY_ACCESS_EMAIL_ENABLED`, `ACADEMY_EMAIL_TICKETS_ENABLED`, `ACADEMY_EMAIL_TICKET_LINKS_ENABLED`) are unchanged and still apply on top of the gate.

Event → template mapping (anything absent is held, never guessed):

| Event | Template | Provider purpose | App consent class |
| --- | --- | --- | --- |
| `webinar_registered` | `academy-account-welcome` | transactional | account_access |
| `access_activated` | `academy-access-activated` | transactional | account_access |
| `purchase_access_code` | `academy-purchase-access-code` | transactional | account_access |
| `webinar_not_started` | `academy-never-started` | transactional | optional_learning |
| `learning_dropoff` | `academy-learning-inactivity` | transactional | optional_learning |

Per the current native docs, managed app email is user-triggered transactional only and `@lovable.dev/email-js` supports no `marketing` purpose, so every app email is sent with `purpose: 'transactional'` and service-related reminder copy. The app's own optional-consent classification (`nativeEmailConsentClass`) is kept separate and still blocks optional learning reminders without consent. The provider appends its unsubscribe footer to **all** app email (Auth email is separate); the templates add no unsubscribe link, footer or opt-out page of their own.

Held pending authored templates: `learning_practice`, `learning_feedback`, `learning_approved`, `learning_stalled`. Held as unsupported promotional/upsell events: `summit_offer`, `vault_upsell`, `accelerator_offer`.

Semantics preserved: claim locks, consent, suppression, dedupe, quiet hours, daily caps (including `unknown`) and a final eligibility check run after rendering and immediately before the provider call. Stable idempotency key is `<event>:email:<outbox id>`. Provider `sent:true` records `accepted` (submission accepted — **not** inbox delivery); suppression records `cancelled` with a reason; documented provider outcomes are classified from `EmailAPIError` (`status`, `code`, `retryAfterSeconds`): HTTP 429 is a definite retryable non-acceptance and holds the row using the provider's backoff, other 4xx is a definite rejection recorded `cancelled` with `provider_rejected`, and 5xx or transport failures after submission stay `unknown` for reconciliation. Nothing outside those documented cases is assumed safe to retry. There is no cross-provider fallback and no invented `failed` status. Rows whose channel or template is unavailable are excluded **before** the claim: the worker passes the deliverable event names to `academy_claim_outbox(p_limit, p_names)`, so unavailable SMS/CRM rows and unauthored native templates consume no attempts and no claim slots, and a due email is never starved behind a backlog of them. A held outcome (unauthored template, held promotional event, provider rate limit) leaves the row `pending` with no `completed_at` and no attempt consumed — cancellation is reserved for real suppression, ineligibility or definite provider rejection.

Purchase access-code email has its own path in `academy-delivery.server.ts` and is no longer GoHighLevel-dependent; all existing code lifecycle, grant and order-review guards are unchanged.

Owner-only harness: `GET/POST /api/public/admin/academy-email-test` (same-origin, rate-limited, owner session required, recipient forced to the signed-in owner address, never touches the queue). GET renders a template and reports both gates; POST requires `ACADEMY_OWNER_EMAIL_TEST_ENABLED`, rejects any recipient other than the verified owner, accepts only `{ template, runId }` (no arbitrary `to` or template data) and uses the stable idempotency key `owner-test:<runId>:<owner>:<template>`.

Sequence: (1) set `ACADEMY_OWNER_EMAIL_TEST_ENABLED=true` while `ACADEMY_NATIVE_EMAIL_ENABLED` stays false, (2) send each template to the owner inbox, (3) confirm branding/links/footer/receipt, (4) unset the owner-test flag and set `ACADEMY_NATIVE_EMAIL_ENABLED=true`.

Remaining activation steps: send each template to the owner inbox through the harness, confirm branding, production links, the provider-appended unsubscribe footer and actual inbox receipt, then set `ACADEMY_NATIVE_EMAIL_ENABLED=true`. Delivery is unproven until then. Native checkout (Stripe/Paddle) readiness is recorded separately and unchanged by this pass.
