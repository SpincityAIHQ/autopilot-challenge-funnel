import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { LiveSpinAvatar } from "@/components/LiveSpinAvatar";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import type { LessonMeta } from "@/lib/academy";
import type { LearningGuidance } from "@/lib/academy-guidance";
type Context = {
  lessons: LessonMeta[];
  stats: {
    lessonsStarted: number;
    checksCompleted: number;
    workSubmitted: number;
    workApproved: number;
  };
  guidance: LearningGuidance | null;
  tutorReady: boolean;
  tutorProvider: string;
  avatar: { eligible: boolean; ready: boolean; sessionSeconds: number; dailySeconds: number };
};
export const Route = createFileRoute("/ai-spin")({
  head: () => ({
    meta: [{ title: "AI Spin | AI AutoPilot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Spin,
});
function Spin() {
  const session = useAcademySession();
  return <SpinSession key={session.email ?? "anonymous"} session={session} />;
}
function SpinSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [context, setContext] = useState<Context | null>(null),
    [lesson, setLesson] = useState("free-webinar"),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (session.email)
      academyApi<Context>("ai-spin")
        .then((c) => {
          if (mounted.current) setContext(c);
        })
        .catch((e) => {
          if (mounted.current) setError(e.message);
        });
    return () => {
      mounted.current = false;
    };
  }, [session.email]);
  async function ask(text: string) {
    if (lock.current || !consent || !context?.tutorReady) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setQuestion(text);
    try {
      const r = await academyApi<{ answer: string }>("tutor", {
        lessonId: lesson,
        question: text,
        aiConsent: true,
      });
      if (mounted.current) setAnswer(r.answer);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <AcademyFrame>
      <section className="academy-section">
        <p className="academy-eyebrow">YOUR AI LEARNING ASSISTANT</p>
        <h1>Build with AI Spin.</h1>
        <p className="academy-lead">
          Ask questions, work through an example and choose your next step. AI Spin uses approved
          lesson notes and your saved work. Instructors review applied skills.
        </p>
        {!session.email && !session.loading ? (
          <a className="academy-button" href="/join">
            Sign in to chat with AI Spin
          </a>
        ) : null}
        <p role="status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {context ? (
          <>
            <div className="academy-progress-strip">
              <span>
                Lessons started <strong>{context.stats.lessonsStarted}</strong>
              </span>
              <span>
                Knowledge checks <strong>{context.stats.checksCompleted}</strong>
              </span>
              <span>
                Applied work approved <strong>{context.stats.workApproved}</strong>
              </span>
            </div>
            {context.guidance ? (
              <div className="academy-card">
                <h2>{context.guidance.title}</h2>
                <p>{context.guidance.message}</p>
                <a className="academy-text-button" href={context.guidance.href}>
                  Open this lesson
                </a>
              </div>
            ) : null}
            <div className="academy-spin-grid">
              <section className="academy-card">
                <h2>Chat with AI Spin</h2>
                <label>
                  Current lesson
                  <select
                    value={lesson}
                    disabled={busy}
                    onChange={(e) => {
                      setLesson(e.target.value);
                      setAnswer("");
                    }}
                  >
                    {context.lessons.map((l) => (
                      <option value={l.id} key={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="academy-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Use my question, current lesson and saved lesson work to provide feedback through{" "}
                  {context.tutorProvider}.
                </label>
                <form
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    void ask(question);
                  }}
                >
                  <label>
                    Your question
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={1500}
                      rows={4}
                      placeholder="Help me apply this lesson to my business."
                      required
                    />
                  </label>
                  <button
                    className="academy-button"
                    disabled={busy || !consent || !context.tutorReady}
                  >
                    {busy ? "AI Spin is thinking…" : "Ask AI Spin"}
                  </button>
                </form>
                {!context.tutorReady ? (
                  <p>Chat is being connected. Your lesson notes and saved work remain available.</p>
                ) : null}
                <p role="status" className="academy-tutor-reply">
                  {answer}
                </p>
                <p className="academy-muted">
                  AI Spin is Spin’s AI assistant, not a personal conversation with Spin. Ask the
                  instructor when an answer needs human judgment.
                </p>
              </section>
              <LiveSpinAvatar
                key={lesson}
                settings={context.avatar}
                answer={answer}
                canAsk={consent && context.tutorReady}
                busy={busy}
                onTranscript={(text) => void ask(text)}
              />
            </div>
          </>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
