import { LESSONS, parseChapters, type LessonContent, type LessonMedia } from "./academy";
import { parseVimeoUrl, vimeoEmbedUrl } from "./vimeo";

// Authored teaching notes. These are not verbatim transcripts or invented video timestamps.
const units: Record<string, { heading: string; text: string }[]> = {
  "free-webinar": [
    {
      heading: "Start with actual intelligence",
      text: "Choose an existing customer, a real offer and one task that keeps returning to you. AI needs your judgment about what matters before it can help you execute. Write the problem in business terms: a lead waits too long, a handoff gets lost or a result is hard to verify.",
    },
    {
      heading: "Put the work in the right order",
      text: "Hitsuyo Aku's sequence is Diagnose → Stabilize → Instrument → Coordinate → Automate. Find the problem, make the process repeatable, establish a baseline, connect the owners, then automate the bounded work. Automating a broken process can repeat its errors faster.",
    },
    {
      heading: "Give your agent a job card",
      text: "Describe the trigger, permitted inputs, expected result, accountable owner, exception route and baseline. For example: when a consenting lead requests a consultation, prepare the relevant information for a human-approved reply. Stop and route uncertain or sensitive cases to the owner.",
    },
    {
      heading: "Demand a completion receipt",
      text: "A workflow running is not the same as a customer receiving value. Decide what record proves the intended result. Compare response time, error rate and completed outcomes with a baseline. Keep human review where judgment or consequential decisions are involved.",
    },
  ],
  "business-before-ai": [
    {
      heading: "Interview the founder",
      text: "Describe the buyer, the promise, the current delivery process and the questions customers ask. Record examples of good work and exceptions. Separate known facts from assumptions. This becomes a versioned operating brief rather than a pile of disconnected prompts.",
    },
    {
      heading: "Diagnose before selecting tools",
      text: "Trace one customer journey from request to result. Name the slowest or least reliable handoff, its owner and its cost in time or rework. Choose one problem with enough repetitions to measure; do not start by replacing the entire business.",
    },
  ],
  "hire-the-ai-team": [
    {
      heading: "One bounded job",
      text: "An agent needs a trigger, approved inputs, an expected result and a stop condition. Assign a human owner for the workflow and an exception route. Limit permissions to the task. A tool call completing is not sufficient proof of a successful business outcome.",
    },
    {
      heading: "Test the exception",
      text: "Run a normal case, a missing-information case and a duplicate request. Check the result and the completion receipt for each. If the agent cannot decide within its authority, it should pause and ask its owner instead of inventing an answer.",
    },
  ],
  "coordinate-the-business": [
    {
      heading: "One shared operating brief",
      text: "Marketing, sales and delivery should use the same approved offer and customer context. Define which system owns each record and who resolves a conflict. Give each handoff a required input, recipient and acknowledgement.",
    },
    {
      heading: "Close the loop",
      text: "When a customer reaches the next stage, update the system that scheduled the previous follow-up. A purchase should stop acquisition reminders for that same offer. Failed handoffs need a visible exception queue and a responsible person.",
    },
  ],
  "measure-the-system": [
    {
      heading: "Choose a meaningful denominator",
      text: "Record people who entered a stage, those who completed it and the time window. Keep registrations, viewers, buyers and collected revenue separate. An unknown traffic source stays unknown. Store conversion alone cannot establish advertising return.",
    },
    {
      heading: "Compare before expanding",
      text: "Establish the current response time, completed outcomes, error rate and operating cost. Test one change and compare equivalent groups or periods. Small samples are directional; do not promise that an early improvement will continue at larger scale.",
    },
  ],
  "own-the-platform": [
    {
      heading: "Ownership is operational",
      text: "Know who controls the domain, source repository, customer data, payment account and production credentials. Document access recovery, recurring costs, exports and a restore procedure. Ownership does not remove hosting or model costs.",
    },
    {
      heading: "Prepare for interruption",
      text: "Name the person who handles a failed payment, unavailable model or broken automation. Keep a rollback path and a way for customers to reach a human. Test recovery before relying on unattended operation.",
    },
  ],
  "implementation-lab": [
    {
      heading: "Build one working journey",
      text: "Choose the smallest workflow that produces customer value. Connect its trigger, action, completion receipt and exception route. Record the exact version you tested, the cases you ran and the observed results.",
    },
    {
      heading: "Move from demonstration to operation",
      text: "Check access isolation, duplicate handling, failures and recovery. Assign an owner and a review cadence. A demonstration establishes that a path can work; ongoing operating evidence establishes whether it works reliably.",
    },
  ],
};
type Check = { prompt: string; choices: string[]; correct: number; feedback: string };
const checks: Record<string, Check[]> = {
  "free-webinar": [
    {
      prompt: "What should you do before choosing an automation tool?",
      choices: [
        "Name a real bottleneck and establish a baseline",
        "Buy the largest software plan",
        "Automate every customer interaction",
      ],
      correct: 0,
      feedback:
        "Begin with a real bottleneck and a measurable baseline. Tool selection follows diagnosis.",
    },
    {
      prompt: "The agent encounters information outside its authority. What happens next?",
      choices: [
        "It guesses to keep moving",
        "It silently skips the task",
        "It stops and routes the exception to its owner",
      ],
      correct: 2,
      feedback:
        "The accountable owner handles exceptions. Stop when the workflow cannot act within its authority.",
    },
    {
      prompt: "What demonstrates that the workflow produced the intended result?",
      choices: [
        "The automation was switched on",
        "A completion receipt linked to the outcome",
        "The student finished the video",
      ],
      correct: 1,
      feedback:
        "A completion receipt tied to the intended result is evidence; watching alone is not.",
    },
  ],
  "business-before-ai": [
    {
      prompt: "A founder says sales are slow. What evidence should you gather first?",
      choices: [
        "A list of popular tools",
        "Recent customer requests, handoffs and outcomes",
        "A new logo",
      ],
      correct: 1,
      feedback: "Trace actual customer journeys to diagnose where work slows or fails.",
    },
    {
      prompt:
        "A founder's operating brief contains an untested assumption. How should it be recorded?",
      choices: [
        "As a proven fact",
        "Leave it out without discussion",
        "Label the assumption and identify a way to test it",
      ],
      correct: 2,
      feedback:
        "Keep facts and assumptions distinct so future decisions can use appropriate evidence.",
    },
    {
      prompt: "Which first project is easiest to evaluate?",
      choices: [
        "One repeated handoff with an owner and baseline",
        "Replacing every system at once",
        "An activity with no measurable outcome",
      ],
      correct: 0,
      feedback:
        "A bounded, repeated process supports a clear comparison with the current baseline.",
    },
  ],
  "hire-the-ai-team": [
    {
      prompt: "A new lead workflow needs access to your systems. What is appropriate?",
      choices: [
        "Every administrator permission",
        "The minimum permissions for its defined job",
        "All customer payment credentials",
      ],
      correct: 1,
      feedback: "Bound permissions to the assigned task and preserve human accountability.",
    },
    {
      prompt: "The same request arrives twice. What should a test establish?",
      choices: [
        "Both requests produce separate charges",
        "The duplicate is ignored without a record",
        "The workflow identifies the duplicate and preserves one intended outcome",
      ],
      correct: 2,
      feedback:
        "Test duplicate handling so a repeated trigger cannot multiply consequential actions.",
    },
    {
      prompt: "When is a workflow ready for a first controlled trial?",
      choices: [
        "Normal and exception cases have observable receipts and a responsible owner",
        "The code compiled once",
        "Its instructions say it is autonomous",
      ],
      correct: 0,
      feedback: "A controlled trial needs tested cases, observable results and an owner.",
    },
  ],
  "coordinate-the-business": [
    {
      prompt: "Sales and delivery disagree about an offer. Where should they resolve it?",
      choices: [
        "A shared approved operating brief with an assigned owner",
        "Whichever chat was most recent",
        "Two contradictory customer messages",
      ],
      correct: 0,
      feedback: "One approved source and a conflict owner prevent incompatible promises.",
    },
    {
      prompt: "A customer buys while an acquisition reminder is waiting. What should happen?",
      choices: [
        "Send the sales reminder anyway",
        "Update purchase state and cancel the obsolete reminder",
        "Delete all customer history",
      ],
      correct: 1,
      feedback: "Return downstream events to the systems that scheduled earlier follow-up.",
    },
    {
      prompt: "A handoff has no acknowledgement. What makes it reliable?",
      choices: [
        "Assuming delivery happened",
        "Adding another marketing tool",
        "A named recipient, required input and receipt or exception",
      ],
      correct: 2,
      feedback: "Define the recipient, required input and acknowledgement at each handoff.",
    },
  ],
  "measure-the-system": [
    {
      prompt: "You have store revenue but no ad-spend data. What can you report?",
      choices: [
        "Verified advertising ROAS",
        "Store revenue, with advertising return unknown",
        "Revenue as profit",
      ],
      correct: 1,
      feedback:
        "ROAS needs attributed revenue and actual ad spend. Keep unknown attribution unknown.",
    },
    {
      prompt: "What makes a conversion rate interpretable?",
      choices: [
        "Only the number of buyers",
        "The largest possible percentage",
        "The entry count, completed count and time window",
      ],
      correct: 2,
      feedback: "Name the numerator, denominator and window so the result can be assessed.",
    },
    {
      prompt: "A small early test improves response time. What follows?",
      choices: [
        "Treat it as directional and check reliability and cost before expanding",
        "Guarantee the same result at every scale",
        "Remove failure monitoring",
      ],
      correct: 0,
      feedback: "Early evidence supports a measured next experiment, not a guarantee.",
    },
  ],
  "own-the-platform": [
    {
      prompt: "What does operational ownership require?",
      choices: [
        "A domain name alone",
        "Control of accounts, source, data and recovery procedures",
        "No recurring expenses",
      ],
      correct: 1,
      feedback: "Ownership includes control and recovery, while hosting and model costs remain.",
    },
    {
      prompt: "The model provider is unavailable. What should the operating plan contain?",
      choices: [
        "A fallback or pause, visible failure and responsible human",
        "A fabricated successful answer",
        "No customer contact route",
      ],
      correct: 0,
      feedback: "Prepare a fallback and human exception route for an unavailable dependency.",
    },
    {
      prompt: "How do you verify an export is a useful backup?",
      choices: [
        "Assume the file is enough",
        "Name it final-backup",
        "Test a restore and record the result",
      ],
      correct: 2,
      feedback: "A restore test is evidence that recovery works.",
    },
  ],
  "implementation-lab": [
    {
      prompt: "What identifies a useful implementation test receipt?",
      choices: [
        "Only a screenshot of the home page",
        "The exact version, scenario, expected result and observed result",
        "An untested promise",
      ],
      correct: 1,
      feedback: "Tie each test result to the actual version, scenario and observed outcome.",
    },
    {
      prompt: "A demonstration passed once. What does that prove?",
      choices: [
        "The business is fully autonomous",
        "Guaranteed customer acquisition",
        "That tested path worked under those conditions",
      ],
      correct: 2,
      feedback:
        "A demonstration supports a bounded path; operating reliability needs ongoing evidence.",
    },
    {
      prompt: "What should happen before unattended operation?",
      choices: [
        "Check access, duplicates, failure, recovery and ownership",
        "Remove the exception queue",
        "Stop measuring outcomes",
      ],
      correct: 0,
      feedback:
        "Verify operational boundaries and recovery before relying on unattended execution.",
    },
  ],
};
const SESSION_WORKBOOK: LessonContent["workbook"] = [];
/**
 * Media for a slot. A Vimeo link in ACADEMY_VIMEO_<KEY> wins; otherwise the free
 * webinar may use a direct HTTPS recording and paid lessons a private storage
 * path. The Vimeo duration is confirmed server-side later (see academy-media.server).
 */
export function slotMedia(id: string): LessonMedia | null {
  const key = id.replace(/-/g, "_").toUpperCase();
  const version = process.env[`ACADEMY_MEDIA_VERSION_${key}`];
  const configuredDuration = Number(process.env[`ACADEMY_MEDIA_DURATION_${key}`]);
  const duration =
    Number.isFinite(configuredDuration) && configuredDuration > 0 && configuredDuration <= 43200
      ? configuredDuration
      : 0;
  const captions = process.env[`ACADEMY_CAPTIONS_${key}`] || null;
  const vimeo = parseVimeoUrl(process.env[`ACADEMY_VIMEO_${key}`]);
  if (vimeo)
    return {
      url: vimeoEmbedUrl(vimeo, `lesson-${id}`),
      provider: "vimeo",
      duration,
      durationVerified: false,
      version: version || `vimeo:${vimeo.id}`,
      captions,
      chapters: parseChapters(process.env[`ACADEMY_CHAPTERS_${key}`], duration || Infinity),
    };
  const path = process.env[`ACADEMY_MEDIA_PATH_${key}`];
  const url =
    id === "free-webinar"
      ? process.env[`ACADEMY_MEDIA_${key}`]
      : path
        ? `https://private-media.invalid/${encodeURIComponent(path)}`
        : undefined;
  if (!url || !duration) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return {
      url: u.toString(),
      provider: "file",
      duration,
      durationVerified: true,
      version: version || "1",
      captions,
      chapters: parseChapters(process.env[`ACADEMY_CHAPTERS_${key}`], duration),
    };
  } catch {
    return null;
  }
}
export function lessonContent(id: string): LessonContent | null {
  const meta = LESSONS.find((l) => l.id === id);
  if (!meta) return null;
  const media = slotMedia(id);
  if (meta.kind === "session")
    return {
      id,
      version: "2026-09-06.1",
      paragraphs: [],
      media,
      questions: [],
      workbook: SESSION_WORKBOOK,
    };
  return {
    id,
    version: "2026-09-06.1",
    paragraphs: units[id],
    media,
    questions: checks[id].map((q, i) => ({
      id: `${id}-${i + 1}`,
      prompt: q.prompt,
      choices: q.choices,
    })),
    workbook: [
      {
        id: "problem",
        label: "The business problem",
        hint: "Who is the customer, what is delayed or broken, and how do you know?",
      },
      {
        id: "trigger",
        label: "Trigger and approved inputs",
        hint: "What starts the job? What information and permissions can the agent use?",
      },
      {
        id: "result",
        label: "Expected result and receipt",
        hint: "What should happen, and which record proves it happened?",
      },
      {
        id: "owner",
        label: "Human owner and exception route",
        hint: "Who is accountable? When must the automation stop or ask for help?",
      },
      {
        id: "baseline",
        label: "Baseline and test",
        hint: "Record the current time, error rate or completed outcomes. Describe a normal, duplicate and failure test.",
      },
    ],
  };
}
export function scoreAnswers(id: string, answers: number[]) {
  const items = checks[id] ?? [];
  return {
    score: items.filter((q, i) => q.correct === answers[i]).length,
    total: items.length,
    feedback: items.map((q, i) => ({ correct: answers[i] === q.correct, text: q.feedback })),
  };
}
