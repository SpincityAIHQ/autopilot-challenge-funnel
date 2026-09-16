import { describe, expect, it } from "bun:test";
import { LESSONS, tierAllows } from "@/lib/academy";
import { lessonContent, scoreAnswers } from "@/lib/academy-content.server";
import { CLASS_2026_09_14_ID } from "@/lib/academy-class-2026-09-14.server";

const ID = CLASS_2026_09_14_ID;

describe("September 14 Accelerator class", () => {
  it("is in the catalogue as a dated accelerator lesson", () => {
    const meta = LESSONS.find((l) => l.id === ID)!;
    expect(meta).toBeTruthy();
    expect(meta.tier).toBe("accelerator");
    expect(meta.kind).toBe("lesson");
    expect(meta.envKey).toBe("ACCELERATOR_2026_09_14");
    expect(meta.stage).toBe("Accelerator · September 14, 2026");
    expect(meta.title).toBe("CEO Calendar, AI Workflows & Client Outreach");
  });

  it("preserves the existing catalogue entries and numbered day slots", () => {
    for (const id of [
      "free-webinar",
      "business-before-ai",
      "hire-the-ai-team",
      "coordinate-the-business",
      "measure-the-system",
      "own-the-platform",
      "implementation-lab",
    ])
      expect(LESSONS.some((l) => l.id === id)).toBe(true);
    expect(LESSONS.filter((l) => l.kind === "session").length).toBe(12);
    expect(LESSONS.filter((l) => l.kind === "lesson").length).toBe(8);
  });

  it("only opens for Accelerator holders", () => {
    expect(tierAllows(["accelerator"], "accelerator")).toBe(true);
    for (const grants of [[], ["ga"], ["vip"], ["vault"]])
      expect(tierAllows(grants, "accelerator")).toBe(false);
  });

  it("serves five paragraphs, three questions with three choices and five workbook fields", () => {
    const c = lessonContent(ID)!;
    expect(c.version).toBe("2026-09-16.1");
    expect(c.paragraphs.length).toBe(5);
    expect(c.paragraphs[0].heading).toBe("Control the calendar before expanding agents");
    expect(c.questions.length).toBe(3);
    for (const q of c.questions) expect(q.choices.length).toBe(3);
    expect(c.workbook.map((f) => f.id)).toEqual([
      "calendar",
      "workflow",
      "test",
      "prospects",
      "exceptions",
    ]);
  });

  it("states honestly that no recording is attached", () => {
    const c = lessonContent(ID)!;
    expect(c.media).toBeNull();
    expect(c.mediaNotice).toContain("awaiting verification");
    expect(c.mediaNotice).not.toMatch(/uploaded|duration verified/i);
  });

  it("never leaks answer keys, feedback or source links to the client payload", () => {
    const json = JSON.stringify(lessonContent(ID));
    expect(json).not.toContain("correct");
    expect(json).not.toContain("drive.google.com");
    expect(json).not.toContain("docs.google.com");
  });

  it("scores the knowledge check server-side", () => {
    expect(scoreAnswers(ID, [0, 1, 2]).score).toBe(3);
    expect(scoreAnswers(ID, [1, 0, 0]).score).toBe(0);
    const partial = scoreAnswers(ID, [0, 0, 2]);
    expect(partial.score).toBe(2);
    expect(partial.total).toBe(3);
    expect(partial.feedback.length).toBe(3);
  });

  it("leaves the other lessons on their existing version and shared workbook", () => {
    const other = lessonContent("implementation-lab")!;
    expect(other.version).toBe("2026-09-06.1");
    expect(other.workbook.map((f) => f.id)).toEqual([
      "problem",
      "trigger",
      "result",
      "owner",
      "baseline",
    ]);
    expect(other.mediaNotice ?? null).toBeNull();
  });
});
