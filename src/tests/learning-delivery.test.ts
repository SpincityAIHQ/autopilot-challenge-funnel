import { describe, expect, test } from "bun:test";
import { learningDeliveryEligible, learningResumeSeconds, type DeliveryProgress } from "../lib/academy-learning-delivery";

const at = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
function progress(overrides: Partial<DeliveryProgress> = {}): DeliveryProgress {
  return { lesson_id: "business-before-ai", workbook_status: "draft", quiz_score: null,
    quiz_total: null, updated_at: at(49), duration: 1000, position: 200,
    intervals: [[0, 200]], ...overrides };
}

describe("student follow-up eligibility", () => {
  test("replay follow-up uses actual watch coverage and waits two days", () => {
    expect(learningDeliveryEligible("learning_dropoff", progress())).toBe(true);
    expect(learningDeliveryEligible("learning_dropoff", progress({ updated_at: at(47 + 59 / 60) }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ intervals: [], position: 900 }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ intervals: [[0, 950]] }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ duration: 0 }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ duration: 27111, intervals: [[0,300]], updated_at: at(48) }))).toBe(true);
    expect(learningDeliveryEligible("learning_dropoff", progress({ intervals: [[0,59]] }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ last_learning_activity_at: at(1) }))).toBe(false);
  });
  test("a new low quiz attempt receives breathing room and a pass cancels practice", () => {
    expect(learningDeliveryEligible("learning_practice", progress({ quiz_score: 1, quiz_total: 3 }))).toBe(true);
    expect(learningDeliveryEligible("learning_practice", progress({ quiz_score: 1, quiz_total: 3, updated_at: at(1) }))).toBe(false);
    expect(learningDeliveryEligible("learning_practice", progress({ quiz_score: 3, quiz_total: 3 }))).toBe(false);
  });
  test("review reminders follow the current submission status", () => {
    expect(learningDeliveryEligible("learning_feedback", progress({ workbook_status: "needs_revision" }))).toBe(true);
    expect(learningDeliveryEligible("learning_feedback", progress({ workbook_status: "submitted" }))).toBe(false);
    expect(learningDeliveryEligible("learning_approved", progress({ workbook_status: "approved" }))).toBe(true);
    expect(learningDeliveryEligible("learning_stalled", progress({ updated_at: at(73) }))).toBe(true);
    expect(learningDeliveryEligible("learning_stalled", progress({ updated_at: at(73), workbook_status: "submitted" }))).toBe(false);
  });
  test("session replays never receive invented workbook or quiz tasks", () => {
    const p = progress({ lesson_id: "accelerator-day-01", updated_at: at(100), quiz_score: 1, quiz_total: 3 });
    expect(learningDeliveryEligible("learning_dropoff", p)).toBe(true);
    for (const signal of ["learning_stalled", "learning_feedback", "learning_approved", "learning_practice"])
      expect(learningDeliveryEligible(signal, p)).toBe(false);
  });
  test("missing lesson, evidence, invalid timestamps and future evidence fail closed", () => {
    expect(learningDeliveryEligible("learning_dropoff", null)).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ lesson_id: "unknown" }))).toBe(false);
    expect(learningDeliveryEligible("learning_feedback", progress({ updated_at: "invalid", workbook_status: "needs_revision" }))).toBe(false);
    expect(learningDeliveryEligible("learning_dropoff", progress({ updated_at: at(-1) }))).toBe(false);
  });
  test("resume point stays within real viewed evidence even after a seek", () => {
    expect(learningResumeSeconds(progress({ position: 900 }))).toBe(200);
    expect(learningResumeSeconds(progress({ position: 150 }))).toBe(150);
    expect(learningResumeSeconds(progress({ intervals: [[0, 50], [200, 250]], position: 100 }))).toBe(50);
    expect(learningResumeSeconds(progress({ intervals: [], position: 900 }))).toBeNull();
  });
});
