import type { Interval } from "./academy";
/**
 * Vimeo lesson slots. A slot is any Vimeo link Spin pastes into the matching
 * environment variable: vimeo.com/ID, vimeo.com/ID/HASH, vimeo.com/ID?h=HASH or
 * player.vimeo.com/video/ID?h=HASH. Unlisted hashes are preserved.
 */
export type VimeoRef = { id: string; hash: string | null };
export function parseVimeoUrl(input: string | null | undefined): VimeoRef | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const hashParam = url.searchParams.get("h");
  const hash = hashParam && /^[a-f0-9]{6,40}$/i.test(hashParam) ? hashParam : null;
  if (host === "vimeo.com") {
    const m = url.pathname.match(/^\/(?:video\/)?(\d{4,15})(?:\/([a-f0-9]{6,40}))?\/?$/i);
    if (!m) return null;
    return { id: m[1], hash: m[2] ?? hash };
  }
  if (host === "player.vimeo.com") {
    const m = url.pathname.match(/^\/video\/(\d{4,15})\/?$/);
    return m ? { id: m[1], hash } : null;
  }
  return null;
}
export const VIMEO_PLAYER_ORIGIN = "https://player.vimeo.com";
/** Player URL configured for an authenticated classroom: no autoplay, API messaging on. */
export function vimeoEmbedUrl(ref: VimeoRef, playerId: string) {
  const url = new URL(`${VIMEO_PLAYER_ORIGIN}/video/${ref.id}`);
  if (ref.hash) url.searchParams.set("h", ref.hash);
  url.searchParams.set("api", "1");
  url.searchParams.set("player_id", playerId);
  url.searchParams.set("autopause", "0");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("title", "0");
  url.searchParams.set("byline", "0");
  url.searchParams.set("portrait", "0");
  url.searchParams.set("badge", "0");
  url.searchParams.set("vimeo_logo", "0");
  url.searchParams.set("dnt", "1");
  return url.toString();
}
/** Public oEmbed lookup used server-side to confirm a slot's duration without a token. */
export function vimeoOembedUrl(ref: VimeoRef) {
  const target = ref.hash
    ? `https://vimeo.com/${ref.id}/${ref.hash}`
    : `https://vimeo.com/${ref.id}`;
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}`;
}
/**
 * Converts a stream of player time updates into watched intervals.
 * A jump larger than `gap` seconds (a seek, a stall, a reload) closes the
 * current span so skipped material never counts as watched.
 */
export class WatchTracker {
  private spans: Interval[] = [];
  private open: Interval | null = null;
  constructor(private readonly gap = 1.75) {}
  observe(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    if (this.open && seconds >= this.open[1] && seconds - this.open[1] <= this.gap) {
      this.open[1] = seconds;
      return;
    }
    this.close();
    this.open = [seconds, seconds];
  }
  /** Close the open span (pause, seek, end, tab hidden). */
  close() {
    if (this.open && this.open[1] - this.open[0] >= 0.25) this.spans.push([...this.open]);
    this.open = null;
  }
  intervals(): Interval[] {
    const all = [...this.spans];
    if (this.open && this.open[1] - this.open[0] >= 0.25) all.push([...this.open]);
    return all;
  }
  /** Drop what was already persisted so each save carries only new viewing. */
  reset() {
    this.spans = [];
    if (this.open) this.open = [this.open[1], this.open[1]];
  }
}
export type VimeoMessage =
  | { event: string; data?: Record<string, unknown> }
  | { method: string; value?: unknown };
export function parseVimeoMessage(raw: unknown): VimeoMessage | null {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.event === "string")
    return { event: d.event, data: (d.data as Record<string, unknown>) ?? undefined };
  if (typeof d.method === "string") return { method: d.method, value: d.value };
  return null;
}

/**
 * Player health, kept out of the component so the behaviour is testable.
 *
 * Rules:
 *  - An `error` event is NOT proof the embed is alive: it must never satisfy
 *    the handshake, because a blocked embed answering with an error would
 *    otherwise cancel the "player has not responded" warning.
 *  - Any other player message means the embed is alive.
 *  - A late, valid `ready`/`timeupdate` clears a stale unresponsive warning
 *    and clears a previous error: the recording actually started.
 */
export type PlayerStatus = "waiting" | "live" | "error" | "unresponsive";

export const PLAYER_ERROR_NOTE =
  "The recording could not start in this browser. Refresh the page, and if it stays blocked try another browser or connection, or tell the team so we can check the recording.";
export const PLAYER_SILENT_NOTE =
  "The player has not responded yet. Refresh the page, and if it stays blank try another browser or turn off a blocker or private-window setting for this site.";

export function createPlayerHealth() {
  let status: PlayerStatus = "waiting";
  let alive = false;
  return {
    /** Feed every parsed player message. Returns the resulting status. */
    observe(message: VimeoMessage | null): PlayerStatus {
      if (!message) return status;
      if ("event" in message && message.event === "error") {
        status = "error";
        return status;
      }
      alive = true;
      status = "live";
      return status;
    },
    /** The bounded handshake gave up. Only meaningful while nothing answered. */
    timedOut(): PlayerStatus {
      // A reported error is the more specific truth; keep it.
      if (!alive && status !== "error") status = "unresponsive";
      return status;
    },
    /** True once a non-error message proved the embed is alive. */
    get alive() {
      return alive;
    },
    get status() {
      return status;
    },
    note(): string | null {
      if (status === "error") return PLAYER_ERROR_NOTE;
      if (status === "unresponsive") return PLAYER_SILENT_NOTE;
      return null;
    },
  };
}
