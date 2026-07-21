function getSafeHeyGenEmbed(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "labs.heygen.com")
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * AI Spin stays hidden until the real HeyGen session is ready and its
 * conversation limits have been verified. Public visitors never see an
 * internal placeholder or a false "live" state.
 */
export function AiSpinAvatar({ className }: { className?: string }) {
  const env = import.meta.env as Record<string, string | undefined>;
  const enabled = env.VITE_AI_SPIN_ENABLED === "true";
  const limitsVerified = env.VITE_AI_SPIN_LIMITS_VERIFIED === "true";
  const embedUrl = getSafeHeyGenEmbed(env.VITE_HEYGEN_LIVE_AVATAR_EMBED_URL);

  if (!enabled || !limitsVerified || !embedUrl) return null;

  return (
    <section
      aria-labelledby="ai-spin-h"
      className={`mx-auto max-w-4xl px-5 py-16 ${className ?? ""}`}
    >
      <p className="eyebrow">AI Spin</p>
      <h2
        id="ai-spin-h"
        className="mt-3 font-heading text-2xl text-foreground sm:text-3xl"
      >
        Not sure which ticket fits?
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        I’m AI Spin, an AI avatar—not live Spin. I will ask three short
        questions and point you to the lowest ticket that fits. This chat ends
        after five messages or four minutes.
      </p>

      <div className="mt-6 flex justify-center">
        <div
          className="relative w-full max-w-xs overflow-hidden rounded-md border border-[color:var(--gold-soft)] bg-[color:var(--surface)]"
          style={{ aspectRatio: "9 / 16" }}
        >
          <iframe
            src={embedUrl}
            title="AI Spin ticket guide"
            allow="microphone; autoplay; encrypted-media"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </section>
  );
}
