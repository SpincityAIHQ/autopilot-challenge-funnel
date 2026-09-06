import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AcademyFrame, TicketBadge } from "@/components/AcademyFrame";
import { LiveSpinAvatar } from "@/components/LiveSpinAvatar";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { formatTime, type LessonMeta, type Offer, type Ticket } from "@/lib/academy";
import type { LearningGuidance } from "@/lib/academy-guidance";
type Context = {
  lessons: LessonMeta[];
  connected: string[];
  ticket: Ticket;
  nextOffer: Offer | null;
  booking: { eligible: boolean; configured: boolean };
  stats: {
    lessonsStarted: number;
    checksCompleted: number;
    workSubmitted: number;
    workApproved: number;
    minutesWatched: number;
  };
  guidance: LearningGuidance | null;
  viewing: { lessonId: string; coverage: number; dropOffAt: number | null }[];
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
    [thread, setThread] = useState<{ role: "user" | "spin"; text: string }[]>([]),
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
          if (!mounted.current) return;
          setContext(c);
          if (c.guidance?.lessonId) setLesson(c.guidance.lessonId);
        })
        .catch((e) => {
          if (mounted.current) setError(e.message);
        });
    return () => {
      mounted.current = false;
    };
  }, [session.email]);
  async function ask(text: string) {
    const q = text.trim();
    if (lock.current || !consent || !context?.tutorReady || !q) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setQuestion("");
    setThread((t) => [...t, { role: "user", text: q }]);
    try {
      const r = await academyApi<{ answer: string }>("tutor", {
        lessonId: lesson,
        question: q,
        aiConsent: true,
      });
      if (mounted.current) {
        setAnswer(r.answer);
        setThread((t) => [...t, { role: "spin", text: r.answer }]);
      }
    } catch (e) {
      if (mounted.current) setThread((t) => [...t, { role: "spin", text: (e as Error).message }]);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const current = context?.viewing.find((v) => v.lessonId === lesson);
  const prompts = [
    current && current.dropOffAt !== null
      ? `I stopped at ${formatTime(current.dropOffAt)}. What did I miss?`
      : "Where should I start today?",
    "What is my next step?",
    "Help me apply this lesson to my business.",
    context?.nextOffer
      ? "What would the next stage unlock for me?"
      : "What should I prepare for my 1-on-1?",
  ];
  return (
    <AcademyFrame ticket={context?.ticket}>
      <section className="academy-section">
        <div className="academy-class-head">
          <div>
            <p className="academy-eyebrow">Your AI learning guide · Always on</p>
            <h1>Build with AI Spin.</h1>
          </div>
          <TicketBadge ticket={context?.ticket} />
        </div>
        <p className="academy-lead">
          AI Spin knows your ticket, your watch maps and your saved work. Ask a question, work
          through an example, find the part you missed, and choose your next step. Instructors
          review applied skills.
        </p>
        {!session.email && !session.loading ? (
          <a className="academy-button" href="/join">
            Sign in to chat with AI Spin
          </a>
        ) : null}
        <p role="status" className="academy-status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {context ? (
          <>
            <div className="academy-progress-strip">
              <span>
                Lessons started <strong>{context.stats.lessonsStarted}</strong>
              </span>
              <span>
                Minutes watched <strong>{context.stats.minutesWatched}</strong>
              </span>
              <span>
                Knowledge checks <strong>{context.stats.checksCompleted}</strong>
              </span>
              <span>
                Applied work approved <strong>{context.stats.workApproved}</strong>
              </span>
            </div>
            {context.guidance ? (
              <div className="academy-card academy-card-featured academy-spin-summary">
                <p className="academy-eyebrow">AI Spin · Your next step</p>
                <h2>{context.guidance.title}</h2>
                <p>{context.guidance.message}</p>
                <a className="academy-text-button" href={context.guidance.href}>
                  Open this lesson →
                </a>
              </div>
            ) : null}
            <div className="academy-spin-grid">
              <section className="academy-card">
                <div className="academy-panel-heading">
                  <span className="academy-pulse" aria-hidden="true" />
                  <h2>Chat with AI Spin</h2>
                </div>
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
                        {l.stage} — {l.title}
                        {context.connected.includes(l.id) ? "" : " (recording soon)"}
                      </option>
                    ))}
                  </select>
                </label>
                {current ? (
                  <p className="academy-muted">
                    {current.coverage}% watched
                    {current.dropOffAt !== null
                      ? ` · you stopped at ${formatTime(current.dropOffAt)}`
                      : " · complete"}
                  </p>
                ) : null}
                <label className="academy-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Use my question, current lesson, viewing and saved lesson work to provide feedback
                  through {context.tutorProvider}.
                </label>
                <div className="academy-chips">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={busy || !consent || !context.tutorReady}
                      onClick={() => void ask(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {thread.length ? (
                  <div className="academy-thread" role="log" aria-live="polite">
                    {thread.map((m, i) => (
                      <div className="academy-bubble" data-role={m.role} key={i}>
                        <small>{m.role === "user" ? "You" : "AI Spin"}</small>
                        {m.text}
                      </div>
                    ))}
                    {busy ? (
                      <div className="academy-bubble" data-role="spin">
                        <small>AI Spin</small>
                        <span className="academy-pulse" />
                        Thinking…
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
                  <p className="academy-muted">
                    Chat is being connected. Your lesson notes and saved work remain available.
                  </p>
                ) : null}
                <p className="academy-muted">
                  AI Spin is Spin’s AI assistant, not a personal conversation with Spin. Ask the
                  instructor when an answer needs human judgment.
                </p>
              </section>
              <div>
                <LiveSpinAvatar
                  key={lesson}
                  settings={context.avatar}
                  answer={answer}
                  canAsk={consent && context.tutorReady}
                  busy={busy}
                  onTranscript={(text) => void ask(text)}
                />
                {context.booking.eligible ? (
                  <div className="academy-card academy-card-gold" style={{ marginTop: 20 }}>
                    <p className="academy-eyebrow">Need Spin personally?</p>
                    <h2>Book a 1-on-1.</h2>
                    <p>Included with your Accelerator ticket.</p>
                    <a
                      className="academy-button academy-button-secondary academy-button-small"
                      href="/book"
                    >
                      Open booking
                    </a>
                  </div>
                ) : context.nextOffer ? (
                  <div className="academy-card academy-card-gold" style={{ marginTop: 20 }}>
                    <p className="academy-eyebrow">When you are ready</p>
                    <h2>{context.nextOffer.name}</h2>
                    <p>{context.nextOffer.includes}.</p>
                    <a
                      className="academy-button academy-button-secondary academy-button-small"
                      href={context.nextOffer.tier === "accelerator" ? "/accelerator" : "/summit"}
                    >
                      See what it unlocks
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
