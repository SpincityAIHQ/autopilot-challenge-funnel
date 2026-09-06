import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, PlayCircle } from "lucide-react";
import { AcademyFrame, TicketBadge } from "./AcademyFrame";
import { TrackedLessonVideo } from "./TrackedLessonVideo";
import { VimeoLessonPlayer } from "./VimeoLessonPlayer";
import { WatchMap } from "./WatchMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LESSONS,
  formatTime,
  lessonHref,
  nextStep,
  tierAllows,
  watchSummary,
  type LessonContent,
  type LessonProgress,
  type Ticket,
} from "@/lib/academy";
import { academyApi, useAcademySession, useCatalogue } from "@/lib/academy-client";

export function AcademyClassroom({ lessonId }: { lessonId: string }) {
  const session = useAcademySession();
  return (
    <ClassroomSession
      key={`${lessonId}:${session.email ?? "anonymous"}`}
      lessonId={lessonId}
      session={session}
    />
  );
}
const GROUPS: { label: string; match: (stage: string) => boolean }[] = [
  { label: "Free training", match: (s) => s === "Free training" },
  {
    label: "Summit",
    match: (s) => s.startsWith("Summit") || s.startsWith("VIP") || s.startsWith("Emerald"),
  },
  { label: "Accelerator", match: (s) => s.startsWith("Accelerator") },
];
function ClassroomSession({
  lessonId,
  session,
}: {
  lessonId: string;
  session: ReturnType<typeof useAcademySession>;
}) {
  const meta = LESSONS.find((l) => l.id === lessonId);
  const catalogue = useCatalogue();
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [progress, setProgress] = useState<LessonProgress>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{
    score: number;
    total: number;
    feedback: { correct: boolean; text: string }[];
  } | null>(null);
  const [book, setBook] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<{ role: "user" | "spin"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [tutorReady, setTutorReady] = useState(false);
  const [tutorProvider, setTutorProvider] = useState("");
  const [seek, setSeek] = useState<{ at: number; nonce: number } | null>(null);
  const grants = ticket
    ? [
        ...(ticket.summit === "free" ? [] : [ticket.summit]),
        ...(ticket.accelerator ? ["accelerator"] : []),
      ]
    : [];
  async function load() {
    const result = await academyApi<{
      lesson: LessonContent;
      progress?: LessonProgress;
      ticket?: Ticket;
      tutorReady: boolean;
      tutorProvider?: string;
    }>(`lesson?lessonId=${encodeURIComponent(lessonId)}`);
    setLesson(result.lesson);
    setProgress(result.progress);
    setTicket(result.ticket ?? null);
    setTutorReady(result.tutorReady);
    setTutorProvider(result.tutorProvider ?? "");
    return result;
  }
  useEffect(() => {
    setLesson(null);
    setError("");
    setFeedback(null);
    setThread([]);
    setAnswers([]);
    setBook({});
    if (session.loading) return;
    let active = true;
    load()
      .then((r) => {
        if (active) setBook(r.progress?.workbook ?? {});
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [lessonId, session.loading, session.email]);
  async function save(kind: "workbook" | "quiz", submit = false) {
    if (!session.email) {
      setStatus("Sign in to save your work and feedback.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await academyApi<{
        score: number;
        total: number;
        feedback: { correct: boolean; text: string }[];
      }>("progress", {
        kind,
        lessonId,
        contentVersion: lesson?.version,
        answers,
        workbook: book,
        submit,
        eventId: crypto.randomUUID(),
      });
      if (kind === "quiz") setFeedback(result);
      await load();
      setStatus(
        kind === "quiz"
          ? "Knowledge check saved."
          : submit
            ? "Submitted for instructor review."
            : "Activity book saved.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    setThread((t) => [...t, { role: "user", text: q }]);
    try {
      const r = await academyApi<{ answer: string }>("tutor", {
        lessonId,
        question: q,
        aiConsent,
      });
      setThread((t) => [...t, { role: "spin", text: r.answer }]);
    } catch (e) {
      setThread((t) => [...t, { role: "spin", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }
  const isSession = meta?.kind === "session";
  const watch = watchSummary(progress);
  const media = lesson?.media ?? null;
  const prompts = [
    watch.dropOffAt !== null && watch.coverage > 0
      ? `I stopped at ${formatTime(watch.dropOffAt)}. What did I miss?`
      : "What is the one thing I should take from this lesson?",
    "Help me apply this to my business.",
    "What is my next step?",
  ];
  return (
    <AcademyFrame ticket={ticket}>
      <div className="academy-workspace">
        <aside className="academy-outline">
          <p className="academy-eyebrow">Your flight plan</p>
          {GROUPS.map((g) => {
            const items = LESSONS.filter((l) => g.match(l.stage));
            return (
              <div className="academy-outline-group" key={g.label}>
                <span className="academy-label">{g.label}</span>
                <nav aria-label={`${g.label} lessons`}>
                  {items.map((l) => {
                    const i = LESSONS.indexOf(l);
                    const locked = ticket ? !tierAllows(grants, l.tier) : l.tier !== "free";
                    const connected = catalogue ? catalogue.connected.includes(l.id) : true;
                    return (
                      <a
                        key={l.id}
                        href={
                          locked
                            ? l.tier === "accelerator"
                              ? "/accelerator"
                              : "/summit"
                            : lessonHref(l.id)
                        }
                        aria-current={l.id === lessonId ? "page" : undefined}
                        data-locked={locked}
                        data-connected={connected}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <small>{l.stage}</small>
                          {l.title}
                          {l.id === lessonId && progress?.duration ? (
                            <span className="academy-outline-progress" aria-hidden="true">
                              <i style={{ width: `${watch.coverage}%` }} />
                            </span>
                          ) : null}
                        </div>
                      </a>
                    );
                  })}
                </nav>
              </div>
            );
          })}
          <a className="academy-text-button" href="/learn">
            View my progress →
          </a>
        </aside>
        <section className="academy-class">
          <div className="academy-class-head">
            <div>
              <p className="academy-eyebrow">{meta?.stage ?? "Lesson"}</p>
              <h1>{meta?.title ?? "Lesson unavailable"}</h1>
            </div>
            <TicketBadge ticket={ticket} />
          </div>
          <p className="academy-lead">{meta?.summary}</p>
          {error ? (
            <div className="academy-card" role="status">
              <p>{error}</p>
              <a className="academy-button" href={session.email ? "/summit" : "/join"}>
                {session.email ? "Explore access" : "Sign in or join free"}
              </a>
            </div>
          ) : !lesson ? (
            <p role="status" className="academy-status">
              Loading lesson…
            </p>
          ) : (
            <>
              {media && session.email ? (
                media.provider === "vimeo" ? (
                  <VimeoLessonPlayer
                    key={`${lessonId}:${media.version}`}
                    lessonId={lessonId}
                    media={media}
                    resume={progress?.position}
                    seekTo={seek}
                    onSaved={() => void load()}
                    onError={setStatus}
                  />
                ) : (
                  <TrackedLessonVideo
                    key={`${lessonId}:${media.version}`}
                    lessonId={lessonId}
                    media={media}
                    resume={progress?.position}
                    onSaved={() => void load()}
                    onError={setStatus}
                  />
                )
              ) : (
                <div className="academy-media-empty">
                  <PlayCircle size={40} />
                  <div>
                    <h2>{media ? "Sign in to watch" : "Recording not connected yet"}</h2>
                    <p>
                      {media
                        ? "Keep your place, your watch map and your learning progress in your free account."
                        : isSession
                          ? "This build-room replay will appear here when the recording is connected."
                          : "You can start with the lesson notes and activity below."}
                    </p>
                    {!session.email ? <a href="/join">Join the free classroom →</a> : null}
                  </div>
                </div>
              )}
              {media && session.email ? (
                <WatchMap
                  intervals={progress?.intervals ?? []}
                  duration={progress?.duration || media.duration}
                  position={progress?.position ?? 0}
                  chapters={media.chapters}
                  onSeek={
                    media.provider === "vimeo"
                      ? (at) => setSeek({ at, nonce: Date.now() })
                      : undefined
                  }
                />
              ) : null}
              <div className="academy-progress-strip">
                <span>
                  Watched <strong>{progress?.duration ? `${watch.coverage}%` : "—"}</strong>
                </span>
                <span>
                  Stopped at{" "}
                  <strong>
                    {progress?.duration
                      ? watch.dropOffAt === null
                        ? "Complete"
                        : formatTime(watch.dropOffAt)
                      : "—"}
                  </strong>
                </span>
                {!isSession ? (
                  <>
                    <span>
                      Knowledge{" "}
                      <strong>
                        {progress?.quiz_score !== null && progress?.quiz_score !== undefined
                          ? `${progress.quiz_score}/${progress.quiz_total}`
                          : "Not checked"}
                      </strong>
                    </span>
                    <span>
                      Applied{" "}
                      <strong>
                        {progress?.workbook_status === "approved"
                          ? "Reviewed"
                          : progress?.workbook_status === "submitted"
                            ? "Awaiting review"
                            : "In progress"}
                      </strong>
                    </span>
                  </>
                ) : null}
              </div>
              {isSession ? (
                <section className="academy-next">
                  <p className="academy-eyebrow">Your next step</p>
                  <p>{nextStep(progress, "session")}</p>
                </section>
              ) : (
                <>
                  <Tabs defaultValue="lesson">
                    <TabsList className="academy-tabs">
                      <TabsTrigger value="lesson">Lesson</TabsTrigger>
                      <TabsTrigger value="activity">Activity book</TabsTrigger>
                      <TabsTrigger value="check">Knowledge check</TabsTrigger>
                    </TabsList>
                    <TabsContent value="lesson" className="academy-notes">
                      {lesson.paragraphs.map((p) => (
                        <article key={p.heading}>
                          <h2>{p.heading}</h2>
                          <p>{p.text}</p>
                        </article>
                      ))}
                    </TabsContent>
                    <TabsContent value="activity">
                      <div className="academy-card">
                        <div className="academy-panel-heading">
                          <BookOpen />
                          <h2>Your automation job card</h2>
                        </div>
                        <p>
                          Use a real workflow. Save a draft, then submit it when another person
                          could follow your instructions.
                        </p>
                        {lesson.workbook.map((f) => (
                          <label key={f.id}>
                            {f.label}
                            <small>{f.hint}</small>
                            <textarea
                              rows={3}
                              maxLength={3000}
                              value={book[f.id] ?? ""}
                              onChange={(e) => setBook({ ...book, [f.id]: e.target.value })}
                            />
                          </label>
                        ))}
                        <div className="academy-actions">
                          <button
                            className="academy-button"
                            disabled={busy}
                            onClick={() => save("workbook")}
                          >
                            Save draft
                          </button>
                          <button
                            className="academy-button academy-button-secondary"
                            disabled={busy}
                            onClick={() => save("workbook", true)}
                          >
                            Submit for review
                          </button>
                          <button
                            className="academy-text-button"
                            onClick={() => {
                              const text = lesson.workbook
                                .map((f) => `${f.label}\n${book[f.id] ?? ""}\n`)
                                .join("\n");
                              const url = URL.createObjectURL(
                                new Blob([`${meta?.title}\n\n${text}`], { type: "text/plain" }),
                              );
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${lessonId}-activity-book.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Download my activity
                          </button>
                        </div>
                        {progress?.reviewer_feedback ? (
                          <p className="academy-feedback">
                            Instructor: {progress.reviewer_feedback}
                          </p>
                        ) : null}
                      </div>
                    </TabsContent>
                    <TabsContent value="check">
                      <div className="academy-card">
                        <h2>Check your decisions</h2>
                        <p>
                          Choose a response to each scenario. Feedback will point you to the idea to
                          practise.
                        </p>
                        {lesson.questions.map((q, i) => (
                          <fieldset key={q.id}>
                            <legend>
                              {i + 1}. {q.prompt}
                            </legend>
                            {q.choices.map((choice, j) => (
                              <label className="academy-check" key={choice}>
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={answers[i] === j}
                                  onChange={() =>
                                    setAnswers((prev) => {
                                      const next = [...prev];
                                      next[i] = j;
                                      return next;
                                    })
                                  }
                                />
                                {choice}
                              </label>
                            ))}
                          </fieldset>
                        ))}
                        <button
                          className="academy-button"
                          disabled={
                            busy || lesson.questions.some((_, i) => answers[i] === undefined)
                          }
                          onClick={() => save("quiz")}
                        >
                          Check my answers
                        </button>
                        {feedback ? (
                          <div className="academy-feedback" role="status">
                            <strong>
                              {feedback.score}/{feedback.total} correct
                            </strong>
                            {feedback.feedback.map((f, i) => (
                              <p key={i}>
                                {f.correct ? "✓" : "Review"} {f.text}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </TabsContent>
                  </Tabs>
                  <section className="academy-next">
                    <p className="academy-eyebrow">Your next step</p>
                    <p>{nextStep(progress)}</p>
                  </section>
                </>
              )}
              <p role="status" className="academy-status">
                {status}
              </p>
            </>
          )}
        </section>
        <aside className="academy-tutor academy-card">
          <div className="academy-panel-heading">
            <MessageCircle />
            <h2>AI Spin</h2>
          </div>
          <p>
            {tutorReady
              ? "Spin’s AI, here for this lesson. It knows your ticket, where you stopped and what you have saved."
              : "Your lesson guide is below. Sign in to talk to AI Spin when chat is connected."}
          </p>
          {tutorReady ? (
            <>
              <label className="academy-check">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                />
                Use my question, current lesson, viewing and saved learning progress to give AI
                feedback.
                {tutorProvider
                  ? ` Your question and that lesson work are sent to ${tutorProvider} to generate the answer.`
                  : ""}
              </label>
              <div className="academy-chips">
                {prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy || !aiConsent}
                    onClick={() => ask(p)}
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
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(question);
                }}
              >
                <label>
                  Your question
                  <textarea
                    rows={3}
                    maxLength={1500}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Help me define the exception route…"
                  />
                </label>
                <button
                  className="academy-button academy-button-small"
                  disabled={busy || !question.trim() || !aiConsent}
                >
                  Ask AI Spin
                </button>
              </form>
              <p className="academy-muted">
                AI feedback is advisory. An instructor reviews applied work.
                {tutorProvider ? ` Answers are generated by ${tutorProvider}.` : ""}
              </p>
            </>
          ) : (
            <div className="academy-tutor-reply">{nextStep(progress, meta?.kind)}</div>
          )}
          <div className="academy-tutor-links">
            <a href="/learn">My learning progress</a>
            <a href="/ai-spin">AI Spin chat and live avatar</a>
            {ticket?.accelerator ? <a href="/book">Book a 1-on-1 with SpinCity</a> : null}
            <a href="/summit">Compare Summit access</a>
            <a href="mailto:Info@NuAmenti.com">Ask the team for help</a>
          </div>
        </aside>
      </div>
    </AcademyFrame>
  );
}
