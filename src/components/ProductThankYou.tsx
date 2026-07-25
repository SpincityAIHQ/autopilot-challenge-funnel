import { VideoSlot } from "@/components/VideoSlot";

/**
 * Session-verified product-specific thank-you card.
 *
 * Renders ONLY when `verified === true` (a verified HttpOnly session has
 * confirmed the buyer holds the exact product being thanked for). Never
 * derives from URL parameters. Anonymous / ineligible visitors see
 * nothing — no product name, no video, no placeholder.
 *
 * `videoUrl` is normalized inside <VideoSlot>: if unset or off-allowlist,
 * no player renders. There are no public "coming soon" placeholders.
 */
export interface ProductThankYouProps {
  verified: boolean;
  eyebrow: string;
  headline: string;
  body?: string;
  videoUrl?: string | null;
  videoLabel: string;
  className?: string;
}

export function ProductThankYou({
  verified,
  eyebrow,
  headline,
  body,
  videoUrl,
  videoLabel,
  className,
}: ProductThankYouProps) {
  if (!verified) return null;
  return (
    <section
      data-testid="product-thank-you"
      className={
        className ??
        "mt-10 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-6"
      }
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2
        data-testid="product-thank-you-headline"
        className="mt-2 font-display text-2xl text-foreground"
      >
        {headline}
      </h2>
      {body ? (
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      ) : null}
      <VideoSlot url={videoUrl ?? null} label={videoLabel} className="mt-5" />
    </section>
  );
}
