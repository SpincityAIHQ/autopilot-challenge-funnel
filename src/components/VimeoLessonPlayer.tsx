import { useEffect, useRef } from "react";
import { mergeIntervals, type LessonMedia } from "@/lib/academy";
import { academyApi } from "@/lib/academy-client";
import { VIMEO_PLAYER_ORIGIN, WatchTracker, parseVimeoMessage } from "@/lib/vimeo";
import { VIMEO_PLAYER_SANDBOX } from "@/lib/video-embed";
/**
 * Vimeo slot with viewing telemetry. The player reports time through the
 * postMessage API; spans of continuous playback become watched intervals that
 * the server merges. Seeking never counts skipped material. Progress saves
 * every 15 seconds while playing, on pause, on end and when the tab hides.
 */
export function VimeoLessonPlayer({
  lessonId,
  media,
  resume = 0,
  seekTo,
  onSaved,
  onError,
}: {
  lessonId: string;
  media: LessonMedia;
  resume?: number;
  /** Changing this value asks the player to jump to that second (chapter clicks). */
  seekTo?: { at: number; nonce: number } | null;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const tracker = useRef(new WatchTracker());
  const duration = useRef(media.duration);
  const position = useRef(resume);
  const lastSave = useRef(0);
  const busy = useRef(false);
  const ready = useRef(false);
  const send = (method: string, value?: unknown) => {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify(value === undefined ? { method } : { method, value }),
      VIMEO_PLAYER_ORIGIN,
    );
  };
  const save = async (force = false) => {
    const d = duration.current;
    if (!d || busy.current) return;
    const fresh = tracker.current.intervals();
    if (!fresh.length && !force) return;
    busy.current = true;
    lastSave.current = Date.now();
    try {
      await academyApi("progress", {
        kind: "playback",
        lessonId,
        mediaVersion: media.version,
        intervals: mergeIntervals(fresh, d),
        duration: d,
        position: Math.min(position.current, d),
        eventId: crypto.randomUUID(),
      });
      tracker.current.reset();
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      busy.current = false;
    }
  };
  useEffect(() => {
    const t = tracker.current;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_PLAYER_ORIGIN || event.source !== frame.current?.contentWindow)
        return;
      const msg = parseVimeoMessage(event.data);
      if (!msg) return;
      if ("method" in msg) {
        if (msg.method === "getDuration" && typeof msg.value === "number" && msg.value > 0)
          duration.current = msg.value;
        return;
      }
      switch (msg.event) {
        case "ready":
          ready.current = true;
          for (const name of ["play", "pause", "ended", "timeupdate", "seeked"])
            send("addEventListener", name);
          send("getDuration");
          if (resume > 0) send("setCurrentTime", resume);
          break;
        case "timeupdate": {
          const s = Number(msg.data?.seconds);
          const d = Number(msg.data?.duration);
          if (Number.isFinite(d) && d > 0) duration.current = d;
          if (!Number.isFinite(s)) break;
          position.current = s;
          tracker.current.observe(s);
          if (Date.now() - lastSave.current > 15000) void save();
          break;
        }
        case "seeked": {
          tracker.current.close();
          const s = Number(msg.data?.seconds);
          if (Number.isFinite(s)) position.current = s;
          break;
        }
        case "pause":
          tracker.current.close();
          void save();
          break;
        case "ended":
          tracker.current.close();
          position.current = duration.current;
          void save(true);
          break;
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        tracker.current.close();
        void save();
      }
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onHide);
      t.close();
      void save();
    };
  }, [lessonId, media.version]);
  useEffect(() => {
    if (seekTo && ready.current) {
      tracker.current.close();
      send("setCurrentTime", seekTo.at);
      send("play");
    }
  }, [seekTo?.nonce]);
  return (
    <div className="academy-player">
      <iframe
        ref={frame}
        src={media.url}
        title="Lesson recording"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        sandbox={VIMEO_PLAYER_SANDBOX}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
