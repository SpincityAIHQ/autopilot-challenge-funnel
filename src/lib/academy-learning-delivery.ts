import { LESSONS, mergeIntervals, type Interval } from "./academy";

export type DeliveryProgress = {
  workbook_status: string;
  quiz_score: number | null;
  quiz_total: number | null;
  updated_at: string;
  /** Latest recorded activity across all lessons, supplied by the worker. */
  last_learning_activity_at?: string;
  intervals?: Interval[];
  duration?: number;
  position?: number;
  lesson_id?: string;
};

/** A seek-only playhead is not evidence of where the learner actually watched. */
export function learningResumeSeconds(p: DeliveryProgress | null) {
  if (!p || !p.duration || !Number.isFinite(p.duration) || p.duration <= 0) return null;
  const ranges = mergeIntervals(p.intervals ?? [], p.duration);
  if (!ranges.length) return null;
  const position = Number.isFinite(p.position) ? Math.max(0, p.position!) : 0;
  let last = ranges[0][0];
  for (const [a, b] of ranges) {
    if (position < a) return last;
    if (position <= b) return position;
    last = b;
  }
  return last;
}

/** Recheck current evidence immediately before sending; missing evidence fails closed. */
export function learningDeliveryEligible(name: string, p: DeliveryProgress | null) {
  if (!p) return false;
  const lesson = LESSONS.find((l) => l.id === p.lesson_id);
  if (!lesson) return false;
  const elapsed = Date.now() - Date.parse(p.updated_at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return false;
  if (name === "learning_dropoff") {
    if (!p.duration || !Number.isFinite(p.duration) || p.duration <= 0) return false;
    const watched = mergeIntervals(p.intervals ?? [], p.duration).reduce((total, [a, b]) => total + b - a, 0);
    const away = Date.now() - Date.parse(p.last_learning_activity_at ?? p.updated_at);
    return Number.isFinite(away) && watched >= 60 && (watched / p.duration) < 0.9 && away >= 48 * 3600000;
  }
  if (lesson.kind === "session") return false;
  if (name === "learning_feedback") return p.workbook_status === "needs_revision";
  if (name === "learning_approved") return p.workbook_status === "approved";
  if (name === "learning_practice")
    return p.quiz_score !== null && p.quiz_total !== null && p.quiz_total > 0
      && p.quiz_score / p.quiz_total < 0.8 && elapsed >= 2 * 3600000;
  if (name === "learning_stalled")
    return p.workbook_status === "draft" && elapsed >= 3 * 86400000;
  return false;
}
