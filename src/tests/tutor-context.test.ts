import { describe, expect, it } from "bun:test";
import { currentMediaProgress, tutorConversation, missedQuizTopics } from "../lib/academy-tutor-context";
import type { LessonProgress } from "../lib/academy";

const progress: LessonProgress = {
  lesson_id: "design-the-agent", media_version: "vimeo:old", intervals: [[0, 600]],
  duration: 1200, position: 600, quiz_score: 1, quiz_total: 3,
  workbook: { problem: "Our bike shop misses repair appointment requests." },
  workbook_status: "needs_revision", reviewer_feedback: "Name the owner for missed requests.",
  updated_at: "2026-09-09T00:00:00Z",
};

describe("Tutor evidence and conversation", () => {
  it("forgets the old recording's watch map while retaining the student's applied work", () => {
    const current = currentMediaProgress(progress, "vimeo:new");
    expect(current.intervals).toEqual([]);
    expect(current.position).toBe(0);
    expect(current.duration).toBe(0);
    expect(current.workbook).toEqual(progress.workbook);
    expect(current.quiz_score).toBe(1);
    expect(current.reviewer_feedback).toBe(progress.reviewer_feedback);
    expect(progress.position).toBe(600);
  });
  it("preserves valid watch evidence and clears it when a recording is disconnected", () => {
    expect(currentMediaProgress(progress, "vimeo:old")).toEqual(progress);
    expect(currentMediaProgress(progress, null).intervals).toEqual([]);
  });
  it("remembers the business example without including another user or locked lesson", () => {
    const rows = [
      { user_id: "student-a", lesson_id: "current", question: "I run a bike shop.", answer: "Which request is delayed?", created_at: "2026-09-09T00:00:00Z" },
      { user_id: "student-b", lesson_id: "current", question: "Private other customer.", answer: "Private reply.", created_at: "2026-09-09T00:01:00Z" },
      { user_id: "student-a", lesson_id: "locked", question: "Paid lesson detail.", answer: "Paid answer.", created_at: "2026-09-09T00:02:00Z" },
    ];
    expect(tutorConversation(rows, "student-a", "current")).toEqual([
      { at: "2026-09-09T00:00:00Z", question: "I run a bike shop.", answer: "Which request is delayed?" },
    ]);
  });
  it("identifies only missed concepts and includes no answer key", () => {
    const topics = missedQuizTopics([{prompt: "Choose an owner"}, {prompt: "Define the trigger"}], [
      {correct: true, text: "An owner is responsible."},
      {correct: false, text: "A trigger is the event that starts the job."},
    ]);
    expect(topics).toEqual([{question: "Define the trigger", practice: "A trigger is the event that starts the job."}]);
  });
  it("keeps six recent turns in conversation order and bounds model input", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({
      user_id: "student", lesson_id: "current", question: `${i}`.repeat(1600),
      answer: "A".repeat(3000), created_at: `2026-09-09T00:0${i}:00Z`,
    }));
    const result = tutorConversation(rows, "student", "current");
    expect(result).toHaveLength(6);
    expect(result[0].at).toBe("2026-09-09T00:03:00Z");
    expect(result[5].at).toBe("2026-09-09T00:08:00Z");
    expect(result.every((r) => r.question.length <= 1500 && r.answer.length <= 2500)).toBe(true);
  });
});
