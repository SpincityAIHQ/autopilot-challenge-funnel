/**
 * AI Spin — Live avatar placeholder.
 *
 * Reserved container for a HeyGen streaming avatar embed. Portrait,
 * video-call-tile shape, Diamond Standard palette. No integration or
 * conversational logic is implemented here on purpose — paste the real
 * HeyGen embed (script/iframe) into the marked slot below when ready.
 */
export function AiSpinAvatar({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="ai-spin-h"
      className={`mx-auto max-w-4xl px-5 py-16 ${className ?? ""}`}
    >
      <p className="eyebrow">AI Spin — Live</p>
      <h2
        id="ai-spin-h"
        className="mt-3 font-heading text-2xl text-foreground sm:text-3xl"
      >
        Ask AI Spin about the Challenge
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        A live streaming avatar tile will appear here. This is a reserved
        placeholder — no conversational logic is active yet.
      </p>

      <div className="mt-6 flex justify-center">
        <div
          className="relative w-full max-w-xs overflow-hidden rounded-md border border-[color:var(--gold-soft)] bg-[color:var(--surface)]"
          style={{ aspectRatio: "9 / 16" }}
        >
          {/*
            === HEYGEN EMBED SLOT ===
            Paste the HeyGen streaming avatar iframe/script here when
            provisioned. Keep the portrait aspect ratio and the outer
            container styles intact so it reads as a video-call tile.
            Example (do NOT enable until keys/domain are approved):

              <iframe
                src="https://labs.heygen.com/streaming-embed?share=..."
                title="AI Spin — Live"
                allow="microphone; camera; autoplay; encrypted-media"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
          */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div
              aria-hidden
              className="h-16 w-16 rounded-full border border-[color:var(--gold)]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, var(--gold), var(--gold-soft) 60%, transparent 75%)",
              }}
            />
            <p className="font-display text-sm tracking-[0.28em] text-[color:var(--gold)]">
              AI SPIN
            </p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Live avatar · coming soon
            </p>
          </div>
          {/* subtle "on air" dot */}
          <span
            aria-hidden
            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--emerald-signal)", boxShadow: "0 0 8px var(--emerald-signal)" }}
          />
        </div>
      </div>
    </section>
  );
}
