/**
 * Server-only teaching source for the Q4 Accelerator meetings of
 * Monday September 21 and Tuesday September 22, 2026.
 *
 * PROVENANCE (server-only instructor metadata):
 * - Monday 2026-09-21 recording plays from the Vimeo slot
 *   ACADEMY_VIMEO_ACCELERATOR_2026_09_21. Tuesday's slot
 *   ACADEMY_VIMEO_ACCELERATOR_2026_09_22 stays empty until the owner supplies it.
 * - The paragraphs below are edited summaries of the owner-supplied class outline for each
 *   meeting. They are not verbatim transcript text, and no raw transcript, participant name
 *   or private participant detail is published here. The Google Docs meeting notes were not
 *   readable by the build tools, so no transcript text has been ingested from them.
 * - No timestamps are quoted, because none have been verified against playback.
 */

export const CLASS_2026_09_21_ID = "accelerator-2026-09-21";
export const CLASS_2026_09_22_ID = "accelerator-2026-09-22";
export const CLASS_2026_09_21_VERSION = "2026-09-23.1";
export const CLASS_2026_09_22_VERSION = "2026-09-23.1";

export const CLASS_2026_09_21_PARAGRAPHS = [
  {
    heading: "Three departments, in people, process and platform",
    text: "Monday's class maps the business into marketing, sales and fulfilment, and describes each of the three in the same three columns: the people accountable for it, the process it repeats, and the platform or tools it runs on. Write the columns for your own business before deciding what AI should touch. A department with no named owner and no written process is not ready to be automated.",
  },
  {
    heading: "Find the actual bottleneck and put a number on the backlog",
    text: "Only one of the three departments is your current constraint. Identify it from evidence: where work waits, where it is redone, or where a customer stops hearing from you. Then value the backlog sitting behind it — how many held opportunities, at what typical order value, over what period. The figure is your own estimate of held work, not a forecast of revenue and not a promise of what AI will recover.",
  },
  {
    heading: "The corporate offer and the four-minute pitch",
    text: "The class works through the corporate offer: who buys it, the problem it removes, what is delivered, and what proof supports it. You then compress it into a four-minute spoken pitch — problem, the cost of leaving it alone, your approach, what the buyer receives, and the single next step you are asking for. Four minutes is a discipline: if it cannot be said clearly in four, the offer is not defined yet.",
  },
  {
    heading: "One next action with an owner, a date and proof",
    text: "Everyone leaves with one individual next action, not a list. It names the accountable person, the date it is due, and the proof that will show it happened — a sent message, a booked call, a published page, a recorded test. Proof is the part most plans skip, and it is the part reviewed at the next meeting.",
  },
];

export const CLASS_2026_09_21_CHECKS = [
  {
    prompt: "You have mapped marketing, sales and fulfilment. What identifies your bottleneck?",
    choices: [
      "The department with evidence of waiting, rework or silence toward the customer",
      "Whichever department is the least enjoyable",
      "The department with the fewest tools installed",
    ],
    correct: 0,
    feedback:
      "The constraint shows itself in waiting, rework and dropped follow-up. Pick it from observed evidence, not preference.",
  },
  {
    prompt: "What does valuing the backlog behind a bottleneck give you?",
    choices: [
      "A guaranteed amount of revenue AI will recover",
      "A sized estimate of held work, to help you choose what to fix first",
      "A reason to skip fixing the process",
    ],
    correct: 1,
    feedback:
      "It is your own estimate of held opportunity, used for prioritising. It is not a forecast or a guarantee.",
  },
  {
    prompt: "What makes a next action reviewable at the following class?",
    choices: [
      "A long list of intentions for the quarter",
      "A note that the team will look into it",
      "One action with a named owner, a date and stated proof of completion",
    ],
    correct: 2,
    feedback:
      "One action, one owner, one date, one piece of proof. That is what can actually be checked next time.",
  },
];

export const CLASS_2026_09_21_WORKBOOK = [
  {
    id: "departments",
    label: "Your three departments",
    hint: "For marketing, sales and fulfilment, write the accountable person, the repeated process and the platform or tools each one runs on.",
  },
  {
    id: "bottleneck",
    label: "The bottleneck and its evidence",
    hint: "Name the one department that is your constraint right now, and the evidence: what waits, what is redone, or where the customer stops hearing from you.",
  },
  {
    id: "backlog",
    label: "Backlog value",
    hint: "Estimate the held work behind the bottleneck: how many opportunities, typical value, over what period. Mark it clearly as your estimate.",
  },
  {
    id: "offer",
    label: "Corporate offer and four-minute pitch",
    hint: "Buyer, problem, cost of inaction, what is delivered, proof you can show, and the one next step you ask for. Write it so it can be spoken in four minutes.",
  },
  {
    id: "action",
    label: "Your next action, owner, date and proof",
    hint: "One action only. Who is accountable, the date it is due, and the exact proof you will bring back to class.",
  },
];

export const CLASS_2026_09_22_PARAGRAPHS = [
  {
    heading: "Orientation ladder and a shared glossary",
    text: "Tuesday opens with the feedback from Monday: people needed to know where they are standing before more content arrives. The orientation ladder names the rungs in order — account, access, class, activity, evidence — so you can say out loud which rung you are on. The glossary fixes the vocabulary used from here on, so that department, workflow, bottleneck, proof and checkpoint mean the same thing for everyone in the room.",
  },
  {
    heading: "Short modules with checkpoints, not long sessions",
    text: "The teaching is broken into short modules, each ending in a checkpoint you can answer in a sentence. A checkpoint is not a summary of what was said; it is a question about your own business that you can only answer if the module landed. If you cannot answer it, that module is the one to rewatch before moving on.",
  },
  {
    heading: "Know your stage, and verify access rather than assume it",
    text: "The stage checklist tells you what is expected of you now and what comes next. Part of it is verification: open a lesson you are entitled to and confirm it loads, and ask the AI tutor one real question about your own notes and confirm it answers. If either does not work, that is reported as a blocker with the exact page and time — we check access, we do not claim it is working.",
  },
  {
    heading: "From business foundation to one tested customer step",
    text: "Monday produced the foundation: departments, bottleneck, offer, next action. Tuesday bridges that into a single customer-facing step that can be tested this week — one message, one call, one page, or one delivery handoff. Test it on a small number of real customers, record what happened, and treat the result as evidence about that step only, not as proof the whole system works.",
  },
  {
    heading: "Accountability and the exit ticket",
    text: "The class closes with an exit ticket: what you completed, what you are stuck on, and the one commitment you are making before the next meeting. The commitment carries an owner and a date, the same as Monday. The exit ticket is what makes the next class a review instead of a restart.",
  },
];

export const CLASS_2026_09_22_CHECKS = [
  {
    prompt: "Why does Tuesday start with the orientation ladder and glossary?",
    choices: [
      "Because Monday's feedback was that people needed to know where they stand and what the words mean",
      "Because the previous class was cancelled",
      "Because the glossary replaces doing the work",
    ],
    correct: 0,
    feedback:
      "The ladder and glossary exist so everyone can name their current rung and use the same vocabulary for the rest of the programme.",
  },
  {
    prompt: "You open a lesson you are entitled to and it will not load. What is the correct report?",
    choices: [
      "Mark the stage complete and move on",
      "The exact page, what you saw and when — logged as a blocker",
      "Assume the tutor will fix it later",
    ],
    correct: 1,
    feedback:
      "Access is verified, not assumed. A blocker with the page, the behaviour and the time is what gets it fixed.",
  },
  {
    prompt: "What counts as the one tested customer step that follows Monday's foundation?",
    choices: [
      "A full rebuild of marketing, sales and fulfilment at once",
      "A plan to test something next quarter",
      "One message, call, page or handoff tried with real customers, with the result recorded",
    ],
    correct: 2,
    feedback:
      "One small step, actually tried, with the outcome written down. The result is evidence about that step, nothing wider.",
  },
];

export const CLASS_2026_09_22_WORKBOOK = [
  {
    id: "rung",
    label: "Your rung on the orientation ladder",
    hint: "Account, access, class, activity, evidence — name the rung you are actually on today and the one thing needed to reach the next.",
  },
  {
    id: "checkpoints",
    label: "Module checkpoints",
    hint: "For each short module, write your one-sentence answer about your own business. Mark any module whose checkpoint you could not answer.",
  },
  {
    id: "verification",
    label: "Access and tutor verification",
    hint: "Which lesson you opened and whether it loaded; the question you asked the AI tutor and whether it answered. Record failures with the page and the time — do not record them as working.",
  },
  {
    id: "customer-step",
    label: "Your one tested customer step",
    hint: "Building on Monday's bottleneck and offer: the single message, call, page or handoff you will test, who receives it, and what result you recorded.",
  },
  {
    id: "exit-ticket",
    label: "Exit ticket and commitment",
    hint: "Completed, stuck on, and the one commitment before the next class — with the accountable person and the date.",
  },
];

/**
 * Shown in place of the player until the Vimeo slot for each class is filled.
 * Vimeo is the destination for both recordings; Google Drive is interim only.
 * Slots: ACADEMY_VIMEO_ACCELERATOR_2026_09_21 and ACADEMY_VIMEO_ACCELERATOR_2026_09_22.
 * Setting either one automatically replaces the notice with
 * the tracked player, and lets the transcript pipeline read that video's captions.
 */
export const CLASS_2026_09_21_MEDIA_NOTICE =
  "The Monday September 21 recording is not playing here yet. Work through the notes, knowledge check and activity sheet below; if this stays unavailable, text the support line.";
export const CLASS_2026_09_22_MEDIA_NOTICE =
  "The Tuesday September 22 recording has not been uploaded yet. Work through the notes, knowledge check and activity sheet below. This class follows Monday September 21 — complete that one first if you have not.";

/**
 * Provenance shown to the AI tutor so it can say where an answer comes from.
 * Summarised class notes only — no participant names or private student details.
 */
export const CLASS_2026_09_21_SOURCE =
  "Live Q4 Accelerator class recorded Monday, September 21, 2026. These notes are an approved summary of that session; they contain no participant names or private student details.";
export const CLASS_2026_09_22_SOURCE =
  "Live Q4 Accelerator class recorded Tuesday, September 22, 2026, following the September 21 session. These notes are an approved summary of that session; they contain no participant names or private student details.";
