import { parseVimeoUrl, vimeoOembedUrl, type VimeoRef } from "./vimeo";
/**
 * Server-side confirmation of a Vimeo slot's duration through the public
 * oEmbed endpoint. Cached for an hour per video so lesson loads stay fast.
 * Failure falls back to the configured duration, then to an unverified state.
 */
const cache = new Map<string, { duration: number; at: number }>();
const TTL = 3600000;
export async function vimeoDuration(ref: VimeoRef): Promise<number | null> {
  const key = `${ref.id}:${ref.hash ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.duration;
  try {
    const r = await fetch(vimeoOembedUrl(ref), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { duration?: unknown };
    const d = Number(json.duration);
    if (!Number.isFinite(d) || d <= 0 || d > 43200) return null;
    cache.set(key, { duration: d, at: Date.now() });
    return d;
  } catch {
    return null;
  }
}
export function configuredVimeo(envKey: string): VimeoRef | null {
  return parseVimeoUrl(process.env[`ACADEMY_VIMEO_${envKey}`]);
}
/** Which catalogue slots have a recording connected. Booleans only; never URLs. */
export function connectedSlots(ids: { id: string; envKey: string }[]) {
  return ids
    .filter(
      (l) =>
        configuredVimeo(l.envKey) ||
        (l.id === "free-webinar"
          ? process.env[`ACADEMY_MEDIA_${l.envKey}`]
          : process.env[`ACADEMY_MEDIA_PATH_${l.envKey}`]),
    )
    .map((l) => l.id);
}
