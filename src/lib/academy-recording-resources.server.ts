import { tierAllows, type LessonMeta } from "./academy";
import type { RecordingLessonSource } from "./academy-recording-sources.server";

/** Resource bytes live only in the existing private recording-source table. */
const LESSON_ID = "accelerator-2026-11-09";
const RESOURCE_PREFIX = "__resource:";
const RESOURCES = [
  { id: "worksheet", label: "Download the PASE activity sheets", filename: "Q4-Accelerator-2026-11-09-PASE-Worksheet.md" },
  { id: "prompts", label: "Download the PASE prompt pack", filename: "Q4-Accelerator-2026-11-09-PASE-Prompts.md" },
];

/** Only the dated source uses reserved resource notes; other lessons are unchanged. */
export function recordingTeachingNotes(meta: LessonMeta, source?: RecordingLessonSource | null) {
  const notes = source?.notes ?? [];
  return meta.id === LESSON_ID
    ? notes.filter((note) => !note.heading.startsWith(RESOURCE_PREFIX))
    : notes;
}

/** Descriptors are included only in an already authorized lesson response. */
export function recordingResourceDescriptors(meta: LessonMeta, source?: RecordingLessonSource | null) {
  if (meta.id !== LESSON_ID || meta.tier !== "accelerator") return [];
  return RESOURCES.filter((resource) => source?.notes.some((note) =>
    note.heading === `${RESOURCE_PREFIX}${resource.id}`));
}

/** Grants must come from the server's verified entitlement lookup. */
export function recordingResourceForGrants(
  meta: LessonMeta,
  source: RecordingLessonSource | null,
  resourceId: string,
  grants: string[],
) {
  if (meta.id !== LESSON_ID || meta.tier !== "accelerator" || !tierAllows(grants, meta.tier)) return null;
  const resource = recordingResourceDescriptors(meta, source).find((item) => item.id === resourceId);
  const note = source?.notes.find((item) => item.heading === `${RESOURCE_PREFIX}${resourceId}`);
  return resource && note
    ? { ...resource, mimeType: "text/markdown;charset=utf-8", encoding: "utf8" as const, content: note.text }
    : null;
}
