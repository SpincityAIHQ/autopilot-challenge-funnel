# Vimeo slots, watch telemetry and the AI Spin loop — September 6, 2026

This is the framework for the AI AutoPilot education experience. Every teaching slot, from the free training through the Summit to every Accelerator day, has one server-side Vimeo slot. Paste the Vimeo link into the slot, and the platform does the rest: playback, watch telemetry, the watch map, AI Spin's brief, and the coaching emails.

## Slot map

| Stage                   | Slot id                                     | Vimeo env key                              | Chapters env key                              | Kind    |
| ----------------------- | ------------------------------------------- | ------------------------------------------ | --------------------------------------------- | ------- |
| Free training           | `free-webinar`                              | `ACADEMY_VIMEO_FREE_WEBINAR`               | `ACADEMY_CHAPTERS_FREE_WEBINAR`               | lesson  |
| Summit · Day 1          | `business-before-ai`                        | `ACADEMY_VIMEO_BUSINESS_BEFORE_AI`         | `ACADEMY_CHAPTERS_BUSINESS_BEFORE_AI`         | lesson  |
| Summit · Day 2          | `hire-the-ai-team`                          | `ACADEMY_VIMEO_HIRE_THE_AI_TEAM`           | `ACADEMY_CHAPTERS_HIRE_THE_AI_TEAM`           | lesson  |
| VIP · After hours 1     | `coordinate-the-business`                   | `ACADEMY_VIMEO_COORDINATE_THE_BUSINESS`    | `ACADEMY_CHAPTERS_COORDINATE_THE_BUSINESS`    | lesson  |
| VIP · After hours 2     | `measure-the-system`                        | `ACADEMY_VIMEO_MEASURE_THE_SYSTEM`         | `ACADEMY_CHAPTERS_MEASURE_THE_SYSTEM`         | lesson  |
| Emerald · Intensive     | `own-the-platform`                          | `ACADEMY_VIMEO_OWN_THE_PLATFORM`           | `ACADEMY_CHAPTERS_OWN_THE_PLATFORM`           | lesson  |
| Accelerator · Lab       | `implementation-lab`                        | `ACADEMY_VIMEO_IMPLEMENTATION_LAB`         | `ACADEMY_CHAPTERS_IMPLEMENTATION_LAB`         | lesson  |
| Accelerator · Day 01–12 | `accelerator-day-01` … `accelerator-day-12` | `ACADEMY_VIMEO_ACCELERATOR_DAY_01` … `_12` | `ACADEMY_CHAPTERS_ACCELERATOR_DAY_01` … `_12` | session |

The public invitation video on `/` stays in `VITE_ACADEMY_VSL_URL`. It is a funnel video, not a tracked lesson.

A **lesson** has notes, a knowledge check and an activity book. A **session** is a tracked replay only: no invented quiz or workbook. The day count lives in `ACCELERATOR_DAY_COUNT` in `src/lib/academy.ts`; change it once and the catalogue, the slots list, `.env.example` and the tests follow.

## What a slot accepts

Any Vimeo share link: `vimeo.com/ID`, `vimeo.com/ID/HASH`, `vimeo.com/ID?h=HASH`, or `player.vimeo.com/video/ID?h=HASH`. Unlisted hashes are kept. HTTP, other hosts and channel URLs are rejected. Vimeo links are server-only; paid slots are only sent to a student after the entitlement check, and the `/api/academy/catalogue` endpoint exposes only booleans for which slots are connected, never URLs.

Optional chapters: `0|Welcome;5:12|Give your agent a job card;18:40|Completion receipts`. Seconds or `m:ss` / `h:mm:ss`, separated by `;`. Chapters make "the part you missed" a named thing. Invalid entries are dropped, never guessed.

Changing a slot's video changes its media version, so viewing progress for that slot restarts. Set `ACADEMY_MEDIA_VERSION_<KEY>` explicitly if you want to swap a re-upload without resetting progress.

## How the telemetry works

1. The classroom embeds the Vimeo player with the messaging API on (`api=1`, `dnt=1`, branding off) inside the existing sandbox that blocks pop-ups and top-navigation.
2. The player reports `timeupdate`, `pause`, `seeked` and `ended`. Continuous playback becomes watched spans; any jump larger than 1.75 seconds closes the span, so a seek never counts skipped material.
3. Spans post to the existing `progress` endpoint as `playback` every 15 seconds while playing, on pause, on end and when the tab hides. The database merges them, so repeat viewing never inflates coverage.
4. The server confirms each slot's duration through Vimeo's public oEmbed endpoint (cached one hour). If oEmbed is unavailable, it falls back to `ACADEMY_MEDIA_DURATION_<KEY>`, then to the player-reported duration. `durationVerified` on the lesson media says which applied.
5. From the merged spans the platform derives a **watch summary**: coverage, furthest point, drop-off timestamp (when under 90 percent), unwatched gaps over 30 seconds, and minutes watched. With chapters it also derives per-chapter status: watched, partial, or missed.

Coverage is client-reported viewing telemetry. It measures attention to the player, not understanding. Knowledge checks and instructor-approved applied work remain separate evidence.

## Where the telemetry goes

- **Classroom watch map.** Under every connected recording: watched spans, chapter ticks, the drop-off cursor, and a chapter list that seeks the Vimeo player on click.
- **My learning.** A compact watch map per lesson, minutes watched, and the drop-off guidance ("You stopped Day 1 at 12:40 with 38% watched").
- **AI Spin brief.** Every tutor call now receives the student's ticket, unlocked and locked stages, the current lesson's chapters, viewing (coverage, minutes, stopped-at, unwatched spans, missed chapters), saved learning work, the cross-lesson journey, the next stage available, and a platform guide with lesson links. The system prompt holds the student accountable with warmth, points to the exact missed chapter, and invites the next stage once per answer with grace. It never pressures a struggling student and never manufactures urgency or outcomes.
- **Live avatar.** The Accelerator avatar only speaks the tutor's answer, so it inherits the same brief and the same ticket awareness.
- **Coaching emails.** The GHL learning queue gains `learning_dropoff`: coverage between 5 and 90 percent with no progress write for 24 hours. Payloads now carry `watched_percent`, `stopped_at`, `resume_seconds` and `lesson_stage`. Session replays receive only the drop-off reminder; they never get an activity-book nudge they cannot act on. Requires the migration `20260906120000_learning_dropoff_nudges.sql` and `ACADEMY_LEARNING_NUDGES_ENABLED=true`.

## Ticket identity

A student's ticket is derived from their redeemed grants: Free Training, General Admission, Summit + VIP, Emerald Vault Key, and Autopilot Accelerator (which combines, for example, "Autopilot Accelerator + Emerald Vault Key"). The ticket badge appears in the classroom, My learning, AI Spin and the booking page. AI Spin greets by ticket and never by email.

The next stage is one step up: GA → VIP → Emerald → Accelerator → nothing left to sell, at which point the graceful invitation becomes the 1-on-1.

## Book a 1-on-1 with SpinCity

`/book` is included with the Accelerator ticket. Set `ACADEMY_BOOKING_URL` to the HTTPS calendar link. The server returns it only to students with active redeemed Accelerator access; everyone else sees what the Accelerator adds and links to `/accelerator` and `/redeem`. Calendly, Cal.com and `api.leadconnectorhq.com` embed inline; other hosts open as a link unless added to `ACADEMY_BOOKING_EMBED_HOSTS`. This is paid, included time, consistent with the no-unpaid-sales-calls rule.

## Activation checklist

1. Paste the Vimeo link for each slot. Start with `ACADEMY_VIMEO_FREE_WEBINAR`.
2. Add chapters for at least the free training and Summit days so AI Spin can name the missed part.
3. Apply `20260906120000_learning_dropoff_nudges.sql` through the existing database connector, then set `ACADEMY_LEARNING_NUDGES_ENABLED=true` when the GHL learning workflow handles the new `learning_dropoff` event.
4. Set `ACADEMY_BOOKING_URL` for the Accelerator calendar.
5. Watch one recording in the preview as a signed-in student: confirm the watch map fills, the drop-off timestamp appears after pausing, and AI Spin names it when asked "What did I miss?".
6. Keep the existing gates: `ACADEMY_PAID_ACCESS_ENABLED`, access codes, Shopify and GHL stay off until their own QA passes.

## Not done here

No Vimeo video has been connected or watched in this environment. Vimeo oEmbed and the player messaging API were implemented from documentation, not exercised against a live video. The GHL workflow must add the `learning_dropoff` event. The brand fonts now load from Google Fonts with system fallbacks; if that request is unwanted for privacy reasons, remove the stylesheet link in `src/routes/__root.tsx` and the stacks fall back cleanly.
