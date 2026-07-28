/**
 * Normalize a user-provided video URL into a safe embed URL.
 * Returns null for anything outside the YouTube / Vimeo allowlist.
 */
export function normalizeVideoEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
    }

    const embedMatch = url.pathname.match(/^\/embed\/([\w-]{6,20})$/);
    return embedMatch ? `https://www.youtube.com/embed/${embedMatch[1]}` : null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "");
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return /^\d{4,15}$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (host === "player.vimeo.com") {
    return /^\/video\/\d{4,15}$/.test(url.pathname) ? url.toString() : null;
  }

  return null;
}

export interface VideoPlaybackOptions {
  autoplay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

/**
 * Vimeo needs scripts and its own origin to play, plus presentation permission
 * for fullscreen. Deliberately omit popup and top-navigation permissions so
 * Vimeo-owned links cannot take a funnel visitor away from the page.
 */
export const VIMEO_PLAYER_SANDBOX = "allow-scripts allow-same-origin allow-presentation";

export function videoIframeSandbox(embedUrl: string): string | undefined {
  try {
    return new URL(embedUrl).hostname.toLowerCase() === "player.vimeo.com"
      ? VIMEO_PLAYER_SANDBOX
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Funnel videos request muted inline autoplay. Muting is required by modern
 * mobile browsers; controls remain visible so the viewer can turn sound on.
 */
export function configureVideoPlayback(
  embedUrl: string,
  options: VideoPlaybackOptions = {},
): string {
  const autoplay = options.autoplay === true;
  const muted = options.muted === true;
  const playsInline = options.playsInline !== false;
  const url = new URL(embedUrl);
  const host = url.hostname.toLowerCase();

  if (host === "www.youtube.com") {
    if (autoplay) url.searchParams.set("autoplay", "1");
    if (muted) url.searchParams.set("mute", "1");
    if (playsInline) url.searchParams.set("playsinline", "1");
    url.searchParams.set("controls", "1");
    url.searchParams.set("rel", "0");
  }

  if (host === "player.vimeo.com") {
    if (autoplay) url.searchParams.set("autoplay", "1");
    if (muted) url.searchParams.set("muted", "1");
    if (playsInline) url.searchParams.set("playsinline", "1");
    url.searchParams.set("autopause", "0");
    url.searchParams.set("controls", "1");
    url.searchParams.set("title", "0");
    url.searchParams.set("byline", "0");
    url.searchParams.set("portrait", "0");
    url.searchParams.set("badge", "0");
    url.searchParams.set("vimeo_logo", "0");
    url.searchParams.set("dnt", "1");
  }

  return url.toString();
}
