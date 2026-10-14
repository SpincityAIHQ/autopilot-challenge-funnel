import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { LESSONS, tierAllows, type LessonMeta } from "../lib/academy";
import { lessonContent } from "../lib/academy-content.server";
import {
  loadRecordingLessonSource,
  loadRecordingTranscriptSource,
  resolveRecordingCatalogue,
  resolveRecordingLessonMeta,
  type RecordingSourceProjection,
  type RecordingSourceStore,
} from "../lib/academy-recording-sources.server";
import { loadTranscriptWithSource, type TranscriptStore } from "../lib/academy-transcript.server";
import { tutorCourseLibrary, SPIN_SYSTEM_PROMPT } from "../lib/academy.server";

// Synthetic fixtures: no paid class notes or transcripts belong in the repository.
const videoId = "999999991";
const text = "WEBVTT\n\n00:12:00.000 --> 00:12:10.000\n[Presentation audio/replay] A fictional workflow demonstration.\n";
const row = {
  video_id: videoId,
  source_date: "2026-10-01",
  title: "Example recording topic",
  stage: "Accelerator · October 1, 2026",
  summary: "A fictional verified recording summary.",
  skill: "Apply an example workflow",
  active: true,
  source_vtt: text,
  source_sha256: createHash("sha256").update(text).digest("hex"),
  cue_count: 1,
  source_note: "Example presentation segment, followed by live questions. The source clock is not verified playback timing.",
  timing_basis: "source_landmarks",
  notes: Array.from({ length: 7 }, (_, n) => ({ heading: `Example ${n + 1}`, text: "Private example teaching note." })),
};
const class06 = LESSONS.find((lesson) => lesson.id === "accelerator-class-06")!;
const class09 = LESSONS.find((lesson) => lesson.id === "accelerator-class-09")!;
const class01 = LESSONS.find((lesson) => lesson.id === "accelerator-day-01")!;
const notesOnlyRow = {
  ...row,
  source_date: "2026-09-07",
  title: "Example launch planning topic",
  stage: "Accelerator · September 7, 2026",
  source_vtt: null,
  source_sha256: null,
  cue_count: 0,
  source_note: "Approved untimed class notes are connected. The spoken transcript file is missing; these notes are not a transcript.",
};

async function withVideo<T>(meta: LessonMeta, id: string, run: () => Promise<T>) {
  const key = `ACADEMY_VIMEO_${meta.envKey}`;
  const previous = process.env[key];
  process.env[key] = `https://vimeo.com/${id}`;
  try { return await run(); }
  finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}
function recordingStore(value: unknown = row) {
  const calls: { videoId: string; projection: RecordingSourceProjection }[] = [];
  const store: RecordingSourceStore = {
    readRecordingSource: async (id, projection) => {
      calls.push({ videoId: id, projection });
      return { data: value, error: null };
    },
  };
  return { store, calls };
}
function transcriptStore(recording: unknown = row, privateRow: unknown = null): TranscriptStore {
  return {
    ...recordingStore(recording).store,
    readPrivateTranscript: async () => ({ data: privateRow, error: null }),
    storage: { from: () => ({ download: async () => ({ data: null, error: true }) }) },
  };
}

describe("Verified recording identity and catalogue projection", () => {
  it("uses the actual video identity in any numbered slot and preserves access/media identifiers", async () => {
    for (const meta of [class06, class09]) {
      await withVideo(meta, videoId, async () => {
        const resolved = await resolveRecordingLessonMeta(meta, recordingStore().store);
        expect(resolved.title).toBe(row.title);
        expect(resolved.stage).toBe(row.stage);
        expect(resolved.id).toBe(meta.id);
        expect(resolved.envKey).toBe(meta.envKey);
        expect(resolved.kind).toBe(meta.kind);
        expect(resolved.tier).toBe("accelerator");
        expect(tierAllows(["vip", "vault"], resolved.tier)).toBe(false);
      });
    }
  });
  it("requests only metadata for the public catalogue and leaks no source or paid notes", async () => {
    await withVideo(class06, videoId, async () => {
      const { store, calls } = recordingStore();
      const catalogue = await resolveRecordingCatalogue([class06], store);
      expect(calls).toEqual([{ videoId, projection: "metadata" }]);
      const publicJson = JSON.stringify(catalogue);
      for (const privateValue of [row.source_vtt, row.source_sha256, row.source_note, row.notes[0].text, videoId]) {
        expect(publicJson).not.toContain(privateValue);
      }
    });
  });
  it("keeps unknown videos generic and never maps non-Accelerator content to a paid source", async () => {
    await withVideo(class09, "999999992", async () => {
      expect(await resolveRecordingLessonMeta(class09, recordingStore().store)).toEqual(class09);
      expect(await loadRecordingLessonSource(class09, recordingStore().store)).toBeNull();
    });
    const summit = LESSONS.find((lesson) => lesson.id === "business-before-ai")!;
    await withVideo(summit, videoId, async () => {
      const { store, calls } = recordingStore();
      expect(await resolveRecordingLessonMeta(summit, store)).toEqual(summit);
      expect(await loadRecordingLessonSource(summit, store)).toBeNull();
      expect(calls).toEqual([]);
    });
  });
  it("gracefully preserves old behavior when the new private table is unavailable", async () => {
    await withVideo(class06, videoId, async () => {
      const store: RecordingSourceStore = { readRecordingSource: async () => ({ data: null, error: { code: "42P01" } }) };
      expect(await resolveRecordingLessonMeta(class06, store)).toEqual(class06);
      expect(await loadRecordingLessonSource(class06, store)).toBeNull();
    });
  });
});

describe("Private teaching source validation", () => {
  it("loads approved notes-only classes without claiming a spoken transcript or source-clock timing", async () => {
    await withVideo(class01, videoId, async () => {
      const store = recordingStore(notesOnlyRow).store;
      const resolved = await resolveRecordingLessonMeta(class01, store);
      expect(resolved.title).toBe(notesOnlyRow.title);
      expect(resolved.stage).toBe(notesOnlyRow.stage);
      const source = await loadRecordingLessonSource(class01, store);
      expect(source?.notes).toEqual(notesOnlyRow.notes);
      expect(source?.cues).toBeNull();
      expect(source?.timing).toBe("media");
      expect(await loadRecordingTranscriptSource(class01, store)).toBeNull();
      const lesson = lessonContent(class01.id, source)!;
      expect(lesson.sourceNote).toBe(notesOnlyRow.source_note);
      expect(lesson.transcriptTiming).toBe("media");
      expect(lesson.transcript).toBeUndefined();
      const library = tutorCourseLibrary([resolved], new Map([[class01.id, lesson]]), ["accelerator"]);
      expect(library[0].notes).toEqual(notesOnlyRow.notes);
      expect(library[0].source).toBe(notesOnlyRow.source_note);
      expect(library[0].transcriptTiming).toBe("media");
    });
  });
  it("rejects partial transcript pairs, nonzero notes-only counts, and text with zero cues", async () => {
    await withVideo(class01, videoId, async () => {
      for (const change of [
        { source_vtt: text }, { source_sha256: row.source_sha256 },
        { cue_count: 1 }, { source_vtt: text, source_sha256: row.source_sha256, cue_count: 0 },
      ]) {
        const store = recordingStore({ ...notesOnlyRow, ...change }).store;
        expect(await loadRecordingLessonSource(class01, store)).toBeNull();
        expect(await loadRecordingTranscriptSource(class01, store)).toBeNull();
      }
    });
  });
  it("continues the existing caption/storage fallback when only untimed notes are connected", async () => {
    await withVideo(class01, videoId, async () => {
      const store = transcriptStore(notesOnlyRow);
      store.storage = { from: () => ({ download: async () => ({ data: new Blob([text]), error: null }) }) };
      const loaded = await loadTranscriptWithSource(class01.id, class01.envKey, store);
      expect(loaded.cues?.length).toBe(1);
      expect(loaded.timing).toBe("media");
    });
  });
  it("loads the full verified transcript, real notes and honest source clock for session replays", async () => {
    await withVideo(class06, videoId, async () => {
      const source = await loadRecordingLessonSource(class06, recordingStore().store);
      expect(source?.cues).toEqual([{ start: 720, end: 730, text: "[Presentation audio/replay] A fictional workflow demonstration." }]);
      const lesson = lessonContent(class06.id, source)!;
      expect(lesson.paragraphs).toEqual(row.notes);
      expect(lesson.sourceNote).toBe(row.source_note);
      expect(lesson.transcriptTiming).toBe("source_landmarks");
      expect(lesson.media?.version).toBe(lessonContent(class06.id)?.media?.version);
      expect(lesson.questions).toEqual([]);
      expect(lesson.workbook).toEqual([]);
    });
  });
  it("rejects inactive, damaged, wrong-video, incomplete-count and unmarked timing sources", async () => {
    await withVideo(class06, videoId, async () => {
      for (const change of [
        { active: false }, { source_sha256: "0".repeat(64) },
        { video_id: "999999992" }, { cue_count: 2 }, { timing_basis: "unknown" },
      ]) {
        const store = recordingStore({ ...row, ...change }).store;
        expect(await loadRecordingTranscriptSource(class06, store)).toBeNull();
        expect(await loadRecordingLessonSource(class06, store)).toBeNull();
      }
    });
  });
  it("makes private per-lesson rows authoritative, including revoked or version-mismatched rows", async () => {
    await withVideo(class06, videoId, async () => {
      const privateText = "WEBVTT\n\n00:00:00.000 --> 00:00:08.000\nA private per-lesson source.\n";
      const privateRow = {
        source_vtt: privateText, source_sha256: createHash("sha256").update(privateText).digest("hex"),
        media_version: process.env[`ACADEMY_MEDIA_VERSION_${class06.envKey}`] || `vimeo:${videoId}`, active: true,
      };
      const approved = await loadTranscriptWithSource(class06.id, class06.envKey, transcriptStore(row, privateRow));
      expect(approved.cues?.[0].text).toBe("A private per-lesson source.");
      expect(approved.timing).toBe("media");
      // Same slot/version: a prior successful read cannot hide a subsequent revocation.
      for (const change of [{ active: false }, { media_version: "old-recording" }, { source_sha256: "0".repeat(64) }]) {
        const denied = await loadTranscriptWithSource(class06.id, class06.envKey, transcriptStore(row, { ...privateRow, ...change }));
        expect(denied.cues).toBeNull();
      }
      const fallback = await loadTranscriptWithSource(class06.id, class06.envKey, transcriptStore());
      expect(fallback.cues?.[0].text).toContain("[Presentation audio/replay]");
      expect(fallback.timing).toBe("source_landmarks");
      expect(fallback.sourceNote).toBe(row.source_note);
    });
  });
  it("retains the existing private-storage fallback for an unknown recording", async () => {
    const meta = LESSONS.find((lesson) => lesson.id === "accelerator-class-07")!;
    await withVideo(meta, "999999993", async () => {
      const store = transcriptStore(null);
      store.storage = { from: () => ({ download: async () => ({ data: new Blob([text]), error: null }) }) };
      const loaded = await loadTranscriptWithSource(meta.id, meta.envKey, store);
      expect(loaded.cues?.length).toBe(1);
      expect(loaded.timing).toBe("media");
    });
  });
});

describe("Tutor knowledge and entitlement boundary", () => {
  it("gives authorized builders all notes/provenance and withholds those from locked tickets", async () => {
    await withVideo(class06, videoId, async () => {
      const source = await loadRecordingLessonSource(class06, recordingStore().store);
      const resolved = await resolveRecordingLessonMeta(class06, recordingStore().store);
      const contents = new Map([[class06.id, lessonContent(class06.id, source)!]]);
      const builder = tutorCourseLibrary([resolved], contents, ["accelerator"])[0];
      expect(builder.notes?.length).toBe(7);
      expect(builder.source).toBe(row.source_note);
      expect(builder.transcriptTiming).toBe("source_landmarks");
      expect(builder.title).toBe(row.title);
      const locked = JSON.stringify(tutorCourseLibrary([resolved], contents, ["vip", "vault"]));
      expect(locked).not.toContain(row.notes[0].text);
      expect(locked).not.toContain(row.source_note);
      expect(locked).not.toContain("source_landmarks");
      expect(locked).toContain('"unlocked":false');
    });
  });
  it("instructs AI Spin to cite source-clock times honestly and honor presentation/replay labels", () => {
    expect(SPIN_SYSTEM_PROMPT).toContain("NOT verified video offsets");
    expect(SPIN_SYSTEM_PROMPT).toContain("do not tell the student to seek");
    expect(SPIN_SYSTEM_PROMPT).toContain("do not attribute presentation audio or a replay to live Spin");
  });
});
