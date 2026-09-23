import { describe, expect, it } from "bun:test";
import { buildAcceleratorPath } from "../lib/accelerator-path";
import type { LessonProgress } from "../lib/academy";

const ALL = ["ga", "vip", "vault", "accelerator"];
const row = (lesson_id: string, o: Partial<LessonProgress> = {}): LessonProgress => ({
  lesson_id, media_version: "1", intervals: [], duration: 0, position: 0,
  quiz_score: null, quiz_total: null, workbook: {}, workbook_status: "draft",
  reviewer_feedback: null, updated_at: new Date().toISOString(), ...o,
});
const done = (id: string) => row(id, { quiz_score: 3, quiz_total: 3, workbook_status: "submitted" });

describe("Accelerator next-step checklist", () => {
  it("starts a new student at the first foundation step with unknown progress left unclaimed", () => {
    const p = buildAcceleratorPath({ grants: ALL, connected: ["free-webinar"], progress: [] });
    expect(p.accessVerified).toBe(true);
    expect(p.next?.lessonId).toBe("free-webinar");
    expect(p.next?.video).toBe("none_recorded");
    expect(p.steps.every((s) => s.status !== "complete")).toBe(true);
  });
  it("sends a student with completed prerequisites to the earliest unmet step", () => {
    const p = buildAcceleratorPath({
      grants: ALL, connected: [],
      progress: ["free-webinar", "business-before-ai", "hire-the-ai-team", "accelerator-2026-09-14"].map(done),
    });
    expect(p.next?.lessonId).toBe("accelerator-2026-09-21");
  });
  it("never treats an unconnected recording as the student's missing work", () => {
    const p = buildAcceleratorPath({ grants: ALL, connected: [], progress: [] });
    const tue = p.steps.find((s) => s.lessonId === "accelerator-2026-09-22")!;
    expect(tue.video).toBe("unavailable");
    expect(tue.action).not.toMatch(/watch the recording/i);
  });
  it("puts an instructor revision first and only reports approval from a review", () => {
    const p = buildAcceleratorPath({
      grants: ALL, connected: [],
      progress: [done("free-webinar"), row("hire-the-ai-team", { workbook_status: "needs_revision" }),
        row("business-before-ai", { quiz_score: 3, quiz_total: 3, workbook_status: "approved" })],
    });
    expect(p.next?.lessonId).toBe("hire-the-ai-team");
    expect(p.steps.find((s) => s.lessonId === "business-before-ai")!.status).toBe("complete");
    expect(p.steps.find((s) => s.lessonId === "free-webinar")!.status).toBe("awaiting_review");
  });
  it("blocks Accelerator steps without access and routes to support; VIP extras stay optional", () => {
    const p = buildAcceleratorPath({ grants: ["ga"], connected: [], progress: [] });
    expect(p.accessVerified).toBe(false);
    const sept21 = p.steps.find((s) => s.lessonId === "accelerator-2026-09-21")!;
    expect(sept21.status).toBe("blocked");
    expect(sept21.action).toContain("support");
    expect(p.supplemental.every((s) => s.optional)).toBe(true);
  });
});
