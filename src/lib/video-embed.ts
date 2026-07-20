/**
 * Normalize a user-provided video URL into a safe embed URL.
 * Returns null (fail closed) for anything not on the allowlist.
 *
 * Allowlist:
 *  - youtube.com/watch?v=ID   → https://www.youtube.com/embed/ID
 *  - youtu.be/ID              → https://www.youtube.com/embed/ID
 *  - youtube.com/embed/ID     → passthrough
 *  - vimeo.com/ID             → https://player.vimeo.com/video/ID
 *  - player.vimeo.com/video/ID → passthrough
 */
export function normalizeVideoEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      if (id && /^[\w-]{6,20}$/.test(id)) {
        return `https://www.youtube.com/embed/${id}`;
      }
      return null;
    }
    const embedMatch = u.pathname.match(/^\/embed\/([\w-]{6,20})$/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    return null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "");
    if (/^[\w-]{6,20}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
    return null;
  }

  // Vimeo
  if (host === "vimeo.com") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (/^\d{4,15}$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    return null;
  }
  if (host === "player.vimeo.com") {
    if (/^\/video\/\d{4,15}$/.test(u.pathname)) return u.toString();
    return null;
  }

  return null;
}
