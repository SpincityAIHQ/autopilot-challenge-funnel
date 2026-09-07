# Fix: Thoth not answering, and watch tracking not showing

## What I found so far

- The AI service itself is working. The most recent tutor request today (18:42) went out and came back with a real answer in about 3 seconds. So the problem is on the way in or the way out, not the AI.
- In the Ask Thoth corner, the **Ask** button stays switched off until the small "use my question and lesson work" tick box is ticked. Nothing is said about that, so clicking looks like nothing happens. This is the most likely reason you got no answers.
- If Thoth does refuse (for example a lesson your ticket doesn't cover, or a limit), the message is shown only inside the chat list, which is easy to miss.
- On viewing: the lesson you opened (Day 1) came back with **no saved viewing at all** (`progress: null`), even though the video is connected. The player and the page talk to each other through browser messages; if that handshake misses, nothing is ever recorded and the watch map stays empty.

## Step 1 — Confirm both causes live (before changing behaviour)

- Open a lesson in the preview signed in as you, play the video, and record exactly what the player sends back and whether the "save progress" call happens and succeeds.
- Open the Ask Thoth corner and send a question, capturing what the page sends and what comes back.

This decides whether the tracking problem is the handshake, the saving call, or the display.

## Step 2 — Make Ask Thoth answer reliably

- Turn the permission tick into a one-time, clearly explained step: if it is not ticked, the button explains why instead of sitting dead.
- Show any refusal or error as a visible notice in the panel, not just a chat line.
- Keep the lesson picker, but default it to a lesson your ticket actually includes so a question can never bounce on access.
- Add a short "Thinking…" and timeout message so a slow answer never looks like silence.

## Step 3 — Make watch tracking actually record

- Repeat the player handshake instead of relying on catching one single "ready" moment: re-send the listener request when the frame loads and a couple of times shortly after, and stop once the player starts reporting time.
- Save viewing a little sooner (first save a few seconds after playback starts) so a student who watches briefly still shows up.
- Surface a small, honest "viewing saved" indicator under the player, and show a plain warning if saving fails, so this can never fail silently again.
- Re-check the stored length for Day 1 (it currently reads as about 7.5 hours) so the percentages mean something.

## Step 4 — Verify

- Play a lesson, confirm the watch bar fills and "My learning" shows minutes watched and where you stopped.
- Ask Thoth a question on a lesson page and in the corner, and confirm the answer comes back.
- Run the existing checks and the build.

## Technical notes

- Ask Thoth: `src/components/ThothBubble.tsx` disables submit on `!consent || !context?.tutorReady`; errors go only into `thread`. Server path `tutor` in `src/lib/academy.server.ts` throws 403 for a locked lesson via `authorizeLesson`, 429 for per-user (15/h) and network (60/h) limits, 503 on gateway failure. Gateway logs show only successes, so no request is reaching a failing state — consistent with the request not being sent.
- Tracking: `src/components/VimeoLessonPlayer.tsx` only calls `addEventListener` inside the `ready` branch of the message handler; a `ready` fired before the listener attaches leaves the player mute forever. Add an `onLoad` handshake plus bounded retries, and lower the first save interval from 15s.
- No database schema changes; `academy_progress` and the merge logic stay as they are.
