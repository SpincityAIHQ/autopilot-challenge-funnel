import type { TranscriptCue } from "./academy";
import { parseTranscript } from "./transcript";
import { configuredVimeo } from "./academy-media.server";
/**
 * Transcript source per slot, in order:
 * 1. ACADEMY_TRANSCRIPT_<KEY>: an HTTPS .vtt/.srt link.
 * 2. Vimeo captions through the Vimeo API when VIMEO_ACCESS_TOKEN is set and the
 *    slot is a Vimeo video (auto-generated or uploaded captions both count).
 * 3. ACADEMY_TRANSCRIPT_PATH_<KEY> or transcripts/<slot-id>.vtt in the private media bucket.
 * 4. A transcript bundled with the server build under src/lib/transcripts/<slot-id>.vtt.
 * Results are cached ten minutes. Nothing here reaches the client bundle.
 */
const cache = new Map<string, { cues: TranscriptCue[] | null; at: number }>();
const TTL = 600000;
const MAX = 2_000_000;
type Storage = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};
const bundled = import.meta.glob<string>("./transcripts/*.vtt", {
  query: "?raw",
  import: "default",
});
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
  return r.ok ? (await r.text()).slice(0, MAX) : null;
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
export async function loadTranscript(
  id: string,
  envKey: string,
  db: Storage,
): Promise<TranscriptCue[] | null> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.cues;
  let text: string | null = null;
  try {
    const url = process.env[`ACADEMY_TRANSCRIPT_${envKey}`];
    if (url) text = await fetchText(new URL(url));
    if (!text) text = await vimeoCaptions(envKey);
    if (!text) {
      const path = process.env[`ACADEMY_TRANSCRIPT_PATH_${envKey}`] || `transcripts/${id}.vtt`;
      const file = await db.storage
        .from(process.env.ACADEMY_MEDIA_BUCKET || "academy-media")
        .download(path)
        .catch(() => ({ data: null, error: true }));
      if (!file.error && file.data) text = (await file.data.text()).slice(0, MAX);
    }
    if (!text) {
      const loader = bundled[`./transcripts/${id}.vtt`];
      if (loader) text = await loader();
    }
  } catch {
    text = null;
  }
  let cues = text ? parseTranscript(text) : null;
  if (cues && !cues.length) cues = null;
  cache.set(id, { cues, at: Date.now() });
  return cues;
}
