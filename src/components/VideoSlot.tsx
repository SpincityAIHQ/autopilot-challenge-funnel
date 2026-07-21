import { normalizeVideoEmbedUrl } from "@/lib/video-embed";

/**
 * A reusable per-section video slot.
 *
 * - If `url` normalizes to an allowlisted embed (YouTube/Vimeo), render
 *   the iframe.
 * - If unset or invalid, render nothing. Public pages never show empty
 *   players, fake play buttons, or "coming soon" build notes.
 */
export interface VideoSlotProps {
  url: string | null | undefined;
  label: string;
  className?: string;
  /** Aspect: "video" (16:9, default) or "portrait" (9:16). */
  aspect?: "video" | "portrait";
}

export function VideoSlot({
  url,
  label,
  className,
  aspect = "video",
}: VideoSlotProps) {
  const safe = normalizeVideoEmbedUrl(url ?? null);
  if (!safe) return null;

  const aspectClass = aspect === "portrait" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div className={className}>
      <p className="label-mono mb-2">{label}</p>
      <div
        className={`${aspectClass} overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)]`}
      >
        <iframe
          src={safe}
          title={label}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
