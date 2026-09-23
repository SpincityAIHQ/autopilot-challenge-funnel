import { describe, expect, it } from "vitest";
import { LESSONS, tierAllows } from "@/lib/academy";
import { lessonContent, scoreAnswers } from "@/lib/academy-content.server";
import {
  CLASS_2026_09_21_CHECKS,
  CLASS_2026_09_21_ID,
  CLASS_2026_09_21_REPLAY,
  CLASS_2026_09_22_CHECKS,
  CLASS_2026_09_22_ID,
  CLASS_2026_09_22_REPLAY,
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
      expect(c.questions).toHaveLength(3);
      expect(c.workbook).toHaveLength(5);
      expect(c.version).toBe("2026-09-23.1");
    }
  });

  it("offers the Google Drive recording honestly, with no claimed watch tracking", () => {
    const monday = lessonContent(CLASS_2026_09_21_ID)!;
    expect(monday.media).toBeNull();
    expect(monday.replay?.url).toBe(CLASS_2026_09_21_REPLAY.url);
    expect(monday.mediaNotice).toContain("Google Meet");
    expect(monday.replay?.note).toContain("Watch time is not measured");
    const tuesday = lessonContent(CLASS_2026_09_22_ID)!;
    expect(tuesday.replay?.url).toBe(CLASS_2026_09_22_REPLAY.url);
    expect(tuesday.mediaNotice).toContain("September 21");
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
    const keys = {
      [CLASS_2026_09_21_ID]: CLASS_2026_09_21_CHECKS,
      [CLASS_2026_09_22_ID]: CLASS_2026_09_22_CHECKS,
    };
    for (const id of IDS) {
      const correct = keys[id].map((q) => q.correct);
      expect(scoreAnswers(id, correct).score).toBe(3);
      expect(scoreAnswers(id, correct.map((n) => (n + 1) % 3)).score).toBeLessThan(3);
    }
  });
});
