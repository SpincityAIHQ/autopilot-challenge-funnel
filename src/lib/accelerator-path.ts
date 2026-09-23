import {
  LESSONS,
  coverage,
  lessonHref,
  tierAllows,
  type LessonProgress,
} from "./academy";

/**
 * "Start here / My next step" for Accelerator students, built only from the
 * catalogue, the learner's real grants, which recordings are actually
 * connected, and their saved progress. Nothing here is invented: unknown
 * progress stays unknown and a missing recording is never the student's gap.
 */
export type VideoState = "watched" | "partial" | "none_recorded" | "unknown" | "unavailable";
export type CheckState = "passed" | "practice" | "not_taken";
export type ActivityState = "not_started" | "draft" | "submitted" | "approved" | "needs_revision";
export type StepStatus = "complete" | "awaiting_review" | "in_progress" | "not_started" | "blocked";

export type PathStep = {
  lessonId: string;
  title: string;
  stage: string;
  href: string;
  why: string;
  optional: boolean;
  status: StepStatus;
  video: VideoState;
  check: CheckState;
  activity: ActivityState;
  /** One practical instruction for this step. */
  action: string;
  /** What counts as evidence for this step. */
  proof: string;
};

export type FoundationCheck = {
  id: string;
  title: string;
  /** Short, tool-neutral way to confirm this rung yourself. */
  verify: string;
  href: string | null;
  linkLabel: string | null;
  note: string | null;
};

export type AcceleratorPath = {
  accessVerified: boolean;
  /** Spin's foundation ladder. Self-verified: no saved data confirms these, so status is never claimed. */
  foundation: FoundationCheck[];
  steps: PathStep[];
  supplemental: PathStep[];
  next: PathStep | null;
  whereAmI: string;
  uncertainty: string[];
  glossary: { term: string; meaning: string }[];
};

const SEQUENCE: { id: string; why: string }[] = [
  { id: "free-webinar", why: "Foundation: find one bottleneck and the first job for your AI team." },
  { id: "business-before-ai", why: "Foundation: define customer, offer and process before automating." },
  { id: "hire-the-ai-team", why: "Foundation: give each agent a bounded job, an owner and a receipt." },
  { id: "accelerator-2026-09-14", why: "Class 02: CEO calendar, one AI workflow and your first ten prospects." },
  { id: "accelerator-2026-09-21", why: "Class 03: departments, the bottleneck and your corporate offer." },
  { id: "accelerator-2026-09-22", why: "Class 04: know your stage, verify access and test one customer step. Follows Class 03." },
  { id: "implementation-lab", why: "Lab: take one workflow from job card to a tested routine." },
];
const SUPPLEMENTAL = [
  { id: "coordinate-the-business", why: "Optional VIP room: coordinate handoffs between teams." },
  { id: "measure-the-system", why: "Optional VIP room: separate activity from value." },
  { id: "own-the-platform", why: "Optional Emerald day: account ownership, access and recovery." },
];

const REUSE =
  "Already have this? Verify it and move on — no new tool or restart needed.";
export const FOUNDATION: FoundationCheck[] = [
  {
    id: "context",
    title: "1. Your AI has your business context",
    verify: `In the AI assistant you use, open its custom instructions or project settings and confirm your business, customer, offer, goals and constraints are written there. Then ask it: "Who is my customer and what do I sell?" — it should answer correctly without you retyping it. ("Train your AI" here means setting up context and instructions, not model fine-tuning.) ${REUSE}`,
    href: "/lesson/business-before-ai",
    linkLabel: "Summit Day 1",
    note: "Instructor recommendation (Sept 22 class): beginners start with the first 30 minutes of Summit Day 1. That is not a verified chapter boundary.",
  },
  {
    id: "memory",
    title: "2. Saved memory reflects that context",
    verify: `Open the assistant's saved memory or knowledge area and check the facts it keeps about your business are current and contain nothing private you would not want reused. Start a fresh chat and ask a question that depends on those facts. ${REUSE}`,
    href: null,
    linkLabel: null,
    note: "Do this only after step 1 is in place.",
  },
  {
    id: "skills",
    title: "3. Reusable business skills or plugins, where your tool supports them",
    verify: `Name one repeatable job and confirm you have a saved skill, custom assistant or plugin for it that uses your context. Run it once on a real example and keep the output as proof. If your tool has no such feature, a saved written instruction you reuse counts. ${REUSE}`,
    href: "/lesson/hire-the-ai-team",
    linkLabel: "Summit Day 2",
    note: null,
  },
  {
    id: "structure",
    title: "4. Founder interview, business structure and offer",
    verify: `Ask your assistant to interview you about what you have done in business, where you are now and where you are going. Save the answers as a one-page summary with your departments and your offer. Even without a business yet, the interview still applies. ${REUSE}`,
    href: "/lesson/accelerator-2026-09-21",
    linkLabel: "Class 03 · Sept 21",
    note: null,
  },
  {
    id: "destination",
    title: "5. A destination page with intake, booking and follow-up",
    verify: `Open your landing page on your phone, submit the intake or booking form yourself, and confirm the follow-up message actually arrives and someone owns replying to it. ${REUSE}`,
    href: null,
    linkLabel: null,
    note: null,
  },
  {
    id: "customer-test",
    title: "6. One customer step tested",
    verify: "Send one message, call, page or handoff to a small number of real customers and write down what happened. The result is evidence about that step only.",
    href: "/lesson/accelerator-2026-09-22",
    linkLabel: "Class 04 · Sept 22",
    note: null,
  },
];

export const PATH_GLOSSARY = [
  { term: "Train your AI", meaning: "Give your assistant your business context and instructions. Not fine-tuning a model." },
  { term: "Memory", meaning: "The facts your assistant saves and reuses between chats." },
  { term: "Skill / plugin", meaning: "A saved, reusable job your assistant can run with your context, where the tool supports it." },
  { term: "Department", meaning: "A part of the business (marketing, sales, fulfilment) with a person, a process and a platform." },
  { term: "Bottleneck", meaning: "The one place where work waits, is redone, or the customer stops hearing from you." },
  { term: "Workflow", meaning: "A repeatable job with a trigger, approved inputs, an owner and a checked result." },
  { term: "Knowledge check", meaning: "Three questions scored on the server. A practice signal, not a grade of your business." },
  { term: "Activity sheet", meaning: "Your own business example for the lesson. Submitting it is your evidence." },
  { term: "Proof", meaning: "Something that shows a step happened: a sent message, a booked call, a saved result." },
];

function videoState(connected: boolean, p: LessonProgress | undefined): VideoState {
  if (!connected) return "unavailable";
  if (!p) return "none_recorded";
  if (!p.duration) return p.intervals.length ? "unknown" : "none_recorded";
  const pct = coverage(p.intervals, p.duration);
  return pct >= 90 ? "watched" : pct > 0 ? "partial" : "none_recorded";
}
function checkState(p: LessonProgress | undefined): CheckState {
  if (!p || p.quiz_score === null || !p.quiz_total) return "not_taken";
  return p.quiz_score / p.quiz_total >= 0.8 ? "passed" : "practice";
}
function activityState(p: LessonProgress | undefined): ActivityState {
  const s = p?.workbook_status;
  if (s === "submitted" || s === "approved" || s === "needs_revision") return s;
  if (p && Object.values(p.workbook ?? {}).some((v) => String(v).trim())) return "draft";
  return "not_started";
}

function buildStep(
  id: string,
  why: string,
  optional: boolean,
  grants: string[],
  connected: string[],
  progress: LessonProgress[],
): PathStep | null {
  const meta = LESSONS.find((l) => l.id === id);
  if (!meta) return null;
  const href = lessonHref(id);
  const base = { lessonId: id, title: meta.title, stage: meta.stage, href, why, optional };
  if (!tierAllows(grants, meta.tier))
    return {
      ...base,
      status: "blocked",
      video: "unavailable",
      check: "not_taken",
      activity: "not_started",
      action: optional
        ? "Not included in your access. Optional — skip it."
        : "Your account does not show access to this lesson. Text the support line with the page and the email you signed in with.",
      proof: "None needed until access is confirmed.",
    };
  const p = progress.find((x) => x.lesson_id === id);
  const video = videoState(connected.includes(id), p);
  const check = checkState(p);
  const activity = activityState(p);
  let status: StepStatus;
  let action: string;
  let proof: string;
  if (activity === "needs_revision") {
    status = "in_progress";
    action = "Open your instructor's feedback and revise the activity sheet, then resubmit.";
    proof = "A resubmitted activity sheet.";
  } else if (activity === "approved") {
    status = "complete";
    action = "Reviewed and approved. Keep the evidence for your next build.";
    proof = "Instructor approval (recorded).";
  } else if (activity === "submitted" && check === "passed") {
    status = "awaiting_review";
    action = "Submitted. Move on while an instructor reviews it.";
    proof = "Submitted activity sheet (recorded).";
  } else if (video === "partial" || video === "none_recorded") {
    status = p ? "in_progress" : "not_started";
    action =
      video === "partial"
        ? "Finish the recording from where you stopped, then take the knowledge check."
        : "Watch the recording, then take the knowledge check.";
    proof = "Knowledge check result and a submitted activity sheet.";
  } else if (check !== "passed") {
    status = p ? "in_progress" : "not_started";
    action =
      check === "practice"
        ? "Review the notes on the questions you missed and retake the knowledge check."
        : video === "unavailable"
          ? "The recording is not available here yet — read the lesson notes, then take the knowledge check."
          : "Take the three-question knowledge check.";
    proof = "A knowledge check score of at least 80%.";
  } else {
    status = "in_progress";
    action =
      activity === "draft"
        ? "Finish the empty fields in your activity sheet and submit it."
        : "Fill in the activity sheet with your own business example and submit it.";
    proof = "A submitted activity sheet.";
  }
  return { ...base, status, video, check, activity, action, proof };
}

export function buildAcceleratorPath(input: {
  grants: string[];
  connected: string[];
  progress: LessonProgress[];
}): AcceleratorPath {
  const { grants, connected, progress } = input;
  const accessVerified = tierAllows(grants, "accelerator");
  const steps = SEQUENCE.map((s) => buildStep(s.id, s.why, false, grants, connected, progress)).filter(
    (s): s is PathStep => s !== null,
  );
  const supplemental = SUPPLEMENTAL.map((s) =>
    buildStep(s.id, s.why, true, grants, connected, progress),
  ).filter((s): s is PathStep => s !== null);
  const revision = steps.find((s) => s.activity === "needs_revision");
  const next =
    revision ??
    steps.find((s) => s.status !== "complete" && s.status !== "awaiting_review") ??
    null;
  const done = steps.filter((s) => s.status === "complete" || s.status === "awaiting_review").length;
  const uncertainty: string[] = [];
  if (steps.some((s) => s.video === "unavailable" && s.status !== "blocked"))
    uncertainty.push(
      "Some recordings are not connected yet; those steps use the lesson notes and are not counted against you.",
    );
  if (steps.some((s) => s.video === "unknown"))
    uncertainty.push("Viewing for at least one recording could not be measured, so it is shown as unknown.");
  uncertainty.push(
    "The six foundation checks are self-verified; nothing saved here confirms them, so their status is not shown.",
  );
  uncertainty.push("Watching is not mastery; the knowledge check and activity sheet are the evidence.");
  const whereAmI = !accessVerified
    ? "Your account does not show Accelerator access yet."
    : next
      ? `${done} of ${steps.length} steps have evidence saved. You are on: ${next.title} (${next.stage}).`
      : `All ${steps.length} steps have evidence saved.`;
  return { accessVerified, foundation: FOUNDATION, steps, supplemental, next, whereAmI, uncertainty, glossary: PATH_GLOSSARY };
}
