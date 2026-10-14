import { createHash } from "node:crypto";
import type { LessonMeta, TranscriptCue } from "./academy";
import { configuredVimeo } from "./academy-media.server";
import { MAX_TRANSCRIPT_CHARACTERS, parseTranscript } from "./transcript";

/** Reads use the service client. The public catalogue requests metadata only. */
export type RecordingSourceProjection = "metadata" | "transcript" | "content";
export type RecordingSourceStore = {
  readRecordingSource?: (
    videoId: string,
    projection: RecordingSourceProjection,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};
export const RECORDING_METADATA_COLUMNS = "video_id,source_date,title,stage,summary,skill,active";
export const RECORDING_TRANSCRIPT_COLUMNS = `${RECORDING_METADATA_COLUMNS},source_vtt,source_sha256,cue_count,source_note,timing_basis`;
export const RECORDING_CONTENT_COLUMNS = `${RECORDING_TRANSCRIPT_COLUMNS},notes`;

export type RecordingMetadata = Pick<LessonMeta, "title" | "stage" | "summary" | "skill">;
export type RecordingTranscriptSource = {
  metadata: RecordingMetadata;
  sourceDate: string;
  sourceNote: string;
  timing: "media" | "source_landmarks";
  cues: TranscriptCue[];
};
export type RecordingLessonSource = RecordingTranscriptSource & {
  notes: { heading: string; text: string }[];
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
function approvedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function metadata(row: Record<string, unknown>, videoId: string): RecordingMetadata | null {
  if (row.active !== true || row.video_id !== videoId ||
    typeof row.source_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.source_date) ||
    !approvedText(row.title, 240) || !approvedText(row.stage, 240) ||
    !approvedText(row.summary, 1600) || !approvedText(row.skill, 400)) return null;
  // Explicit projection: never copy private notes, source text, video IDs or URLs.
  return { title: row.title, stage: row.stage, summary: row.summary, skill: row.skill };
}

/** Identity comes from the slot's actual Vimeo configuration, never its class number. */
async function readSource(meta: LessonMeta, store: RecordingSourceStore, projection: RecordingSourceProjection) {
  if (meta.tier !== "accelerator" || !store.readRecordingSource) return null;
  const video = configuredVimeo(meta.envKey);
  if (!video) return null;
  try {
    const result = await store.readRecordingSource(video.id, projection);
    if (result.error) return null; // Older deployments may not have the table yet.
    const row = object(result.data);
    if (!row) return null;
    const resolved = metadata(row, video.id);
    return resolved ? { row, resolved } : null;
  } catch {
    return null;
  }
}

/** Safe for a signed-out catalogue: reads and returns high-level metadata only. */
export async function resolveRecordingLessonMeta(meta: LessonMeta, store: RecordingSourceStore): Promise<LessonMeta> {
  const source = await readSource(meta, store, "metadata");
  return source ? { ...meta, ...source.resolved } : meta;
}
export async function resolveRecordingCatalogue(lessons: LessonMeta[], store: RecordingSourceStore): Promise<LessonMeta[]> {
  return Promise.all(lessons.map((lesson) => resolveRecordingLessonMeta(lesson, store)));
}

function transcriptSource(source: NonNullable<Awaited<ReturnType<typeof readSource>>>): RecordingTranscriptSource | null {
  const { row, resolved } = source;
  if (!approvedText(row.source_vtt, MAX_TRANSCRIPT_CHARACTERS) ||
    typeof row.source_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.source_sha256) ||
    createHash("sha256").update(row.source_vtt).digest("hex") !== row.source_sha256 ||
    !Number.isInteger(row.cue_count) || Number(row.cue_count) <= 0 ||
    Number(row.cue_count) > 20_000 ||
    !approvedText(row.source_note, 16_000) ||
    (row.timing_basis !== "source_landmarks" && row.timing_basis !== "media")) return null;
  // parseTranscript may merge small caption fragments; verify the complete
  // source block count separately so that merges are not mistaken for loss.
  const blockCount = (row.source_vtt.match(/^\s*\S+\s+-->\s+\S+/gm) ?? []).length;
  if (blockCount !== row.cue_count) return null;
  try {
    const cues = parseTranscript(row.source_vtt);
    if (!cues.length) return null;
    return {
      metadata: resolved,
      sourceDate: row.source_date as string,
      sourceNote: row.source_note,
      timing: row.timing_basis,
      cues,
    };
  } catch {
    return null;
  }
}

/** Server-only. Caller must authorize the lesson before returning its cues. */
export async function loadRecordingTranscriptSource(meta: LessonMeta, store: RecordingSourceStore): Promise<RecordingTranscriptSource | null> {
  const source = await readSource(meta, store, "transcript");
  return source ? transcriptSource(source) : null;
}

/** Full notes are requested only inside an authorized lesson/tutor operation. */
export async function loadRecordingLessonSource(meta: LessonMeta, store: RecordingSourceStore): Promise<RecordingLessonSource | null> {
  const source = await readSource(meta, store, "content");
  if (!source) return null;
  const validated = transcriptSource(source);
  const notes = source.row.notes;
  if (!validated || !Array.isArray(notes) || !notes.length || notes.length > 40) return null;
  const approved: { heading: string; text: string }[] = [];
  for (const note of notes) {
    const item = object(note);
    if (!item || !approvedText(item.heading, 240) || !approvedText(item.text, 16_000)) return null;
    approved.push({ heading: item.heading, text: item.text });
  }
  return { ...validated, notes: approved };
}
