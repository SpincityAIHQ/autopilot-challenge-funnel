import { describe, expect, it } from "bun:test";
import { LESSONS, tierAllows } from "@/lib/academy";
import { lessonContent, lessonSource, scoreAnswers } from "@/lib/academy-content.server";
import {
  CLASS_2026_09_21_CHECKS,
  CLASS_2026_09_21_ID,
  CLASS_2026_09_22_CHECKS,
  CLASS_2026_09_22_ID,
} from "@/lib/academy-class-2026-09-21.server";

const IDS = [CLASS_2026_09_21_ID, CLASS_2026_09_22_ID];

describe("September 21 and 22 Accelerator classes", () => {
  it("are catalogued as dated Accelerator lessons", () => {
    for (const id of IDS) {
      const meta = LESSONS.find((l) => l.id === id);
      expect(meta).toBeTruthy();
      expect(meta!.tier).toBe("accelerator");
      expect(meta!.kind).toBe("lesson");
      expect(meta!.stage).toContain("2026");
    }
  });

  it("stay closed to Summit tiers and open to Accelerator students", () => {
    for (const id of IDS) {
      const meta = LESSONS.find((l) => l.id === id)!;
      expect(tierAllows(["ga", "vip", "vault"], meta.tier)).toBe(false);
      expect(tierAllows(["accelerator"], meta.tier)).toBe(true);
    }
  });

  it("carry teaching notes, a three question check and a five field activity sheet", () => {
    for (const id of IDS) {
      const c = lessonContent(id)!;
      expect(c.paragraphs.length).toBeGreaterThanOrEqual(4);
      expect(c.questions.length).toBe(3);
      expect(c.workbook.length).toBe(5);
      expect(c.version).toBe("2026-09-23.1");
    }
  });

  it("connects Monday to its own Vimeo slot, leaves Tuesday empty and serves no Drive link", () => {
    const old = process.env.ACADEMY_VIMEO_ACCELERATOR_2026_09_21;
    process.env.ACADEMY_VIMEO_ACCELERATOR_2026_09_21 = "https://vimeo.com/1228940591";
    const monday = lessonContent(CLASS_2026_09_21_ID)!;
    expect(monday.media?.provider).toBe("vimeo");
    expect(JSON.stringify(monday)).toContain("1228940591");
    expect(lessonContent("accelerator-day-03")!.media?.url ?? "").not.toContain("1228940591");
    const tuesday = lessonContent(CLASS_2026_09_22_ID)!;
    expect(tuesday.media).toBeNull();
    expect(tuesday.mediaNotice).toContain("September 21");
    for (const c of [monday, tuesday]) {
      expect(JSON.stringify(c)).not.toContain("drive.google.com");
      expect("replay" in c).toBe(false);
    }
    if (old === undefined) delete process.env.ACADEMY_VIMEO_ACCELERATOR_2026_09_21;
    else process.env.ACADEMY_VIMEO_ACCELERATOR_2026_09_21 = old;
  });

  it("gives the tutor a dated source line for each class, with no participant detail", () => {
    expect(lessonSource(CLASS_2026_09_21_ID)).toContain("September 21, 2026");
    expect(lessonSource(CLASS_2026_09_22_ID)).toContain("September 22, 2026");
    for (const id of IDS)
      expect(lessonSource(id)).toContain("no participant names");
  });

  it("never ships answer keys, feedback or the private notes documents", () => {
    for (const id of IDS) {
      const json = JSON.stringify(lessonContent(id));
      expect(json).not.toContain('"correct"');
      expect(json).not.toContain('"feedback"');
      expect(json).not.toContain("docs.google.com");
    }
  });

  it("scores the knowledge checks on the server", () => {
    const keys: Record<string, { correct: number }[]> = {
      [CLASS_2026_09_21_ID]: CLASS_2026_09_21_CHECKS,
      [CLASS_2026_09_22_ID]: CLASS_2026_09_22_CHECKS,
    };
    for (const id of IDS) {
      const correct = keys[id]!.map((q) => q.correct);
      expect(scoreAnswers(id, correct).score).toBe(3);
      expect(scoreAnswers(id, correct.map((n: number) => (n + 1) % 3)).score).toBeLessThan(3);
    }
  });
});
