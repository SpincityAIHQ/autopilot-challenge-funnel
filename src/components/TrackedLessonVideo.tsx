import { useEffect, useRef } from "react";
import type { Interval, LessonContent } from "@/lib/academy";
import { academyApi } from "@/lib/academy-client";
export function TrackedLessonVideo({
  lessonId,
  media,
  resume = 0,
  onSaved,
  onError,
}: {
  lessonId: string;
  media: NonNullable<LessonContent["media"]>;
  resume?: number;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const busy = useRef(false);
  const save = async () => {
    const v = ref.current;
    if (!v || !Number.isFinite(v.duration) || busy.current) return;
    const intervals: Interval[] = [];
    for (let i = 0; i < v.played.length; i++) intervals.push([v.played.start(i), v.played.end(i)]);
    if (!intervals.length) return;
    busy.current = true;
    lastSave.current = Date.now();
    try {
      await academyApi("progress", {
        kind: "playback",
        lessonId,
        mediaVersion: media.version,
        intervals,
        duration: v.duration,
        position: v.currentTime,
        eventId: crypto.randomUUID(),
      });
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      busy.current = false;
    }
  };
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") void save();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [lessonId, media.version]);
  return (
    <video
      ref={ref}
      className="academy-video"
      controls
      playsInline
      preload="metadata"
      src={media.url}
      onLoadedMetadata={() => {
        if (ref.current && resume > 0 && resume < ref.current.duration)
          ref.current.currentTime = resume;
      }}
      onTimeUpdate={() => {
        if (Date.now() - lastSave.current > 15000) void save();
      }}
      onPause={() => void save()}
      onEnded={() => void save()}
      onError={() =>
        onError("The recording could not load. You can continue with the lesson notes below.")
      }
    >
      {media.captions ? (
        <track kind="captions" src={media.captions} srcLang="en" label="English" default />
      ) : null}
      Your browser cannot play this recording.
    </video>
  );
}
