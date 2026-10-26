import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { LESSONS, tierAllows } from "../lib/academy";
import { lessonContent } from "../lib/academy-content.server";
import { configuredVimeo } from "../lib/academy-media.server";
import { loadRecordingLessonSource, loadRecordingTranscriptSource, resolveRecordingCatalogue, type RecordingSourceStore } from "../lib/academy-recording-sources.server";
import { tutorCourseLibrary } from "../lib/academy.server";

// Synthetic notes only: the real deidentified notes live in the private database.
const meta = LESSONS.find((l) => l.id === "accelerator-2026-10-26")!;
const VIDEO = "1239650251";
const row = {
  video_id: VIDEO, source_date: "2026-10-26", title: meta?.title, stage: meta?.stage,
  summary: meta?.summary, skill: meta?.skill, active: true,
  source_vtt: null, source_sha256: null, cue_count: 0,
  source_note: "Synthetic attributed teaching notes; not a transcript.",
  timing_basis: "source_landmarks",
  notes: Array.from({ length: 14 }, (_, n) => ({ heading: `Synthetic ${n + 1}`, text: "Synthetic note body." })),
};
const store = (): RecordingSourceStore => ({ readRecordingSource: async (id) => ({ data: id === VIDEO ? row : null, error: null }) });
function withEnv<T>(run: () => Promise<T>) {
  const key = `ACADEMY_VIMEO_${meta.envKey}`;
  const prev = process.env[key];
  process.env[key] = `https://vimeo.com/${VIDEO}`;
  return run().finally(() => { if (prev === undefined) delete process.env[key]; else process.env[key] = prev; });
}

describe("October 26 Accelerator class", () => {
  it("is a distinct dated accelerator session with the requested copy", () => {
    expect(meta.title).toBe("ICP, Search Intent and Governed AI Employees");
    expect(meta.stage).toBe("Accelerator · Monday, October 26, 2026");
    expect(meta.skill).toBe("Design a source-grounded, reviewable content workflow");
    expect(meta.tier).toBe("accelerator");
    expect(meta.kind).toBe("session");
    expect(meta.envKey).toBe("ACCELERATOR_2026_10_26");
    expect(LESSONS.filter((l) => l.id === meta.id).length).toBe(1);
    for (const tiers of [[], ["ga"], ["vip"], ["vault"], ["ga", "vip", "vault"]] as const) expect(tierAllows([...tiers], meta.tier)).toBe(false);
    expect(tierAllows(["accelerator"], meta.tier)).toBe(true);
  });
  it("is listed on the Accelerator page and the video id stays out of client code", () => {
    const page = readFileSync("src/routes/accelerator.tsx", "utf8");
    expect(page).toContain('"accelerator-2026-10-26"');
    for (const f of ["src/routes/accelerator.tsx", "src/lib/academy.ts"]) expect(readFileSync(f, "utf8")).not.toContain(VIDEO);
    expect(readFileSync(".env", "utf8")).toContain(`ACADEMY_VIMEO_ACCELERATOR_2026_10_26=https://vimeo.com/${VIDEO}`);
  });
  it("resolves the configured Vimeo identity server-side", async () => {
    await withEnv(async () => { expect(JSON.stringify(configuredVimeo(meta.envKey))).toContain(VIDEO); });
  });
  it("loads the 14 notes-only rows for the lesson and AI Spin without inventing cues", async () => {
    await withEnv(async () => {
      const source = await loadRecordingLessonSource(meta, store());
      expect(source?.notes.length).toBe(14);
      expect(source?.cues).toBeNull();
      expect(await loadRecordingTranscriptSource(meta, store())).toBeNull();
      const lesson = lessonContent(meta.id, source)!;
      expect(lesson.transcript).toBeUndefined();
      const lib = tutorCourseLibrary([meta], new Map([[meta.id, lesson]]), ["accelerator"]);
      expect(lib[0].notes.length).toBe(14);
      const denied = tutorCourseLibrary([meta], new Map([[meta.id, lesson]]), ["ga", "vip", "vault"]);
      expect(JSON.stringify(denied)).not.toContain("Synthetic note body.");
    });
  });
  it("public catalogue projection never contains notes or the video id", async () => {
    await withEnv(async () => {
      const json = JSON.stringify(await resolveRecordingCatalogue([meta], store()));
      expect(json).not.toContain("Synthetic note body.");
      expect(json).not.toContain(VIDEO);
    });
  });
});
