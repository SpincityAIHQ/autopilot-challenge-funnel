import { useEffect, useRef, useState, type FormEvent } from "react";
import { AcademyFrame, GuideAvatar, TicketBadge } from "./AcademyFrame";
import { LiveSpinAvatar } from "./LiveSpinAvatar";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import {
  GUIDES,
  formatTime,
  type Guide,
  type LessonMeta,
  type Offer,
  type Ticket,
} from "@/lib/academy";
import type { LearningGuidance } from "@/lib/academy-guidance";
type Context = {
  lessons: LessonMeta[];
  connected: string[];
  ticket: Ticket;
  guide: Guide;
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
/**
 * The guide room. `/thoth` is the public tutor room for every ticket; `/ai-spin`
 * is Spin’s own AI with the live avatar, inside the Accelerator only.
 */
export function GuideRoom({ room }: { room: "thoth" | "spin" }) {
  const session = useAcademySession();
  return (
    <GuideSession key={`${room}:${session.email ?? "anonymous"}`} session={session} room={room} />
  );
}
function GuideSession({
  session,
  room,
}: {
  session: ReturnType<typeof useAcademySession>;
  room: "thoth" | "spin";
}) {
  const guide = GUIDES[room];
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
        guide: room,
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
    room === "spin" && !context?.nextOffer
      ? "What should I prepare for my 1-on-1?"
      : "What would the next stage unlock for me?",
  ];
  return (
    <AcademyFrame ticket={context?.ticket}>
      <section className="academy-section">
        <div className="academy-class-head">
          <div className="academy-spin-hero">
            <GuideAvatar guide={guide} size={96} pulse={busy} />
            <div>
              <p className="academy-eyebrow">
                {room === "spin"
                  ? "Spin’s AI · Inside the Accelerator"
                  : "Your tutor · Every ticket"}
              </p>
              <h1>{room === "spin" ? "Build with AI Spin." : "Learn with Thoth."}</h1>
            </div>
          </div>
          <TicketBadge ticket={context?.ticket} />
        </div>
        <p className="academy-lead">
          {room === "spin"
            ? "Spin’s own AI, in text and live avatar. It knows your ticket, your build-room watch maps and your job card. Bring the work; leave with the next move."
            : "Thoth knows your ticket, your watch maps, every timed word of every recording and your saved work. Ask a question, find the part you missed, and choose your next step. Instructors review applied skills."}
        </p>
        {!session.email && !session.loading ? (
          <a className="academy-button" href="/join">
            Sign in to chat with {guide.name}
          </a>
        ) : null}
        <p role="status" className="academy-status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {context && room === "spin" && !context.ticket.accelerator ? (
          <div className="academy-card academy-card-gold">
            <p className="academy-eyebrow">Inside the Accelerator</p>
            <h2>AI Spin builds with Accelerator members.</h2>
            <p>
              Your ticket is {context.ticket.label}. On this floor, Thoth is your tutor and knows
              everything you have watched and saved. AI Spin, Spin’s own AI with the live avatar,
              opens with the Autopilot Accelerator.
            </p>
            <div className="academy-actions">
              <a className="academy-button" href="/thoth">
                Talk to Thoth
              </a>
              <a className="academy-button academy-button-secondary" href="/accelerator">
                Explore the Accelerator
              </a>
            </div>
          </div>
        ) : context ? (
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
                <p className="academy-eyebrow">{guide.name} · Your next step</p>
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
                  <GuideAvatar guide={guide} size={40} pulse={busy} />
                  <h2>Chat with {guide.name}</h2>
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
                    {thread.map((m, i) =>
                      m.role === "user" ? (
                        <div className="academy-bubble" data-role="user" key={i}>
                          <small>You</small>
                          {m.text}
                        </div>
                      ) : (
                        <div className="academy-bubble" data-role="spin" key={i}>
                          <GuideAvatar guide={guide} size={34} />
                          <div>
                            <small>{guide.name}</small>
                            {m.text}
                          </div>
                        </div>
                      ),
                    )}
                    {busy ? (
                      <div className="academy-bubble" data-role="spin">
                        <GuideAvatar guide={guide} size={34} pulse />
                        <div>
                          <small>{guide.name}</small>
                          Thinking…
                        </div>
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
                    {busy ? `${guide.name} is thinking…` : `Ask ${guide.name}`}
                  </button>
                </form>
                {!context.tutorReady ? (
                  <p className="academy-muted">
                    Chat is being connected. Your lesson notes and saved work remain available.
                  </p>
                ) : null}
                <p className="academy-muted">
                  {room === "spin"
                    ? "AI Spin is Spin’s AI representation, not a personal conversation with Spin."
                    : "Thoth is an AI tutor teaching from Spin’s recordings, not Spin."}{" "}
                  Ask the instructor when an answer needs human judgment.
                </p>
              </section>
              <div>
                {room === "spin" ? (
                  <LiveSpinAvatar
                    key={lesson}
                    settings={context.avatar}
                    answer={answer}
                    canAsk={consent && context.tutorReady}
                    busy={busy}
                    onTranscript={(text) => void ask(text)}
                  />
                ) : (
                  <div className="academy-card academy-holo">
                    <div className="academy-panel-heading">
                      <GuideAvatar guide={guide} size={40} />
                      <h2>How Thoth works</h2>
                    </div>
                    <p>{guide.tagline}</p>
                    <p className="academy-muted">
                      Thoth reads your watch maps, the timed transcript of every recording and your
                      activity sheet. Ask what you missed, where Spin explains something, or what
                      your next step is for your ticket.
                    </p>
                    {context.ticket.accelerator ? (
                      <a className="academy-text-button" href="/ai-spin">
                        You hold the Accelerator: open AI Spin →
                      </a>
                    ) : null}
                  </div>
                )}
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
