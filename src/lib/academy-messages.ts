import { formatTime, type LessonMeta } from "./academy";

export type LearningMessageContext = {
  eventName: string;
  assistant: "Thoth" | "AI Spin";
  lesson: Pick<LessonMeta, "id" | "title" | "skill">;
  watchedPercent: number;
  resumeSeconds: number | null;
  quizScore: number | null;
  quizTotal: number | null;
  weakPoints?: string[];
  reviewerFeedback?: string | null;
  interventionReason?: string;
  milestoneLabel?: string | null;
  missingActivity?: { label: string; hint: string } | null;
};
export type AcademyMessage = {
  message_version: "academy-followup-2026-09-09.1";
  message_subject: string;
  message_text: string;
  message_html: string;
  sms_text: string;
  action_label: string;
  action_url: string;
};
function clean(value: string, limit: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
function html(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
function message(
  subject: string,
  paragraphs: string[],
  action: string,
  url: string,
  sms: string,
  transactional = false,
): AcademyMessage {
  const footer = transactional
    ? "This email confirms your AI AutoPilot account or access. Optional learning and promotional emails follow your separate preferences."
    : "Turn off optional emails from your learning dashboard: https://aiautopilotsummit.com/learn";
  return {
    message_version: "academy-followup-2026-09-09.1",
    message_subject: clean(subject, 180),
    message_text: [...paragraphs, `${action}: ${url}`, footer].join("\n\n"),
    message_html:
      paragraphs.map((p) => `<p>${html(p)}</p>`).join("") +
      `<p><a href="${html(url)}">${html(action)}</a></p><p>${html(footer)}</p>`,
    sms_text: `${clean(sms, 320)} ${url}`,
    action_label: action,
    action_url: url,
  };
}

/** Uses observed learning evidence and authored guidance, without inventing an AI assessment. */
export function composeLearningMessage(c: LearningMessageContext): AcademyMessage | null {
  const title = clean(c.lesson.title, 140);
  const url = `https://aiautopilotsummit.com${c.lesson.id === "free-webinar" ? "/class" : `/lesson/${encodeURIComponent(c.lesson.id)}`}`;
  const intro = `This is ${c.assistant}, your AI learning guide in AI AutoPilot.`;
  let subject: string, evidence: string, action: string, next: string, sms: string;
  switch (c.eventName) {
    case "learning_dropoff": {
      const coverage = Math.round(Math.min(100, Math.max(0, c.watchedPercent)));
      const time =
        c.resumeSeconds !== null && Number.isFinite(c.resumeSeconds) && c.resumeSeconds >= 0
          ? formatTime(c.resumeSeconds)
          : null;
      subject = `Your next 10 minutes in ${title}`;
      const checkpoint =
        c.interventionReason === "break_not_returned_48h" && c.milestoneLabel
          ? ` Your saved viewing ends near “${clean(c.milestoneLabel, 100)}.”`
          : c.interventionReason === "early_exit_48h"
            ? " Your saved viewing ends within the first hour of the recording."
            : "";
      evidence = `Your saved viewing progress for “${title}” is ${coverage}%.${time ? ` Your saved place is ${time}.` : ""}${checkpoint} No newer learning activity is saved in your account for at least 48 hours.`;
      next = `Open the lesson${time ? ` and continue around ${time}` : ""}. Take 10 minutes, then name one idea you can apply. If something is unclear, ask ${c.assistant} about that part inside the lesson.`;
      action = "Continue your lesson";
      sms = `${c.assistant}: “${title}” is ${coverage}% watched.${time ? ` Continue around ${time}.` : ""} Take the next 10 minutes when you’re ready.`;
      break;
    }
    case "learning_practice": {
      if (c.quizScore === null || !c.quizTotal || c.quizTotal < 1) return null;
      const weak = (c.weakPoints ?? [])
        .map((x) => clean(x, 360))
        .filter(Boolean)
        .slice(0, 2);
      subject = `One useful practice step for ${title}`;
      evidence = `Your latest saved knowledge check for “${title}” is ${c.quizScore}/${c.quizTotal}. This is a practice signal, not a judgment of your ability.`;
      next = weak.length
        ? `Focus on this before your next attempt: ${weak.join(" ")} Then explain it using your own business and retake the check.`
        : `Revisit the lesson notes for “${clean(c.lesson.skill, 100)},” explain the idea using your own business, then retake the check. Ask ${c.assistant} for a smaller example if you get stuck.`;
      action = "Practice and try again";
      sms = `${c.assistant}: Your “${title}” check is ${c.quizScore}/${c.quizTotal}. ${weak[0] ?? "Review one idea, explain it in your own business, then try again."}`;
      break;
    }
    case "learning_feedback": {
      subject = `Your next revision in ${title}`;
      evidence = `Your instructor requested a revision to your activity sheet for “${title}.”`;
      const feedback = clean(c.reviewerFeedback ?? "", 600);
      next = feedback
        ? `Instructor feedback: “${feedback}” Update the relevant section, then submit it again. You can ask ${c.assistant} to help you work through the feedback.`
        : `Open your activity sheet, read your instructor’s feedback, and revise the relevant section before submitting it again.`;
      action = "Open feedback and revise";
      sms = `${c.assistant}: Your instructor left revision feedback on “${title}.” Open your activity sheet, make the next change, and resubmit.`;
      break;
    }
    case "learning_approved":
      subject = `Your applied work was approved: ${title}`;
      evidence = `Your instructor approved your activity sheet for “${title}.” That is a completed piece of applied work to build on.`;
      next = `Choose one normal case from your activity sheet, run the workflow, and keep the result as evidence. Ask ${c.assistant} to help plan a small test if you need a next step.`;
      action = "Build on your approved work";
      sms = `${c.assistant}: Your instructor approved “${title}.” Next, run one normal case from your activity sheet and keep the result.`;
      break;
    case "learning_stalled":
      subject = `One small step to finish ${title}`;
      evidence = `Your activity sheet for “${title}” is still saved as a draft.`;
      next = c.missingActivity
        ? `Start with “${clean(c.missingActivity.label, 100)}”: ${clean(c.missingActivity.hint, 260)} Add a specific response, then save it. You can do the next section later.`
        : "Your activity fields have saved responses. Review your answers and submit the sheet when you are ready for instructor feedback.";
      action = c.missingActivity ? "Continue your activity sheet" : "Review and submit your work";
      sms = `${c.assistant}: Your “${title}” activity is saved. ${c.missingActivity ? `Next, complete “${clean(c.missingActivity.label, 80)}.”` : "Review the answers and submit when ready."}`;
      break;
    default:
      return null;
  }
  return message(subject, [intro, evidence, next], action, url, sms);
}

export function composeWelcomeMessage(
  paid: boolean,
  assistant: "Thoth" | "AI Spin",
  freeVideoReady: boolean,
) {
  return message(
    paid
      ? "Your AI AutoPilot learning space is ready"
      : "Your AI AutoPilot learning account is ready",
    [
      paid
        ? "Your lesson access is matched to this account. Open your dashboard to see the lessons included in your ticket."
        : freeVideoReady
          ? "Your free training is ready. Start with one business bottleneck you want to solve."
          : "Your account is ready. You can explore the introductory lesson notes and activity sheet; the free training recording is not available yet.",
      `Welcome to the SPINXP.ai learning experience behind AI AutoPilot. ${assistant} is your AI guide inside the platform. Your saved viewing progress, knowledge checks and activity responses give your guide context for the lesson you are working on.`,
      "Before you begin, choose one repeated task or business bottleneck you want to improve. Keep that real example beside you as you work through the training.",
      freeVideoReady || paid
        ? "Watch a short section while signed in, then ask your guide about anything unclear. Use the knowledge check to test your understanding and the activity sheet to apply one idea. Save your work and use your dashboard to continue later."
        : "While the free recording is being prepared, read the introductory notes, ask your guide about anything unclear, and use the activity sheet to map your business example. Save your work so you can build on it when the recording is available.",
      "Learning reminders and promotional emails are optional; turn them off from My account at https://aiautopilotsummit.com/learn. Text messages require separate permission; reply STOP to opt out. Keep passwords, customer details and confidential business information out of chats and activity responses.",
    ],
    paid ? "Open your lessons" : "Open your learning space",
    `https://aiautopilotsummit.com${paid ? "/learn" : "/class"}`,
    `${assistant}: Your AI AutoPilot account is ready. Open your learning space and take the first small step.`,
    true,
  );
}

export function composeWebinarReminder() {
  return message(
    "Your first AI AutoPilot step is waiting",
    [
      "You registered for the free training and have not started the recording in this account yet.",
      "Set aside 10 minutes. Name one repeated business task you would like to improve, then open the training. Thoth can help you turn that idea into a clear first step.",
    ],
    "Start your free training",
    "https://aiautopilotsummit.com/class",
    "Thoth: Your free AI AutoPilot training is waiting. Bring one repeated business task and start with 10 minutes.",
  );
}

export function composeAccessActivatedMessage(tier: string, accessUntil: string) {
  const names: Record<string, string> = {
    ga: "General Admission",
    vip: "VIP",
    vault: "Emerald / Vault",
    accelerator: "Accelerator",
  };
  const label = names[tier] ?? "Course";
  return message(
    `Your ${label} access is activated`,
    [
      `Your access code has been redeemed and your ${label} lessons are unlocked for this account.`,
      `Your current access ends at ${new Date(accessUntil).toISOString()}. Your dashboard shows your available lessons and saved progress.`,
    ],
    "Open your lessons",
    "https://aiautopilotsummit.com/learn",
    `AI AutoPilot: Your ${label} access is activated. Your lessons are ready.`,
    true,
  );
}

export function composeAccessCodeMessage(tier: string, code: string, expiresAt: string) {
  const names: Record<string, string> = {
    ga: "General Admission",
    vip: "VIP",
    vault: "Emerald / Vault",
    accelerator: "Accelerator",
  };
  const label = names[tier] ?? "Course";
  return message(
    `Your ${label} purchase: activate your access`,
    [
      `Your ${label} purchase is verified. Sign in or create your account using this purchase email, then enter your access code.`,
      `Your access code: ${code}`,
      `Redeem this code before ${new Date(expiresAt).toISOString()}. Your course access period starts when you redeem it.`,
    ],
    "Activate your access",
    "https://aiautopilotsummit.com/redeem",
    `AI AutoPilot: Your ${label} purchase is verified. Access code: ${code}. Sign in with your purchase email to activate.`,
    true,
  );
}

/**
 * Transactional purchase confirmation. The ticket activates by email match, so
 * the one instruction is: use this exact email on the account.
 */
export function composePurchaseConfirmedMessage(tier: string, hasAccount: boolean, email: string) {
  const names: Record<string, string> = {
    ga: "General Admission",
    vip: "Summit + VIP",
    vault: "Emerald Vault Key",
    accelerator: "Autopilot Accelerator",
  };
  const label = names[tier] ?? "Summit";
  const guide = tier === "accelerator" ? "AI Spin" : "Thoth";
  return message(
    `Your ${label} ticket is ready`,
    [
      `Your ${label} purchase is confirmed. Your ticket is matched to ${email}.`,
      hasAccount
        ? `Sign in with that email and your ${label} lessons unlock on your dashboard automatically.`
        : `Create your free account with that exact email, confirm it from the confirmation email, and your ${label} lessons unlock automatically. No code to enter.`,
      `${guide} is your guide inside: every recording, every timed word, your watch map and your activity sheet.`,
    ],
    hasAccount ? "Open your lessons" : "Create your account",
    `https://aiautopilotsummit.com${hasAccount ? "/learn" : "/join"}`,
    `AI AutoPilot: Your ${label} ticket is ready. ${hasAccount ? "Sign in" : "Create your account"} with ${email} and your lessons unlock automatically.`,
    true,
  );
}
