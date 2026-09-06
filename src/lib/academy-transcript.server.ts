import type { TranscriptCue } from "./academy";
import { parseTranscript } from "./transcript";
/**
 * Transcript source per slot, in order: ACADEMY_TRANSCRIPT_<KEY> (an HTTPS
 * .vtt/.srt link, for example Vimeo's caption export), then
 * ACADEMY_TRANSCRIPT_PATH_<KEY> in the private academy-media bucket, then the
 * conventional path transcripts/<slot-id>.vtt in that bucket. Cached ten minutes.
 */
const cache = new Map<string, { cues: TranscriptCue[] | null; at: number }>();
const TTL = 600000;
type Storage = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
    };
  };
};
export function transcriptConfigured(envKey: string) {
  return Boolean(
    process.env[`ACADEMY_TRANSCRIPT_${envKey}`] || process.env[`ACADEMY_TRANSCRIPT_PATH_${envKey}`],
  );
}
export async function loadTranscript(
  id: string,
  envKey: string,
  db: Storage,
): Promise<TranscriptCue[] | null> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.cues;
  let cues: TranscriptCue[] | null = null;
  try {
    const url = process.env[`ACADEMY_TRANSCRIPT_${envKey}`];
    if (url) {
      const u = new URL(url);
      if (u.protocol === "https:" && !u.username && !u.password) {
        const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
        if (r.ok) cues = parseTranscript((await r.text()).slice(0, 2_000_000));
      }
    } else {
      const path = process.env[`ACADEMY_TRANSCRIPT_PATH_${envKey}`] || `transcripts/${id}.vtt`;
      const file = await db.storage
        .from(process.env.ACADEMY_MEDIA_BUCKET || "academy-media")
        .download(path);
      if (!file.error && file.data)
        cues = parseTranscript((await file.data.text()).slice(0, 2_000_000));
    }
  } catch {
    cues = null;
  }
  if (cues && !cues.length) cues = null;
  cache.set(id, { cues, at: Date.now() });
  return cues;
}
