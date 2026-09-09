import type { TranscriptCue } from "./academy";
import { MAX_TRANSCRIPT_CHARACTERS, parseTranscript } from "./transcript";
import { createHash } from "node:crypto";
import { configuredVimeo } from "./academy-media.server";
/**
 * Transcript source per slot, in order:
 * 0. A private academy_transcripts row, tied to this recording version.
 * 1. ACADEMY_TRANSCRIPT_<KEY>: an HTTPS .vtt/.srt link.
 * 2. Vimeo captions through the Vimeo API when VIMEO_ACCESS_TOKEN is set and the
 *    slot is a Vimeo video (auto-generated or uploaded captions both count).
 * 3. ACADEMY_TRANSCRIPT_PATH_<KEY> or transcripts/<slot-id>.vtt in the private media bucket.
 * 4. A transcript bundled with the server build under src/lib/transcripts/<slot-id>.vtt.
 * Results are cached ten minutes. Nothing here reaches the client bundle.
 */
const cache = new Map<string, { cues: TranscriptCue[] | null; at: number }>();
const TTL = 600000;
function completeText(text: string): string | null {
  return text.length <= MAX_TRANSCRIPT_CHARACTERS ? text : null;
}
type PrivateTranscriptRow = {
  source_vtt: string;
  source_sha256: string;
  media_version: string;
  active: boolean;
};
export type TranscriptStore = {
  readPrivateTranscript?: (id: string) => PromiseLike<{ data: unknown; error: unknown }>;
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};
// Vite transforms this literal glob call into server-bundled loaders. Raw
// Node/Bun test imports have no glob runtime; keep those imports usable.
let bundled: Record<string, () => Promise<string>> = {};
try {
  bundled = import.meta.glob<string>("./transcripts/*.vtt", {
    query: "?raw",
    import: "default",
  });
} catch {
  bundled = {};
}
export function bundledTranscriptIds() {
  return Object.keys(bundled).map((k) => k.replace(/^.*\//, "").replace(/\.vtt$/, ""));
}
export function transcriptConfigured(id: string, envKey: string) {
  return Boolean(
    process.env[`ACADEMY_TRANSCRIPT_${envKey}`] ||
    process.env[`ACADEMY_TRANSCRIPT_PATH_${envKey}`] ||
    bundledTranscriptIds().includes(id),
  );
}
async function fetchText(url: URL): Promise<string | null> {
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  return r.ok ? completeText(await r.text()) : null;
}
/** Vimeo text tracks: prefer an active English captions track, then any active track. */
async function vimeoCaptions(envKey: string): Promise<string | null> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  const ref = configuredVimeo(envKey);
  if (!token || !ref) return null;
  const r = await fetch(`https://api.vimeo.com/videos/${ref.id}/texttracks`, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const json = (await r.json()) as {
    data?: { active?: boolean; language?: string; type?: string; link?: string }[];
  };
  const tracks = (json.data ?? []).filter((t) => t.link && t.active !== false);
  const pick =
    tracks.find(
      (t) => (t.language ?? "").toLowerCase().startsWith("en") && t.type === "captions",
    ) ??
    tracks.find((t) => (t.language ?? "").toLowerCase().startsWith("en")) ??
    tracks[0];
  if (!pick?.link) return null;
  try {
    return await fetchText(new URL(pick.link));
  } catch {
    return null;
  }
}
function recordingVersion(envKey: string) {
  const vimeo = configuredVimeo(envKey);
  return process.env[`ACADEMY_MEDIA_VERSION_${envKey}`] || (vimeo ? `vimeo:${vimeo.id}` : "1");
}
/** A private row is authoritative: inactive, mismatched or damaged text is never served. */
async function privateTranscript(id: string, version: string, db: TranscriptStore) {
  if (!db.readPrivateTranscript) return { found: false, text: null };
  const result = await db.readPrivateTranscript(id);
  if (result.error || !result.data) return { found: false, text: null };
  const row = result.data as PrivateTranscriptRow;
  if (!row.active || row.media_version !== version || typeof row.source_vtt !== "string")
    return { found: true, text: null };
  const valid = completeText(row.source_vtt) !== null &&
    createHash("sha256").update(row.source_vtt).digest("hex") === row.source_sha256;
  return { found: true, text: valid ? row.source_vtt : null };
}
/** Only IDs with a successfully loaded, non-empty transcript are advertised. */
export async function availableTranscriptIds(
  lessons: { id: string; envKey: string }[],
  db: TranscriptStore,
) {
  const results = await Promise.all(lessons.map(async (lesson) => (
    await loadTranscript(lesson.id, lesson.envKey, db)
  )?.length ? lesson.id : null));
  return results.filter((id): id is string => id !== null);
}
export async function loadTranscript(
  id: string,
  envKey: string,
  db: TranscriptStore,
): Promise<TranscriptCue[] | null> {
  const version = recordingVersion(envKey);
  const key = `${id}:${version}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.cues;
  let text: string | null = null;
  try {
    const privateSource = await privateTranscript(id, version, db);
    if (privateSource.found) {
      let cues: TranscriptCue[] | null = null;
      try { cues = privateSource.text ? parseTranscript(privateSource.text) : null; } catch { /* Reject unsupported source. */ }
      if (!cues?.length) cues = null;
      cache.set(key, { cues, at: Date.now() });
      return cues;
    }
    const url = process.env[`ACADEMY_TRANSCRIPT_${envKey}`];
    if (url) text = await fetchText(new URL(url));
    if (!text) text = await vimeoCaptions(envKey);
    if (!text) {
      const path = process.env[`ACADEMY_TRANSCRIPT_PATH_${envKey}`] || `transcripts/${id}.vtt`;
      const file = await db.storage
        .from(process.env.ACADEMY_MEDIA_BUCKET || "academy-media")
        .download(path)
        .catch(() => ({ data: null, error: true }));
      if (!file.error && file.data) text = completeText(await file.data.text());
    }
    if (!text) {
      const loader = bundled[`./transcripts/${id}.vtt`];
      if (loader) text = completeText(await loader());
    }
  } catch {
    text = null;
  }
  let cues: TranscriptCue[] | null = null;
  try { cues = text ? parseTranscript(text) : null; } catch { /* Reject unsupported source. */ }
  if (cues && !cues.length) cues = null;
  cache.set(key, { cues, at: Date.now() });
  return cues;
}


