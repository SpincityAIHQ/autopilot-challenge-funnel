import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { Progress } from "@/components/ui/progress";
import { LESSONS, coverage, nextStep, tierAllows, type LessonProgress } from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "My learning | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Learn,
});
function Learn() {
  const session = useAcademySession();
  return <LearningSession key={session.email ?? "anonymous"} session={session} />;
}
function LearningSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [data, setData] = useState<{ progress: LessonProgress[]; grants: string[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session.email)
      academyApi<{ progress: LessonProgress[]; grants: string[] }>("dashboard")
        .then(setData)
        .catch((e) => setError(e.message));
    else setData(null);
  }, [session.email]);
  return (
    <AcademyFrame>
      <section className="academy-section">
        <div className="academy-section-heading">
          <p className="academy-eyebrow">MY LEARNING</p>
          <h1>Keep building from where you are.</h1>
          <p>
            Watching introduces the idea. Practice makes it useful. Your work shows what you can do.
          </p>
        </div>
        {!session.loading && !session.email ? (
          <div className="academy-card">
            <p>Sign in to see your saved progress and continue your activity book.</p>
            <a href="/join" className="academy-button">
              Sign in or join free
            </a>
          </div>
        ) : null}
        <p role="status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {data ? (
          <>
            <div className="academy-progress-strip">
              <span>
                Lessons started <strong>{data.progress.length}</strong>
              </span>
              <span>
                Knowledge checks{" "}
                <strong>{data.progress.filter((p) => p.quiz_score !== null).length}</strong>
              </span>
              <span>
                Applied skills reviewed{" "}
                <strong>
                  {data.progress.filter((p) => p.workbook_status === "approved").length}
                </strong>
              </span>
            </div>
            <div className="academy-learning-grid">
              {LESSONS.map((l) => {
                const p = data.progress.find((p) => p.lesson_id === l.id);
                const unlocked = tierAllows(data.grants, l.tier);
                return (
                  <article className="academy-card" key={l.id}>
                    <p className="academy-eyebrow">{l.stage}</p>
                    <h2>{l.title}</h2>
                    <p>{l.summary}</p>
                    <div className="academy-learning-progress">
                      <label>
                        Video coverage{" "}
                        <span>
                          {p?.duration
                            ? `${coverage(p.intervals, p.duration)}%`
                            : "No viewing recorded"}
                        </span>
                      </label>
                      <Progress value={p?.duration ? coverage(p.intervals, p.duration) : 0} />
                    </div>
                    <p className="academy-muted">
                      {unlocked ? nextStep(p) : "Explore this next stage when you are ready."}
                    </p>
                    <a
                      className="academy-button academy-button-secondary"
                      href={
                        unlocked
                          ? l.id === "free-webinar"
                            ? "/class"
                            : `/lesson/${l.id}`
                          : l.tier === "accelerator"
                            ? "/accelerator"
                            : "/summit"
                      }
                    >
                      {unlocked ? (p ? "Continue learning" : "Open lesson") : "Explore access"}
                    </a>
                  </article>
                );
              })}
            </div>
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
            <br />
            <button
              className="academy-text-button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign("/");
              }}
            >
              Sign out
            </button>
          </>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
