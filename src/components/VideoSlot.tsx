import { normalizeVideoEmbedUrl } from "@/lib/video-embed";

/**
 * A reusable per-section video slot.
 *
 * - If `url` normalizes to an allowlisted embed (YouTube/Vimeo), render
 *   the iframe. Anything else fails closed to the placeholder.
 * - If unset/null, render a bordered "Video coming soon" placeholder in
 *   the Diamond Standard palette. No dead links, no fake players.
 */
export interface VideoSlotProps {
  url: string | null | undefined;
  label: string;
  className?: string;
  /** Aspect: "video" (16:9, default) or "portrait" (9:16). */
  aspect?: "video" | "portrait";
}

export function VideoSlot({ url, label, className, aspect = "video" }: VideoSlotProps) {
  const safe = normalizeVideoEmbedUrl(url ?? null);
  const aspectClass = aspect === "portrait" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div className={className}>
      <p className="label-mono mb-2">{label}</p>
      <div
        className={`${aspectClass} overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)]`}
      >
        {safe ? (
          <iframe
            src={safe}
            title={label}
            loading="lazy"
            referrerPolicy="no-referrer"
            allow="fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
      <div
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--gold-soft)]"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--gold-soft), transparent 70%)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path d="M6 4.5v11l9-5.5-9-5.5z" fill="var(--gold)" />
        </svg>
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--gold-soft)]">
        Video coming soon
      </p>
    </div>
  );
}
