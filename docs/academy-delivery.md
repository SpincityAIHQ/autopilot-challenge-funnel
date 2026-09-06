# AI AutoPilot learning platform — September 6, 2026

## Current scope

The new primary journey is `/` → `/join` → `/class` → `/summit` → `/learn` → `/accelerator`.
`/lesson/:lessonId` contains teaching notes, a knowledge check and a saved activity book. `/studio` is protected by the server-assigned `app_metadata.academy_role` owner/instructor role. The public webinar sells the Summit. Accelerator is downstream.

This work extends the existing Lovable project and its connected repository. It does not replace the production domain or publish the new public experience. Existing legacy checkout/resource routes remain available.

## Implemented

- Free classroom and signed-in learning dashboard; seven curriculum units, distinct formative knowledge checks, workbook drafts/submissions, instructor review and downloadable personal activity text.
- Verified Supabase user identity and email; server-only writes; per-student read policies. Student metadata cannot grant instructor privileges.
- Video intervals, resume position and configured recording version/duration. Coverage is client-reported viewing telemetry; it does not establish attention or mastery. Seeking gaps and repeated intervals do not inflate coverage. Paid video URLs are signed from a private storage bucket after access checks.
- Server-scored formative quizzes. Instructor decisions and workbook snapshots remain separate from quiz scores. Editing reviewed work returns it to draft.
- Contextual AI tutor adapter with approved lesson notes, current student's workbook/progress, explicit per-request data consent, fixed provider endpoint, no model tools, server-side keys, bounded input/output, user quotas and a global daily cap. Disabled until configured. No simulated AI answers.
- Shopify raw-body HMAC verification, durable receipt deduplication, current-order reconciliation, pagination, out-of-order snapshot protection, known variant mappings and line-level revocation. Test/cancelled/unpaid orders do not grant access. Group quantities require review; one purchaser is not silently counted as multiple learners.
- GHL event outbox and authenticated processing endpoint. Optional marketing consent and current viewing/purchase state are rechecked at delivery. An uncertain external delivery is marked unknown for reconciliation rather than automatically resent.

## Configuration and activation still required

1. Apply/record the generated migration `20260906060149_summit_learning_platform.sql`. The exact additive schema was applied through the existing project's database connector on September 6. All 13 tables and seven privileged functions were read back; keep migration history synchronized before future automated migration deploys.
2. Confirm Supabase auth email delivery, signup/confirmation/reset redirect allowlist for preview and final domain, service-role runtime secret, and the instructor's verified app account. Set its `raw_app_meta_data.academy_role` only through an authorized server/admin path.
3. Record the new free-webinar VSL and final webinar. The existing Vimeo sales VSL promotes the past live event and is deliberately not substituted for the new invitation. Set `VITE_ACADEMY_VSL_URL` to a supported Vimeo/YouTube invitation. VSL iframe progress is not yet instrumented; the native classroom player measures connected lesson recordings.
4. Set `ACADEMY_MEDIA_FREE_WEBINAR` to an HTTPS browser-playable recording; set `ACADEMY_MEDIA_DURATION_FREE_WEBINAR` to verified seconds and `ACADEMY_MEDIA_VERSION_FREE_WEBINAR` to a stable version. Add captions through `ACADEMY_CAPTIONS_FREE_WEBINAR`.
5. Upload paid media to a private `academy-media` bucket. Set `ACADEMY_MEDIA_PATH_<LESSON_ID_IN_UPPER_SNAKE_CASE>`, its duration/version, and optionally `ACADEMY_MEDIA_BUCKET`. No public read policy. Signed links expire after one hour; reload the lesson to resume if a long recording's link expires. Configure permitted CORS and captions. Complete recordings/transcripts/activity assets must be reviewed before paid course fulfillment is described as ready.
6. The tutor calls the managed Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with the platform-provisioned server-side `LOVABLE_API_KEY`, default model `google/gemini-3.7-flash` (override with `ACADEMY_TUTOR_MODEL`). No user-supplied AI key is required. The tutor is ACTIVE by default once `LOVABLE_API_KEY` and `RATE_LIMIT_HMAC_SECRET` exist; the explicit off switch is `ACADEMY_TUTOR_ENABLED=false`. The learner-facing disclosure is derived from the configured model id, so it stays truthful if `ACADEMY_TUTOR_MODEL` changes. Optional `ACADEMY_TUTOR_DAILY_LIMIT` (100 requests/day default) plus the 15/hour per-learner and 60/hour network caps remain; these are request caps, not a dollar-denominated spend guarantee. Learners see which AI service receives their question and lesson work before consenting. Credit or policy denials from the gateway surface as an honest paused state; no simulated answers.
7. Shopify: securely configure `ACADEMY_SHOPIFY_SHOP` (the actual myshopify.com hostname), `SHOPIFY_ADMIN_ACCESS_TOKEN`, `ACADEMY_SHOPIFY_WEBHOOK_SECRET`, `ACADEMY_SHOPIFY_ENABLED=true`. Subscribe orders/paid, orders/updated, orders/cancelled, refunds/create to `/api/public/webhooks/shopify`. Pin Admin API 2026-07. Keep `ACADEMY_PAID_ACCESS_ENABLED=false` until access-duration terms, expiry implementation and paid-media fulfillment are verified. The current grant model must not be used to promise perpetual access.
8. Backfill and reconcile existing paid Shopify orders before launch. Verify paid→access, duplicates, cancellation, partial/full refunds, deleted variants, multi-seat assignment and account email mismatch. Do not count upgrades as new unique students. The learner dashboard does not infer paid access from a return URL or a cart click.
9. Schedule authenticated POST `/api/academy/process-integrations` every minute with a dedicated 32+ character `ACADEMY_SCHEDULER_SECRET`. Keep it server-side. No scheduler has been installed by adding the endpoint.
10. GHL: configure `ACADEMY_GHL_WEBHOOK_URL` from the actual inbound workflow and `ACADEMY_GHL_ENABLED=true` only after test routing. Workflow must deduplicate `event_id`, honor its own unsubscribe/suppression state, and acknowledge receipt. `delivered` in the app means HTTP acceptance, not proof that an email reached an inbox. Built events: webinar_registered and webinar_not_started (24 hours later). This is an on-demand flow; live-webinar reminder times require an actual session schedule. SMS is not enabled or consented by the email checkbox.

## Evidence and release state

- Production build and TypeScript checks passed during implementation.
- 11 targeted behavior tests pass: coverage, tiers, distinct assessments, scoring, HMAC, refunds, test/cancelled orders, group seats, deleted variants and streaming request limits.
- 12 local PostgreSQL tests pass: schema, registration dedup, viewing union, quiz dedup, media replacement, review provenance, cross-user RLS, refund ordering, cancellation, outbox claim and user/global quotas.
- Remote schema/function readback confirms row isolation enabled and privileged writers inaccessible to anonymous/authenticated clients.
- The original repository already failed 12 legacy landing-copy tests. Current implementation has 10 of those same failures and no new failing test names. These expect the previous live-event reservation form/Event schema. They are not represented as a green release gate.
- Browser end-to-end signup, paid fulfillment, real media, real tutor and GHL delivery are not yet verified. This is an implementation preview, not a claim that the whole acquisition system is operating.

## Learning and measurement

Track watching, understanding and applied work independently. The tutor uses those signals to suggest a smaller explanation, practice or instructor help. It cannot grant access, change scores or approve submitted work. The current notes cite headings, not invented video timestamps. Timestamped transcripts and stronger assessment banks can be added after the final recordings are supplied.

The instructor page reports actual saved platform counts, not sample dashboards or ad ROAS. Optional campaign attribution is allowlisted and stored only with marketing consent. First-touch anonymous VSL analytics, ad-spend ingestion, experiment reports and daily optimization are remaining acquisition work. Existing daily Shopify Revenue Watch remains separate.

## Source basis

Public teaching is newly authored from the approved teaching themes: actual intelligence, a bounded job card, human exception handling, completion receipts and operating ownership. Credit Hitsuyo Aku for Diagnose → Stabilize → Instrument → Coordinate → Automate. No private consultation identities, raw transcripts, customer analytics, income testimonials or accreditation claims are included in the course source.

## Technical references

- Shopify order reconciliation and current quantities: https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order and https://shopify.dev/docs/api/admin-graphql/2026-07/objects/LineItem
- Webhook verification and delivery behavior: https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Native media played intervals: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/played
- Tutor API: https://developers.openai.com/api/reference/resources/responses/methods/create/

## Rollback

The source baseline is 09362a8e52fbe1b2ee5edc82d784f16915ee1d9a. Revert the new commit rather than rewriting published history. Keep new learner records; do not drop tables as an ordinary rollback. Disable tutor, Shopify and GHL feature flags to stop their integrations. Publishing the custom domain is a separate release action after the live acceptance checks.

## Existing website baseline

Lovable reports 703 visitors / 1,166 pageviews / 65% bounce for Aug 7–Sep 5 UTC; 179 visitors / 260 pageviews / 82% bounce for Aug 30–Sep 5. Mobile counts are 547 and 143 respectively. Instagram referrers account for 347 and 110 of the reported visitors, but paid versus organic is unknown. These counts are not yet linked to student events or Shopify orders. They support a mobile-first classroom, not a claimed webinar conversion rate.
