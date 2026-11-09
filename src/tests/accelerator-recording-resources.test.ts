import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { LESSONS } from "../lib/academy";
import { lessonContent } from "../lib/academy-content.server";
import { handleAcademyGet, tutorCourseLibrary } from "../lib/academy.server";
import { loadRecordingLessonSource, resolveRecordingCatalogue, type RecordingSourceStore } from "../lib/academy-recording-sources.server";
import { recordingResourceForGrants, recordingTeachingNotes } from "../lib/academy-recording-resources.server";

// All bodies and recording identities below are synthetic, never course content.
const id = "accelerator-2026-11-09";
const meta = LESSONS.find((lesson) => lesson.id === id)!;
const VIDEO = "999999991";
const row = {
  video_id: VIDEO, source_date: "2026-11-09", title: "Synthetic title", stage: "Synthetic stage",
  summary: "Synthetic summary", skill: "Synthetic skill", active: true,
  source_vtt: null, source_sha256: null, cue_count: 0,
  source_note: "Synthetic source metadata; paraphrases, not a transcript.", timing_basis: "source_landmarks",
  notes: [
    ...Array.from({ length: 10 }, (_, i) => ({ heading: `Synthetic ${i + 1}`, text: `Approved synthetic teaching ${i + 1}.` })),
    { heading: "__resource:worksheet", text: "Synthetic downloadable worksheet body." },
    { heading: "__resource:prompts", text: "Synthetic downloadable prompt body." },
  ],
};
const store: RecordingSourceStore = { readRecordingSource: async (videoId) => ({ data: videoId === VIDEO ? row : null, error: null }) };
async function withSlot(run: () => Promise<void>) {
  const key = `ACADEMY_VIMEO_${meta.envKey}`;
  const previous = process.env[key];
  process.env[key] = `https://vimeo.com/${VIDEO}`;
  try { await run(); } finally {
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
}

describe("Private recording resources", () => {
  it("uses the existing private source loader and excludes resource bodies from lesson/tutor teaching", async () => {
    await withSlot(async () => {
      const source = await loadRecordingLessonSource(meta, store);
      const lesson = lessonContent(id, source)!;
      expect(meta.kind).toBe("session");
      expect(lesson.paragraphs.length).toBe(10);
      expect(lesson.resources?.length).toBe(2);
      expect(lesson.questions.length).toBe(0);
      expect(lesson.workbook.length).toBe(0);
      expect(JSON.stringify(lesson)).not.toContain("Synthetic downloadable");
      const [context] = tutorCourseLibrary([meta], new Map([[id, lesson]]), ["accelerator"]);
      expect(context.notes?.length).toBe(10);
      expect(context.source).toBe(row.source_note);
      expect(JSON.stringify(context)).not.toContain("Synthetic downloadable");
      expect(recordingResourceForGrants(meta, source, "prompts", ["accelerator"])?.content).toBe("Synthetic downloadable prompt body.");
    });
  });

  it("denies resource bodies and teaching to free/Summit grants", async () => {
    await withSlot(async () => {
      const source = await loadRecordingLessonSource(meta, store);
      const lesson = lessonContent(id, source)!;
      for (const grants of [[], ["ga"], ["vip"], ["vault"], ["ga", "vip", "vault"]]) {
        expect(recordingResourceForGrants(meta, source, "worksheet", grants)).toBeNull();
        expect(recordingResourceForGrants(meta, source, "prompts", grants)).toBeNull();
        const [context] = tutorCourseLibrary([meta], new Map([[id, lesson]]), grants);
        expect(context.notes).toBeUndefined();
        expect(context.source).toBeUndefined();
      }
    });
  });

  it("fails closed on missing/unconfigured sources and preserves other lesson notes", async () => {
    expect(recordingResourceForGrants(meta, null, "prompts", ["accelerator"])).toBeNull();
    const missing = await loadRecordingLessonSource(meta, { readRecordingSource: async () => ({ data: null, error: null }) });
    expect(missing).toBeNull();
    expect(lessonContent(id, missing)?.resources?.length).toBe(0);
    await withSlot(async () => {
      const source = await loadRecordingLessonSource(meta, store);
      expect(recordingResourceForGrants(meta, source, "unknown", ["accelerator"])).toBeNull();
      const other = { ...meta, id: "unrelated-session" };
      expect(recordingTeachingNotes(other, source).length).toBe(12);
      expect(recordingResourceForGrants(other, source, "prompts", ["accelerator"])).toBeNull();
    });
  });

  it("keeps public catalogue projections free of source/resource bytes and uses private no-store responses", async () => {
    await withSlot(async () => {
      const publicData = JSON.stringify(await resolveRecordingCatalogue([meta], store));
      expect(publicData).not.toContain("Synthetic downloadable");
      expect(publicData).not.toContain("Approved synthetic teaching");
      expect(publicData).not.toContain(VIDEO);
    });
    let status: number | undefined;
    try {
      await handleAcademyGet(new Request(`https://example.test/api/academy/lesson-resource?lessonId=${id}&resourceId=prompts`), "lesson-resource");
    } catch (error) { status = (error as { status: number }).status; }
    expect(status).toBe(401);
    expect(readFileSync("src/routes/api/academy/$.ts", "utf8")).toContain('"Cache-Control": "private, no-store"');
    expect(readFileSync("src/lib/academy.server.ts", "utf8")).toContain("authorized.grants,");
  });
});
