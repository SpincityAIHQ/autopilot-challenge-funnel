import {
  configureVideoPlayback,
  normalizeVideoEmbedUrl,
  videoIframeSandbox,
} from "@/lib/video-embed";

export interface VideoSlotProps {
  url: string | null | undefined;
  label: string;
  className?: string;
  aspect?: "video" | "portrait";
  autoplay?: boolean;
  muted?: boolean;
  eager?: boolean;
}

/**
 * Reusable allowlisted video embed.
 *
 * Autoplay is opt-in so funnel VSLs can begin immediately while testimonial
 * videos remain still until the visitor chooses to play them.
 */
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
  const sandbox = videoIframeSandbox(safe);
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
          sandbox={sandbox}
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
