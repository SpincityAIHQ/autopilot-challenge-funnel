/**
 * Server-only teaching source for the Accelerator class of September 14, 2026.
 *
 * PROVENANCE (instructor metadata — never sent to the browser, never placed in the
 * public catalogue, and not a substitute for authorised media hosting):
 * - Meeting date: 2026-09-14 (Q4 Accelerator group build room).
 * - Google Meet recording: https://drive.google.com/file/d/157iGPg8AD2oDJjxHxaqRBd_N3pb8rClH/view
 * - Computer-generated notes/transcript:
 *   https://docs.google.com/document/d/1reM_IZ_JLN6Bzr0dY5BldrrzEp3j_mqzTRwrCI__Edc/edit
 * - Transcript ends at 01:31:29. That is the transcript end, NOT a verified recording duration.
 * - The paragraphs below are edited paraphrases; the knowledge check and activity sheet are
 *   newly designed practice, not transcript quotations.
 * - Speaker attributions are retained where a contribution is credited.
 * - Student and account identifiers are omitted, as is the 00:57:18–01:14:54 access-support
 *   section, which is not reusable teaching.
 * - Timestamp anchors come from the generated transcript and are NOT verified against playback.
 * - A Vimeo id was mentioned by email; embed and playback are unverified. No media is configured
 *   for this lesson and no transcript row is created.
 */
export const CLASS_2026_09_14_ID = "accelerator-2026-09-14";
export const CLASS_2026_09_14_VERSION = "2026-09-16.1";

export const CLASS_2026_09_14_PARAGRAPHS = [
  {
    heading: "Control the calendar before expanding agents",
    text: "In the September 14 class, Spin starts with a 0–5 calendar-control check, then protects revenue work alongside delivery, health, recovery and family. His suggested three-hour revenue block is a planning target, not an income guarantee. Separate intentional sales outreach from reactive messaging. Give the block a measurable output. Transcript anchors: 00:00:05, 00:07:31 and 00:10:41; not yet verified against video playback.",
  },
  {
    heading: "Map operations, owners and quotas",
    text: "Break the business into weekly, monthly, quarterly and annual operations. For each recurring workflow, name its output, human or agent owner, tools, budget, founder workload and measurable quota. Review the generated plan for capacity and accuracy. A task list without ownership and evidence is not a complete operating plan. Transcript anchors: 00:12:07, 00:13:39, 00:23:35 and 00:26:32; not yet verified against playback.",
  },
  {
    heading: "Make one scheduled workflow executable",
    text: "Define its trigger or recurrence, approved inputs, connected accounts, output destination and notification. Record missing dependencies with an owner and next checkpoint. Spin discusses push and email handoffs, which require an actual receiving workflow. Save evidence of a completed test run before calling the automation operational. A calendar entry or connector name alone does not prove execution. Transcript anchors: 00:35:47, 00:39:05 and 00:41:46; not yet verified against playback.",
  },
  {
    heading: "Package the business into reusable instructions",
    text: "Specify the company purpose, skills, connectors and agent responsibilities, and include an exception path for conflicts and rescheduling. A student introduced attaching market research and a business plan at 00:52:58; Spin endorsed that contribution at 00:56:11. Keep that attribution. The demonstrated counts of skills and connectors describe one template, not a required architecture. Start with one defined workflow. Transcript anchors: 00:45:32 and 00:51:31; not yet verified against playback.",
  },
  {
    heading: "Research the first ten prospects yourself",
    text: "Inspect each company website and LinkedIn presence, verify why its business needs fit the offer, and tailor the first ten approaches manually. Funding and hiring were signals for Spin's corporate AI offer, not universal qualification thresholds. Use early human review to improve qualification and messaging before scaling. Ensure your own website, experience and authentic proof support your credibility. Transcript anchors: 01:16:48, 01:23:59, 01:24:58 and 01:27:04; not yet verified against playback.",
  },
];

/** Answer keys and feedback stay server-side; only prompts and choices reach the browser. */
export const CLASS_2026_09_14_CHECKS = [
  {
    prompt: "Your AI has generated a calendar. What makes one block ready for an agent to execute?",
    choices: [
      "A clear trigger, approved inputs, owner, output and completion evidence",
      "A colorful calendar with every hour filled",
      "A larger collection of tools with no assigned workflow",
    ],
    correct: 0,
    feedback:
      "Define the job and its evidence, then confirm the required connections and test a run. A generated schedule is a plan.",
  },
  {
    prompt: "A scheduled workflow depends on a connector that is unavailable. What should you do?",
    choices: [
      "Mark the workflow complete because it was scheduled",
      "Record the missing dependency, responsible owner and next checkpoint",
      "Tell the student the agent probably ran",
    ],
    correct: 1,
    feedback:
      "Keep the blocker explicit. Complete what is possible, but do not report the unavailable integration as working.",
  },
  {
    prompt: "Why manually research and tailor the first ten prospects before scaling?",
    choices: [
      "Because every business must use Spin's hiring threshold",
      "Because company websites remove the need to qualify prospects",
      "To validate real fit and improve qualification and messaging before multiplying errors",
    ],
    correct: 2,
    feedback:
      "The first ten provide human review of actual fit and useful evidence for refining the approach. Qualification should match your offer.",
  },
];

export const CLASS_2026_09_14_WORKBOOK = [
  {
    id: "calendar",
    label: "Your CEO calendar",
    hint: "Describe the coming week's protected revenue block and measurable output, delivery time, and essential health, recovery and family commitments.",
  },
  {
    id: "workflow",
    label: "Your recurring workflow map",
    hint: "Name one workflow's output, owner, frequency, required tools, quota or quality measure, and proof of completion.",
  },
  {
    id: "test",
    label: "One executable automation",
    hint: "Specify trigger, approved inputs, accounts/permissions, destination, notification and test evidence; if blocked, identify the dependency, owner and next checkpoint.",
  },
  {
    id: "prospects",
    label: "Your first-ten prospect criteria",
    hint: "Define your offer-specific qualification rule and outline the first ten companies with evidence URLs, checked dates and tailored opening drafts.",
  },
  {
    id: "exceptions",
    label: "Exception handling and next meeting",
    hint: "Name the human responsible for failures or schedule conflicts, your recovery plan and the one unresolved question you will bring to the next meeting.",
  },
];

/** Honest status shown in place of a player while replay connection is unverified. */
export const CLASS_2026_09_14_MEDIA_NOTICE =
  "Class notes and practice for September 14 are ready below. The replay connection is still awaiting verification, so no recording is attached yet.";
