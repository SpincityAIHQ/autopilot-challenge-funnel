import {
  configureVideoPlayback,
  normalizeVideoEmbedUrl,
} from "@/lib/video-embed";

/**
 * A reusable per-section video slot.
 *
 * - If `url` normalizes to an allowlisted embed (YouTube/Vimeo), render
 *   the iframe.
 * - If unset or invalid, render nothing. Public pages never show empty
 *   players, fake play buttons, or "coming soon" build notes.
 * - Autoplay is opt-in so testimonial videos remain still while funnel VSLs
 *   can begin immediately.
 */
export interface VideoSlotProps {
  url: string | null | undefined;
  label: string;
  className?: string;
  /** Aspect: "video" (16:9, default) or "portrait" (9:16). */
  aspect?: "video" | "portrait";
  autoplay?: boolean;
  muted?: boolean;
  eager?: boolean;
}

export function VideoSlot({
  url,
  label,
  className,
  aspect = "video",
  autoplay = false,
  muted = false,
  eager = false,
}: VideoSlotProps) {
  const safe = normalizeVideoEmbedUrl(url ?? null);
  if (!safe) return null;

  const src = configureVideoPlayback(safe, {
    autoplay,
    muted,
    playsInline: true,
  });
  const aspectClass = aspect === "portrait" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div className={className}>
      <p className="label-mono mb-2">{label}</p>
      <div
        className={`${aspectClass} overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[color:var(--surface)] shadow-[0_0_36px_rgba(20,241,170,0.08)]`}
      >
        <iframe
          src={src}
          title={label}
          loading={eager || autoplay ? "eager" : "lazy"}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
