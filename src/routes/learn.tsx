import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame, TicketBadge } from "@/components/AcademyFrame";
import { WatchMap } from "@/components/WatchMap";
import {
  LESSONS,
  lessonHref,
  nextStep,
  tierAllows,
  type LessonProgress,
  type Offer,
  type Ticket,
} from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { supabase } from "@/integrations/supabase/client";
import type { LearningGuidance } from "@/lib/academy-guidance";
export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "My learning | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Learn,
});
type Dashboard = {
  progress: LessonProgress[];
  grants: string[];
  ticket: Ticket;
  nextOffer: Offer | null;
  connected: string[];
  booking: { eligible: boolean; configured: boolean };
  stats: {
    lessonsStarted: number;
    checksCompleted: number;
    workApproved: number;
    minutesWatched: number;
  };
  guidance?: LearningGuidance | null;
};
function Learn() {
  const session = useAcademySession();
  return <LearningSession key={session.email ?? "anonymous"} session={session} />;
}
function LearningSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState<"all" | "summit" | "accelerator">("all");
  useEffect(() => {
    if (session.email)
      academyApi<Dashboard>("dashboard")
        .then(setData)
        .catch((e) => setError(e.message));
    else setData(null);
  }, [session.email]);
  const visible = LESSONS.filter((l) =>
    group === "all"
      ? l.kind === "lesson" || (data?.ticket.accelerator ?? false)
      : group === "summit"
        ? l.tier !== "accelerator"
        : l.tier === "accelerator",
  );
  return (
    <AcademyFrame ticket={data?.ticket}>
      <section className="academy-section">
        <div className="academy-class-head">
          <div className="academy-section-heading" style={{ marginBottom: 0 }}>
            <p className="academy-eyebrow">My learning</p>
            <h1>Keep building from where you are.</h1>
            <p>
              Watching introduces the idea. Practice makes it useful. Your work shows what you can
              do.
            </p>
          </div>
          <TicketBadge ticket={data?.ticket} />
        </div>
        {!session.loading && !session.email ? (
          <div className="academy-card" style={{ marginTop: 28 }}>
            <p>Sign in to see your saved progress and continue your activity book.</p>
            <a href="/join" className="academy-button">
              Sign in or join free
            </a>
          </div>
        ) : null}
        <p role="status" className="academy-status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {data ? (
          <>
            <div className="academy-two">
              <div className="academy-card academy-card-featured academy-spin-summary">
                <p className="academy-eyebrow">AI Spin · Your next step</p>
                <h2>{data.guidance?.title ?? "Make the next lesson useful."}</h2>
                <p>
                  {data.guidance?.message ??
                    "Ask AI Spin to explain an idea or help you apply it to your business. Your watch maps and saved work guide the conversation."}
                </p>
                <div className="academy-actions">
                  <a className="academy-button" href={data.guidance?.href ?? "/ai-spin"}>
                    {data.guidance ? "Open this lesson" : "Talk to AI Spin"}
                  </a>
                  {data.guidance ? (
                    <a className="academy-text-button" href="/ai-spin">
                      Talk to AI Spin
                    </a>
                  ) : null}
                </div>
              </div>
              {data.nextOffer ? (
                <div className="academy-card academy-card-gold academy-spin-summary">
                  <p className="academy-eyebrow">When you are ready · {data.nextOffer.label}</p>
                  <h2>{data.nextOffer.name}</h2>
                  <p>{data.nextOffer.includes}.</p>
                  <div className="academy-actions">
                    <a
                      className="academy-button academy-button-secondary"
                      href={data.nextOffer.tier === "accelerator" ? "/accelerator" : "/summit"}
                    >
                      See what it unlocks
                    </a>
                    <a className="academy-text-button" href="/redeem">
                      Redeem a purchase code
                    </a>
                  </div>
                </div>
              ) : (
                <div className="academy-card academy-card-gold academy-spin-summary">
                  <p className="academy-eyebrow">Accelerator</p>
                  <h2>Book time with SpinCity.</h2>
                  <p>Your ticket includes 1-on-1 sessions. Bring a real workflow and a question.</p>
                  <a className="academy-button academy-button-secondary" href="/book">
                    Book a 1-on-1
                  </a>
                </div>
              )}
            </div>
            <div className="academy-progress-strip">
              <span>
                Lessons started <strong>{data.stats.lessonsStarted}</strong>
              </span>
              <span>
                Minutes watched <strong>{data.stats.minutesWatched}</strong>
              </span>
              <span>
                Knowledge checks <strong>{data.stats.checksCompleted}</strong>
              </span>
              <span>
                Applied skills reviewed <strong>{data.stats.workApproved}</strong>
              </span>
            </div>
            <div className="academy-chips" style={{ marginBottom: 20 }}>
              {(
                [
                  ["all", "Everything"],
                  ["summit", "Free + Summit"],
                  ["accelerator", "Accelerator days"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setGroup(k)}
                  aria-pressed={group === k}
                  style={
                    group === k
                      ? { borderColor: "rgba(94,240,176,.45)", color: "var(--ap-green)" }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="academy-learning-grid">
              {visible.map((l) => {
                const p = data.progress.find((p) => p.lesson_id === l.id);
                const unlocked = tierAllows(data.grants, l.tier);
                const connected = data.connected.includes(l.id);
                return (
                  <article className="academy-card" key={l.id} data-locked={!unlocked}>
                    <p className="academy-eyebrow">{l.stage}</p>
                    <h2>{l.title}</h2>
                    <p>{l.summary}</p>
                    {p?.duration ? (
                      <WatchMap
                        intervals={p.intervals}
                        duration={p.duration}
                        position={p.position}
                        compact
                      />
                    ) : (
                      <p className="academy-muted">
                        {unlocked
                          ? connected
                            ? "No viewing recorded yet."
                            : "Recording not connected yet."
                          : "Unlocks with the matching ticket."}
                      </p>
                    )}
                    <p className="academy-muted">
                      {unlocked
                        ? nextStep(p, l.kind)
                        : "Explore this next stage when you are ready."}
                    </p>
                    <a
                      className={`academy-button ${unlocked ? "" : "academy-button-secondary"}`}
                      href={
                        unlocked
                          ? lessonHref(l.id)
                          : l.tier === "accelerator"
                            ? "/accelerator"
                            : "/summit"
                      }
                    >
                      {unlocked ? (p ? "Continue" : "Open") : "Explore access"}
                    </a>
                  </article>
                );
              })}
            </div>
            <hr className="academy-rule" />
            <div className="academy-actions">
              <button
                className="academy-text-button"
                onClick={async () => {
                  try {
                    await academyApi("preferences", { marketingConsent: false });
                    setError("Optional marketing emails are turned off.");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Turn off optional marketing emails
              </button>
              <button
                className="academy-text-button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.assign("/");
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
