import { useEffect, useMemo, useState } from "react";
import { VideoSlot } from "./VideoSlot";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed";
import { useQaReviewMode } from "@/hooks/use-qa-review";

interface FunnelVideoSlotProps {
  url: string | null | undefined;
  label: string;
  envKey: string;
  className?: string;
  autoplay?: boolean;
  /** Keep a branded poster visible publicly while the video URL is not configured. */
  alwaysVisible?: boolean;
  /** Poster copy shown while the opener video is not connected yet. */
  placeholderNote?: string;
  /** Optional poster link. Pass null to hide it. */
  placeholderCta?: { label: string; href: string } | null;
  /** Stable page id for an intro the visitor may hide on this device. */
  introId?: "summit" | "vault" | "accelerator";
}

const INTRO_STORAGE_PREFIX = "ai-autopilot:intro-hidden:v1";

/** A non-security fingerprint makes a new upload visible without storing its full URL. */
export function introVideoFingerprint(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function introPreferenceKey(introId: string, url: string) {
  return `${INTRO_STORAGE_PREFIX}:${introId}:${introVideoFingerprint(url)}`;
}

/**
 * Mobile-first VSL slot used throughout the funnel.
 *
 * Real videos request muted inline autoplay and keep controls visible. Empty
 * slots stay hidden publicly and remain visible only in the private owner QA
 * walkthrough so placement can be reviewed before video URLs are connected.
 */
export function FunnelVideoSlot({
  url,
  label,
  envKey,
  className,
  autoplay = true,
  alwaysVisible = false,
  placeholderNote = "The welcome video is being uploaded.",
  placeholderCta = { label: "Start the free training now →", href: "/class" },
  introId,
}: FunnelVideoSlotProps) {
  const qaReview = useQaReviewMode();
  const safeUrl = normalizeVideoEmbedUrl(url ?? null);
  const storageKey = useMemo(
    () => (introId && safeUrl ? introPreferenceKey(introId, safeUrl) : null),
    [introId, safeUrl],
  );
  const [hidden, setHidden] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(!introId);

  useEffect(() => {
    if (!storageKey || qaReview) {
      setHidden(false);
      setPreferenceReady(true);
      return;
    }
    try {
      setHidden(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setHidden(false);
    }
    setPreferenceReady(true);
  }, [qaReview, storageKey]);

  function setIntroHidden(next: boolean) {
    setHidden(next);
    if (!storageKey) return;
    try {
      if (next) window.localStorage.setItem(storageKey, "1");
      else window.localStorage.removeItem(storageKey);
    } catch {
      // The control still works for this page view when storage is unavailable.
    }
  }

  if (safeUrl) {
    return (
      <section className={`w-full ${className ?? ""}`} aria-label={label}>
        {!preferenceReady && !qaReview ? (
          <div className="academy-intro-hidden" role="status">
            <span>Preparing {label.toLowerCase()}…</span>
          </div>
        ) : !hidden || qaReview ? (
          <VideoSlot
            url={safeUrl}
            label={label}
            className="w-full"
            autoplay={autoplay}
            muted={autoplay}
            eager={autoplay}
          />
        ) : (
          <div className="academy-intro-hidden" role="status">
            <span>{label} is hidden on this device.</span>
          </div>
        )}
        {autoplay && (!hidden || qaReview) ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-xs">
            Playing muted. Tap the player for sound.
          </p>
        ) : null}
        {introId && preferenceReady && !qaReview ? (
          <button
            type="button"
            className="academy-intro-toggle"
            aria-pressed={hidden}
            onClick={() => setIntroHidden(!hidden)}
          >
            {hidden ? "Show intro video" : "Don't show this intro again"}
          </button>
        ) : null}
      </section>
    );
  }

  if (!qaReview) {
    if (!alwaysVisible) return null;
    return (
      <section className={`w-full ${className ?? ""}`} aria-label={label}>
        <div className="academy-vsl-poster">
          <span className="academy-eyebrow">{label}</span>
          <p>{placeholderNote}</p>
          {placeholderCta ? (
            <a className="academy-text-button" href={placeholderCta.href}>
              {placeholderCta.label}
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`w-full ${className ?? ""}`} aria-label={label}>
      <p className="label-mono mb-2">{label}</p>
      <div className="aspect-video w-full overflow-hidden rounded-md border border-dashed border-[color:var(--gold)] bg-[color:var(--surface)] shadow-[0_0_36px_rgba(20,241,170,0.08)]">
        <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center">
          <p className="font-heading text-sm text-foreground sm:text-base">
            {autoplay ? "Autoplay video embed slot" : "Video embed slot"}
          </p>
          <p className="mt-2 max-w-md break-all font-mono text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
            {envKey}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">
            Responsive 16:9 · {autoplay ? "autoplay muted · tap for sound" : "tap to play"} · hidden
            publicly until a valid URL is added
          </p>
        </div>
      </div>
    </section>
  );
}
