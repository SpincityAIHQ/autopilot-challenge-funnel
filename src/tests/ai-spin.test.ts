import { describe, it, expect } from "bun:test";
import { accessCode, codeHash } from "../lib/academy-access.server";
import { learningGuidance } from "../lib/academy-guidance";
import { learningDeliveryEligible } from "../lib/academy-integrations.server";
import { avatarSettings } from "../lib/academy-avatar.server";
import type { LessonProgress } from "../lib/academy";
const p: LessonProgress = {
  lesson_id: "free-webinar",
  media_version: "1",
  intervals: [[0, 100]],
  duration: 100,
  position: 100,
  quiz_score: 1,
  quiz_total: 3,
  workbook: {},
  workbook_status: "draft",
  reviewer_feedback: null,
  updated_at: new Date().toISOString(),
};
describe("AI Spin access and learning evidence", () => {
  it("derives a private 128-bit code reproducibly and changes it across generations", () => {
    const a = accessCode("code-1", "generation-1", "a".repeat(32));
    expect(a).toMatch(/^SPIN-[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/);
    expect(accessCode("code-1", "generation-1", "a".repeat(32))).toBe(a);
    expect(accessCode("code-1", "generation-2", "a".repeat(32))).not.toBe(a);
    expect(codeHash(a.toLowerCase().replaceAll("-", " "))).toBe(codeHash(a));
    expect(() => codeHash("123456")).toThrow();
  });
  it("rejects code generation without a managed secret", () => {
    expect(() => accessCode("a", "b", "")).toThrow();
  });
  it("does not equate finished viewing with understanding or applied mastery", () => {
    expect(learningGuidance([p])?.kind).toBe("quiz_practice");
    expect(learningGuidance([{ ...p, quiz_score: null, quiz_total: null }])).toBeNull();
  });
  it("prioritizes instructor revision and reports approval only from a review", () => {
    expect(learningGuidance([{ ...p, workbook_status: "needs_revision" }])?.kind).toBe(
      "needs_revision",
    );
    expect(learningGuidance([{ ...p, quiz_score: 3, workbook_status: "approved" }])?.kind).toBe(
      "approved",
    );
  });
  it("cancels stale coaching messages after the learner improves", () => {
    const waiting = { ...p, updated_at: new Date(Date.now() - 3 * 3600000).toISOString() };
    expect(learningDeliveryEligible("learning_practice", p)).toBe(false);
    expect(learningDeliveryEligible("learning_practice", waiting)).toBe(true);
    expect(learningDeliveryEligible("learning_practice", { ...waiting, quiz_score: 3 })).toBe(false);
    expect(
      learningDeliveryEligible("learning_feedback", { ...p, workbook_status: "approved" }),
    ).toBe(false);
    expect(learningDeliveryEligible("learning_stalled", p)).toBe(false);
  });
  it("keeps live avatar disabled without its actual connection and bounds configured duration", () => {
    const old = process.env.ACADEMY_AVATAR_SESSION_SECONDS;
    process.env.ACADEMY_AVATAR_SESSION_SECONDS = "999999";
    expect(avatarSettings().sessionSeconds).toBe(1200);
    if (old === undefined) delete process.env.ACADEMY_AVATAR_SESSION_SECONDS;
    else process.env.ACADEMY_AVATAR_SESSION_SECONDS = old;
  });
});
