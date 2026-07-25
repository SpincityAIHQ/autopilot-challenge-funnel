import { VideoSlot } from "./VideoSlot";
import { normalizeVideoEmbedUrl } from "@/lib/video-embed";
import {
  publishedTexts,
  testimonialVideoUrl,
  type TestimonialPageKey,
} from "@/lib/testimonials";

/**
 * Reusable testimonial section — renders NOTHING when no approved video
 * URL is configured AND no published text testimonials exist. This is by
 * design: public pages never show empty testimonial slots, "Coming soon"
 * cards, fake names, or placeholder quotes.
 *
 * When rendered, always includes an honest results disclaimer that cannot
 * be turned off per page.
 */
export function TestimonialSection({
  page,
  eyebrow = "From the family",
  heading = "What people say after they build with us",
  className,
}: {
  page: TestimonialPageKey;
  eyebrow?: string;
  heading?: string;
  className?: string;
}) {
  // Validate the video URL BEFORE deciding whether the section has any
  // content. A malformed/off-allowlist URL normalizes to null and MUST
  // NOT keep an otherwise-empty section on the page.
  const videoUrl = normalizeVideoEmbedUrl(testimonialVideoUrl(page));
  const texts = publishedTexts(page);

  if (!videoUrl && texts.length === 0) return null;

  return (
    <section
      className={`mx-auto max-w-5xl px-5 py-16 ${className ?? ""}`}
      aria-labelledby={`testimonials-${page}`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={`testimonials-${page}`}
        className="mt-3 font-heading text-2xl text-foreground sm:text-3xl"
      >
        {heading}
      </h2>

      {videoUrl ? (
        <VideoSlot
          url={videoUrl}
          label="Watch: a member of the family"
          className="mt-6 max-w-3xl"
        />
      ) : null}

      {texts.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {texts.map((t, i) => (
            <li key={`${page}-${i}-${t.name}`} className="surface-raised p-5">
              <blockquote className="text-sm text-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-4 border-t border-border pt-3 text-xs">
                <p className="font-heading text-foreground">{t.name}</p>
                {t.roleCompany ? (
                  <p className="text-muted-foreground">{t.roleCompany}</p>
                ) : null}
                {t.verifiedResult ? (
                  <p className="mt-2 text-[color:var(--emerald-signal)]">
                    Verified: {t.verifiedResult}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Every quote here has been shared with permission by a real member of
        the NuAmenti family. Individual results vary — no income outcome is
        guaranteed.
      </p>
    </section>
  );
}
