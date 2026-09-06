import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, PlayCircle } from "lucide-react";
import { AcademyFrame } from "./AcademyFrame";
import { TrackedLessonVideo } from "./TrackedLessonVideo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LESSONS,
  coverage,
  nextStep,
  type LessonContent,
  type LessonProgress,
} from "@/lib/academy";
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
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [tutorReady, setTutorReady] = useState(false);
  async function load() {
    const result = await academyApi<{
      lesson: LessonContent;
      progress?: LessonProgress;
      tutorReady: boolean;
    }>(`lesson?lessonId=${encodeURIComponent(lessonId)}`);
    setLesson(result.lesson);
    setProgress(result.progress);
    setTutorReady(result.tutorReady);
    return result;
  }
  useEffect(() => {
    setLesson(null);
    setError("");
    setFeedback(null);
    setReply("");
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
  async function ask() {
    setBusy(true);
    setReply("");
    try {
      const r = await academyApi<{ answer: string }>("tutor", { lessonId, question, aiConsent });
      setReply(r.answer);
    } catch (e) {
      setReply((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AcademyFrame>
      <div className="academy-workspace">
        <aside className="academy-outline">
          <p className="academy-eyebrow">YOUR FLIGHT PLAN</p>
          <nav aria-label="Lessons">
            {LESSONS.map((l, i) => (
              <a
                key={l.id}
                href={l.id === "free-webinar" ? "/class" : `/lesson/${l.id}`}
                aria-current={l.id === lessonId ? "page" : undefined}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <small>{l.stage}</small>
                  {l.title}
                </div>
              </a>
            ))}
          </nav>
          <a className="academy-text-button" href="/learn">
            View my progress →
          </a>
        </aside>
        <section className="academy-class">
          <p className="academy-eyebrow">{meta?.stage ?? "LESSON"}</p>
          <h1>{meta?.title ?? "Lesson unavailable"}</h1>
          <p className="academy-lead">{meta?.summary}</p>
          {error ? (
            <div className="academy-card" role="status">
              <p>{error}</p>
              <a className="academy-button" href={session.email ? "/summit" : "/join"}>
                {session.email ? "Explore access" : "Sign in or join free"}
              </a>
            </div>
          ) : !lesson ? (
            <p role="status">Loading lesson…</p>
          ) : (
            <>
              {lesson.media && session.email ? (
                <TrackedLessonVideo
                  key={`${lessonId}:${lesson.media.version}`}
                  lessonId={lessonId}
                  media={lesson.media}
                  resume={progress?.position}
                  onSaved={() => void load()}
                  onError={setStatus}
                />
              ) : (
                <div className="academy-media-empty">
                  <PlayCircle size={38} />
                  <div>
                    <h2>{lesson.media ? "Sign in to watch" : "Recording not connected yet"}</h2>
                    <p>
                      {lesson.media
                        ? "Keep your place and learning progress in your free account."
                        : "You can start with the lesson notes and activity below."}
                    </p>
                    {!session.email ? <a href="/join">Join the free classroom →</a> : null}
                  </div>
                </div>
              )}
              <div className="academy-progress-strip">
                <span>
                  Watched{" "}
                  <strong>
                    {progress?.duration
                      ? `${coverage(progress.intervals, progress.duration)}%`
                      : "—"}
                  </strong>
                </span>
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
                      ? "Instructor reviewed"
                      : progress?.workbook_status === "submitted"
                        ? "Awaiting review"
                        : "In progress"}
                  </strong>
                </span>
              </div>
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
                      Use a real workflow. Save a draft, then submit it when another person could
                      follow your instructions.
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
                      <p className="academy-feedback">Instructor: {progress.reviewer_feedback}</p>
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
                      disabled={busy || lesson.questions.some((_, i) => answers[i] === undefined)}
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
              <p role="status" className="academy-status">
                {status}
              </p>
              <section className="academy-next">
                <p className="academy-eyebrow">YOUR NEXT STEP</p>
                <p>{nextStep(progress)}</p>
              </section>
            </>
          )}
        </section>
        <aside className="academy-tutor academy-card">
          <div className="academy-panel-heading">
            <MessageCircle />
            <h2>{tutorReady ? "AI learning tutor" : "Your lesson guide"}</h2>
          </div>
          <p>
            {tutorReady
              ? "Ask about this lesson. Your tutor uses your saved progress and the approved teaching notes."
              : "Use the lesson notes, feedback and next step while the AI tutor is being connected."}
          </p>
          {tutorReady ? (
            <>
              <label className="academy-check">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                />
                Use my question, current lesson and saved learning progress to give AI feedback.
              </label>
              <label>
                Your question
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Help me define the exception route…"
                />
              </label>
              <button
                className="academy-button"
                disabled={busy || !question.trim() || !aiConsent}
                onClick={ask}
              >
                Ask the tutor
              </button>
              <p className="academy-muted">
                AI feedback is advisory. An instructor reviews applied work.
              </p>
              <p role="status" className="academy-tutor-reply">
                {reply}
              </p>
            </>
          ) : (
            <div className="academy-tutor-reply">{nextStep(progress)}</div>
          )}
          <div className="academy-tutor-links">
            <a href="/learn">My learning progress</a>
            <a href="/summit">Compare Summit access</a>
            <a href="mailto:Info@NuAmenti.com">Ask the team for help</a>
          </div>
        </aside>
      </div>
    </AcademyFrame>
  );
}
