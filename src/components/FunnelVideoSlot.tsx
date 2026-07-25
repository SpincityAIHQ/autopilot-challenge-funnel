import { VideoSlot } from "./VideoSlot";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed";
import { useQaReviewMode } from "@/hooks/use-qa-review";

interface FunnelVideoSlotProps {
  url: string | null | undefined;
  label: string;
  envKey: string;
  className?: string;
}

/**
 * Mobile-first video slot used throughout the paid funnel.
 *
 * - Real YouTube/Vimeo URLs render as responsive 16:9 embeds.
 * - Empty slots remain invisible to customers.
 * - In the private owner walkthrough, an empty 16:9 placeholder stays visible
 *   so placement can be reviewed before the final video URL is connected.
 */
export function FunnelVideoSlot({
  url,
  label,
  envKey,
  className,
}: FunnelVideoSlotProps) {
  const qaReview = useQaReviewMode();
  const safeUrl = normalizeVideoEmbedUrl(url ?? null);

  if (safeUrl) {
    return (
      <VideoSlot
        url={safeUrl}
        label={label}
        className={`w-full ${className ?? ""}`}
      />
    );
  }

  if (!qaReview) return null;

  return (
    <section className={`w-full ${className ?? ""}`} aria-label={label}>
      <p className="label-mono mb-2">{label}</p>
      <div className="aspect-video w-full overflow-hidden rounded-md border border-dashed border-[color:var(--gold)] bg-[color:var(--surface)]">
        <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center">
          <p className="font-heading text-sm text-foreground sm:text-base">
            Video embed slot
          </p>
          <p className="mt-2 max-w-md break-all font-mono text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
            {envKey}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">
            Responsive 16:9 · hidden publicly until a valid video URL is added
          </p>
        </div>
      </div>
    </section>
  );
}
