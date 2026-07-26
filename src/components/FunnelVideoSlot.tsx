import { VideoSlot } from "./VideoSlot";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed";

interface FunnelVideoSlotProps {
  url: string | null | undefined;
  label: string;
  envKey: string;
  className?: string;
  autoplay?: boolean;
}

/**
 * Mobile-first VSL slot used throughout the funnel.
 *
 * Real videos request muted inline autoplay and keep controls visible, so the
 * player starts on mobile and the viewer taps it for sound.
 *
 * When a slot has no configured URL it renders a visible placeholder rather
 * than collapsing to nothing, so the owner can confirm placement everywhere —
 * including the published preview — while the videos are still being produced.
 * The placeholder names the environment key it is waiting for, so every slot
 * must have a real URL configured before launch.
 */
export function FunnelVideoSlot({
  url,
  label,
  envKey,
  className,
  autoplay = true,
}: FunnelVideoSlotProps) {
  const safeUrl = normalizeVideoEmbedUrl(url ?? null);

  if (safeUrl) {
    return (
      <section className={`w-full ${className ?? ""}`} aria-label={label}>
        <VideoSlot
          url={safeUrl}
          label={label}
          className="w-full"
          autoplay={autoplay}
          muted={autoplay}
          eager={autoplay}
        />
        {autoplay ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-xs">
            Playing muted. Tap the player for sound.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className={`w-full ${className ?? ""}`} aria-label={label}>
      <p className="label-mono mb-2">{label}</p>
      <div className="aspect-video w-full overflow-hidden rounded-md border border-dashed border-[color:var(--gold)] bg-[color:var(--surface)] shadow-[0_0_36px_rgba(20,241,170,0.08)]">
        <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center">
          <p className="font-heading text-sm text-foreground sm:text-base">
            Autoplay video embed slot
          </p>
          <p className="mt-2 max-w-md break-all font-mono text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
            {envKey}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">
            Responsive 16:9 · autoplay muted · tap for sound · connect this key before launch
          </p>
        </div>
      </div>
    </section>
  );
}
