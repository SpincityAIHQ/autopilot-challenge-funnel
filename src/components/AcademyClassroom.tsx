import { useEffect, useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { AcademyFrame, GuideAvatar, TicketBadge } from "./AcademyFrame";
import { TrackedLessonVideo } from "./TrackedLessonVideo";
import { VimeoLessonPlayer } from "./VimeoLessonPlayer";
import { WatchMap } from "./WatchMap";
import {
  LESSONS,
  chapterStatus,
  formatTime,
  guideFor,
  nextStep,
  watchSummary,
  type LessonContent,
  type LessonProgress,
  type Ticket,
} from "@/lib/academy";
import { keywords } from "@/lib/transcript";
import { academyApi, useAcademySession } from "@/lib/academy-client";

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
type Seek = { at: number; nonce: number } | null;
function ClassroomSession({
  lessonId,
  session,
}: {
  lessonId: string;
  session: ReturnType<typeof useAcademySession>;
}) {
  const meta = LESSONS.find((l) => l.id === lessonId);
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
  const [seek, setSeek] = useState<Seek>(null);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<"notes" | "book" | "spin">("notes");
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
            : "Activity sheet saved.",
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
        guide: guide.id,
      });
      setThread((t) => [...t, { role: "spin", text: r.answer }]);
    } catch (e) {
      setThread((t) => [...t, { role: "spin", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }
  const isSession = meta?.kind === "session";
  const guide = guideFor(ticket);
  const watch = watchSummary(progress);
  const media = lesson?.media ?? null;
  const canSeek = Boolean(media && media.provider === "vimeo" && session.email);
  const jump = (at: number) => {
    setSeek({ at, nonce: Date.now() });
    document
      .getElementById("academy-player")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const moments = useMemo(
    () =>
      chapterStatus(
        media?.chapters ?? [],
        progress?.intervals ?? [],
        progress?.duration || media?.duration || 0,
      ),
    [media?.chapters, progress?.intervals, progress?.duration, media?.duration],
  );
  const transcript = lesson?.transcript ?? null;
  const hits = useMemo(() => {
    const terms = keywords(search);
    if (!terms.length || !transcript) return new Set<number>();
    return new Set(
      transcript
        .filter((c) => {
          const w = c.text.toLowerCase();
          return terms.some((t) => w.includes(t));
        })
        .map((c) => c.start),
    );
  }, [search, transcript]);
  const prompts = [
    watch.dropOffAt !== null && watch.coverage > 0
      ? `I stopped at ${formatTime(watch.dropOffAt)}. What did I miss?`
      : "What is the one thing I should take from this lesson?",
    transcript
      ? "Where in the video does Spin explain the job card?"
      : "Help me apply this to my business.",
    "What is my next step?",
  ];
  return (
    <AcademyFrame ticket={ticket}>
      <div className="academy-workspace academy-workspace-focus">
        <nav className="academy-crumbs" aria-label="Breadcrumb">
          <a href={meta?.tier === "free" ? "/" : "/summit"}>
            ← {meta?.tier === "free" ? "Home" : "All Summit sessions"}
          </a>
          <a href="/learn">My learning</a>
        </nav>

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
              <div id="academy-player" className="academy-player-frame">
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
                            : "You can start with the AI notes and activity below."}
                      </p>
                      {!session.email ? <a href="/join">Join the free classroom →</a> : null}
                    </div>
                  </div>
                )}
              </div>
              {media && session.email ? (
                <WatchMap
                  intervals={progress?.intervals ?? []}
                  duration={progress?.duration || media.duration}
                  position={progress?.position ?? 0}
                  chapters={media.chapters}
                  compact
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
                ) : (
                  <span>
                    Transcript{" "}
                    <strong>{transcript ? `${transcript.length} cues` : "Not yet"}</strong>
                  </span>
                )}
              </div>
              <div className="academy-switch" role="tablist" aria-label="Lesson sections">
                {(
                  [
                    [
                      "notes",
                      "01",
                      "AI Notes",
                      transcript ? "Every word, timed" : "Notes and key moments",
                    ],
                    ["book", "02", "Activity Sheet", "Job card and knowledge check"],
                    ["spin", "03", `Ask ${guide.name}`, `${guide.name} knows where you stopped`],
                  ] as const
                )
                  .filter(([k]) => !(isSession && k === "book"))
                  .map(([k, n, title, sub]) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={panel === k}
                      data-panel={k}
                      onClick={() => setPanel(k)}
                    >
                      <span className="academy-switch-num">{n}</span>
                      <span className="academy-switch-text">
                        <strong>{title}</strong>
                        <small>{sub}</small>
                      </span>
                      {k === "spin" ? <GuideAvatar guide={guide} size={34} pulse={busy} /> : null}
                    </button>
                  ))}
              </div>
              <div className="academy-stack">
                {/* ---------- AI NOTES ---------- */}
                <section
                  className="academy-card academy-block"
                  id="ai-notes"
                  hidden={panel !== "notes"}
                >
                  <div className="academy-block-head">
                    <span className="academy-block-num">01</span>
                    <div>
                      <h2>AI Notes</h2>
                      <p>
                        {transcript
                          ? "Every word and its time. Tap a moment to jump the recording there."
                          : "The approved notes for this recording. Timed moments appear once the transcript is connected."}
                      </p>
                    </div>
                  </div>
                  <div
                    className={
                      lesson.paragraphs.length && moments.length ? "academy-block-body-two" : ""
                    }
                  >
                    {lesson.paragraphs.length ? (
                      <div className="academy-notes">
                        {lesson.paragraphs.map((p) => (
                          <article key={p.heading}>
                            <h2>{p.heading}</h2>
                            <p>{p.text}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                    {moments.length ? (
                      <div>
                        <p className="academy-subhead">Key moments</p>
                        <ol className="academy-moments">
                          {moments.map((m) => (
                            <li key={m.start} data-status={m.status}>
                              <button
                                type="button"
                                disabled={!canSeek}
                                onClick={() => jump(m.start)}
                              >
                                <time>{formatTime(m.start)}</time>
                                <span>
                                  {m.title}
                                  {progress?.duration ? (
                                    <span className="academy-chapter-status">
                                      {" "}
                                      ·{" "}
                                      {m.status === "watched"
                                        ? "watched"
                                        : m.status === "partial"
                                          ? `${m.watched}%`
                                          : "missed"}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                  {transcript ? (
                    <details className="academy-transcript">
                      <summary>
                        Full transcript <span>{transcript.length} timed cues</span>
                      </summary>
                      <div className="academy-transcript-search">
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search every word of this recording…"
                          aria-label="Search the transcript"
                        />
                      </div>
                      <div className="academy-transcript-list">
                        {transcript
                          .filter((c) => !hits.size || hits.has(c.start))
                          .slice(0, 800)
                          .map((c) => (
                            <button
                              key={c.start}
                              type="button"
                              data-hit={hits.has(c.start)}
                              disabled={!canSeek}
                              onClick={() => jump(c.start)}
                            >
                              <time>{formatTime(c.start)}</time>
                              <span>{c.text}</span>
                            </button>
                          ))}
                      </div>
                    </details>
                  ) : null}
                  {!lesson.paragraphs.length && !moments.length && !transcript ? (
                    <p className="academy-muted">
                      Notes, key moments and the transcript appear here as the recording is
                      connected.
                    </p>
                  ) : null}
                </section>
                {/* ---------- ACTIVITY SHEET ---------- */}
                {!isSession ? (
                  <section
                    className="academy-card academy-block"
                    id="activity-book"
                    hidden={panel !== "book"}
                  >
                    <div className="academy-block-head">
                      <span className="academy-block-num">02</span>
                      <div>
                        <h2>Activity Sheet</h2>
                        <p>Apply it to a real workflow, then check your decisions.</p>
                      </div>
                    </div>
                    <div className="academy-block-body-two">
                      <div>
                        <p className="academy-subhead">Your automation job card</p>
                        <p className="academy-muted" style={{ marginTop: 0 }}>
                          Save a draft, then submit it when another person could follow your
                          instructions.
                        </p>
                        <p className="academy-muted" style={{ marginTop: 0 }}>
                          These answers are yours to keep. Copy them out and paste them into your
                          own AI — as custom instructions, a knowledge file, or a project brief —
                          so it learns how your business actually runs.
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
                      <div>
                        <p className="academy-subhead">Knowledge check</p>
                        <p className="academy-muted" style={{ marginTop: 0 }}>
                          Choose a response to each scenario. Feedback points you to the idea to
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
                    </div>
                  </section>
                ) : null}
                {/* ---------- ASK AI SPIN ---------- */}
                <section
                  className="academy-card academy-block academy-holo"
                  id="ask-ai-spin"
                  hidden={panel !== "spin"}
                >
                  <div className="academy-block-head">
                    <span className="academy-block-num">03</span>
                    <GuideAvatar guide={guide} size={56} pulse={busy} />
                    <div>
                      <h2>Ask {guide.name}</h2>
                      <p>
                        {tutorReady
                          ? `${guide.name} knows your ticket, where you stopped, every timed word of this recording and what you have saved.`
                          : `Your lesson guide is here. Sign in to talk to ${guide.name} when chat is connected.`}
                      </p>
                    </div>
                  </div>
                  {tutorReady ? (
                    <>
                      <label className="academy-check">
                        <input
                          type="checkbox"
                          checked={aiConsent}
                          onChange={(e) => setAiConsent(e.target.checked)}
                        />
                        Use my question, current lesson, viewing and saved learning progress to give
                        AI feedback.
                        {tutorProvider
                          ? " Your question and that lesson work are sent to our AI tutor service to generate the answer."
                          : ""}
                      </label>
                      {!aiConsent ? (
                        <p className="academy-helper-notice">
                          Tick the box above once to switch on {guide.name}’s answers.
                        </p>
                      ) : null}

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
                            placeholder="Where does Spin explain the exception route?"
                          />
                        </label>
                        <button
                          className="academy-button"
                          disabled={busy || !question.trim() || !aiConsent}
                        >
                          Ask {guide.name}
                        </button>
                      </form>
                      <p className="academy-muted">
                        AI feedback is advisory. An instructor reviews applied work.
                        {tutorProvider ? " Answers are generated by our AI tutor service." : ""}
                      </p>
                    </>
                  ) : (
                    <div className="academy-tutor-reply">{nextStep(progress, meta?.kind)}</div>
                  )}
                  <div className="academy-tutor-links">
                    {guide.id === "spin" ? (
                      <a href="/accelerator">Open AI Spin and the live avatar</a>
                    ) : null}
                    <a href="/learn">My account</a>
                    <a href="/redeem">Have a code? Redeem or upgrade here</a>
                    <a href="mailto:Info@NuAmenti.com">Ask the team for help</a>
                  </div>
                </section>
                <section className="academy-next">
                  <p className="academy-eyebrow">Your next step</p>
                  <p>{nextStep(progress, meta?.kind)}</p>
                </section>
                {meta?.tier === "free" ? (
                  <section className="academy-card academy-card-gold academy-callout">
                    <div>
                      <p className="academy-eyebrow">After the free training</p>
                      <h2>Pick up a ticket to the Summit.</h2>
                      <p>
                        Five recorded sessions take the same classroom further: the business before
                        the AI, hiring the AI team, coordinating it, measuring it and owning the
                        platform.
                      </p>
                    </div>
                    <div className="academy-actions">
                      <a className="academy-button academy-button-secondary" href="/summit">
                        Get a Summit ticket
                      </a>
                      <a className="academy-text-button" href="/redeem">
                        Redeem a code →
                      </a>
                    </div>
                  </section>
                ) : (
                  <section className="academy-callout">
                    <div>
                      <p className="academy-eyebrow">Summit sessions</p>
                      <h2>Choose your next session.</h2>
                    </div>
                    <div className="academy-actions">
                      <a className="academy-text-button" href="/summit">
                        All Summit sessions →
                      </a>
                      <a className="academy-text-button" href="/redeem">
                        Upgrade with a code →
                      </a>
                    </div>
                  </section>
                )}


              </div>
              <p role="status" className="academy-status">
                {status}
              </p>
            </>
          )}
        </section>
      </div>
    </AcademyFrame>
  );
}
