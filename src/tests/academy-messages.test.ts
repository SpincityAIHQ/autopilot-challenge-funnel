import { describe, expect, test } from "bun:test";
import { composeLearningMessage, composeWelcomeMessage, type LearningMessageContext } from "../lib/academy-messages";

const base: LearningMessageContext = {
  eventName: "learning_dropoff", assistant: "Thoth",
  lesson: { id: "business-before-ai", title: "Build the business before you automate it", skill: "Diagnose the business" },
  watchedPercent: 32, resumeSeconds: 1440, quizScore: 1, quizTotal: 3,
};
describe("personal learning follow-ups", () => {
  test("drop-off uses saved coverage and resume evidence without calling it mastery", () => {
    const m = composeLearningMessage(base)!;
    expect(m.message_text).toContain("32%");
    expect(m.message_text).toContain("24:00");
    expect(m.message_text).toContain("10 minutes");
    expect(m.message_text).not.toContain("mastered");
    expect(m.action_url).toBe("https://aiautopilotsummit.com/lesson/business-before-ai");
  });
  test("practice explains the actual missed point and does not diagnose from score alone", () => {
    const m = composeLearningMessage({ ...base, eventName: "learning_practice", weakPoints: ["Keep facts and assumptions distinct."] })!;
    expect(m.message_text).toContain("1/3");
    expect(m.message_text).toContain("Keep facts and assumptions distinct.");
    expect(m.message_text).toContain("retake");
    expect(composeLearningMessage({ ...base, eventName: "learning_practice", quizTotal: 0 })).toBeNull();
  });
  test("instructor feedback is attributed and HTML escaped", () => {
    const m = composeLearningMessage({ ...base, eventName: "learning_feedback", reviewerFeedback: 'Define an owner <script>alert("x")</script>' })!;
    expect(m.message_text).toContain("Instructor feedback:");
    expect(m.message_text).toContain("submit it again");
    expect(m.message_html).not.toContain("<script>");
    expect(m.message_html).toContain("&lt;script&gt;");
  });
  test("draft advice names the missing activity field rather than inventing a weakness", () => {
    const m = composeLearningMessage({ ...base, eventName: "learning_stalled", missingActivity: { label: "Human owner and exception route", hint: "Who is accountable?" } })!;
    expect(m.message_text).toContain("Human owner and exception route");
    expect(m.message_text).toContain("Who is accountable?");
    expect(m.message_text).toContain("Add a specific response");
  });
  test("complete drafts are invited to submit, and approval remains instructor approval", () => {
    expect(composeLearningMessage({ ...base, eventName: "learning_stalled" })!.message_text).toContain("submit the sheet");
    const m = composeLearningMessage({ ...base, eventName: "learning_approved", assistant: "AI Spin" })!;
    expect(m.message_text).toContain("AI Spin");
    expect(m.message_text).toContain("Your instructor approved");
    expect(m.message_text).toContain("one normal case");
  });
  test("free welcome does not promise an unconnected recording; paid welcome routes to lessons", () => {
    expect(composeWelcomeMessage(false, "Thoth", false).message_text).toContain("recording is not available yet");
    expect(composeWelcomeMessage(true, "AI Spin", false).action_url).toBe("https://aiautopilotsummit.com/learn");
    expect(composeLearningMessage({ ...base, eventName: "unrecognized_signal" })).toBeNull();
  });
});
