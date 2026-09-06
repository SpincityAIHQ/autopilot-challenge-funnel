import {
  LESSONS,
  coverage,
  formatTime,
  lessonHref,
  watchSummary,
  type LessonProgress,
} from "./academy";
export type LearningGuidance = {
  kind: string;
  lessonId: string;
  title: string;
  message: string;
  href: string;
};
/**
 * Rule-based next step from saved evidence. Instructor revision first, then a
 * weak knowledge check, then approval, then application, then unfinished
 * viewing. No predictive mastery score is invented.
 */
export function learningGuidance(progress: LessonProgress[]): LearningGuidance | null {
  const ordered = [...progress].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  for (const kind of ["needs_revision", "quiz_practice", "approved", "apply", "continue"])
    for (const p of ordered) {
      const l = LESSONS.find((l) => l.id === p.lesson_id);
      if (!l) continue;
      const base = { kind, lessonId: l.id, href: lessonHref(l.id) };
      if (l.kind === "lesson") {
        if (kind === "needs_revision" && p.workbook_status === "needs_revision")
          return {
            ...base,
            title: "Use your instructor’s feedback",
            message: `Your ${l.skill.toLowerCase()} activity needs a revision. Open the feedback and improve one part at a time.`,
          };
        if (
          kind === "quiz_practice" &&
          p.quiz_score !== null &&
          p.quiz_total &&
          p.quiz_score / p.quiz_total < 0.8
        )
          return {
            ...base,
            title: "Let’s work through the idea again",
            message: `Your latest check was ${p.quiz_score}/${p.quiz_total}. Ask your guide for a smaller example, then try the check again. This score is a practice signal.`,
          };
        if (kind === "approved" && p.workbook_status === "approved")
          return {
            ...base,
            title: "Your applied work was reviewed",
            message: `An instructor approved your ${l.skill.toLowerCase()} activity. Keep the evidence and use it in your next build.`,
          };
        if (
          kind === "apply" &&
          p.quiz_score !== null &&
          p.quiz_total &&
          p.quiz_score / p.quiz_total >= 0.8 &&
          p.workbook_status === "draft"
        )
          return {
            ...base,
            title: "Turn the idea into a business example",
            message:
              "You have completed this knowledge check. Add a real workflow to your activity sheet and submit it for review.",
          };
      }
      if (
        kind === "continue" &&
        p.duration > 0 &&
        coverage(p.intervals, p.duration) > 0 &&
        coverage(p.intervals, p.duration) < 90
      ) {
        const w = watchSummary(p);
        return {
          ...base,
          title: "Pick up where you left off",
          message: `You stopped ${l.title} at ${formatTime(w.dropOffAt ?? w.furthest)} with ${w.coverage}% watched. Continue from there, then check your understanding.`,
        };
      }
    }
  return null;
}
export function learningStats(progress: LessonProgress[]) {
  return {
    lessonsStarted: progress.length,
    checksCompleted: progress.filter((p) => p.quiz_score !== null).length,
    workSubmitted: progress.filter((p) => p.workbook_status === "submitted").length,
    workApproved: progress.filter((p) => p.workbook_status === "approved").length,
    minutesWatched: progress.reduce((n, p) => n + watchSummary(p).minutesWatched, 0),
  };
}
