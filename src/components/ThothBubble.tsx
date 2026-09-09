import { useEffect, useRef, useState, type FormEvent } from "react";
import { GuideAvatar } from "./AcademyFrame";
import { useRouterState } from "@tanstack/react-router";
import { academyJoinHref } from "@/lib/academy-navigation";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import { GUIDES, type LessonMeta } from "@/lib/academy";
import type { LearningGuidance } from "@/lib/academy-guidance";

type Context = {
  lessons: LessonMeta[];
  guidance: LearningGuidance | null;
  tutorReady: boolean;
};

/**
 * Thoth as a floating helper on every page: a small launcher that opens a
 * compact chat panel instead of sending the student to a separate room.
 */
export function ThothBubble() {
  const session = useAcademySession();
  return <ThothSession key={session.email ?? "anonymous"} session={session} />;
}
function ThothSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const guide = GUIDES.thoth;
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<Context | null>(null);
  const [lesson, setLesson] = useState("free-webinar");
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [thread, setThread] = useState<{ role: "user" | "spin"; text: string }[]>([]);
  const lock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open || !session.email || context) return;
    academyApi<Context>("ai-spin")
      .then((c) => {
        if (!mounted.current) return;
        setContext(c);
        if (c.guidance?.lessonId) setLesson(c.guidance.lessonId);
        if (c.lessons.length && !c.lessons.some((l) => l.id === (c.guidance?.lessonId ?? lesson)))
          setLesson(c.lessons[0].id);
      })
      .catch((e) => {
        if (mounted.current) setNotice((e as Error).message);
      });
  }, [open, session.email, context]);

  async function ask(text: string) {
    const q = text.trim();
    if (lock.current || !q) return;
    if (!consent) {
      setNotice("Tick the box above so I may use your question and lesson work to answer.");
      return;
    }
    if (context && !context.tutorReady) {
      setNotice("Chat is being connected. Please try again shortly.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setNotice(null);
    setQuestion("");
    setThread((t) => [...t, { role: "user", text: q }]);
    try {
      const r = await academyApi<{ answer: string }>("tutor", {
        lessonId: lesson,
        question: q,
        aiConsent: true,
        guide: "thoth",
      });
      if (mounted.current) setThread((t) => [...t, { role: "spin", text: r.answer }]);
    } catch (e) {
      if (mounted.current) {
        setNotice((e as Error).message);
        setThread((t) => [...t, { role: "spin", text: (e as Error).message }]);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }


  return (
    <div className="academy-helper">
      {open ? (
        <section className="academy-helper-panel" aria-label={`Chat with ${guide.name}`}>
          <header>
            <GuideAvatar guide={guide} size={34} pulse={busy} />
            <div>
              <strong>{guide.name}</strong>
              <small>Your tutor · every page</small>
            </div>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <div className="academy-helper-body">
            {!session.email ? (
              <p>
                <a href={academyJoinHref(pathname, true)}>Sign in</a> and {guide.name} can answer from your lessons, your
                watch maps and your saved work.
              </p>
            ) : (
              <>
                {context?.guidance ? (
                  <p className="academy-helper-tip">
                    <strong>{context.guidance.title}</strong>
                    <br />
                    {context.guidance.message}
                  </p>
                ) : null}
                {context ? (
                  <label>
                    Lesson in focus
                    <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
                      {context.lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="academy-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setNotice(null);
                    }}
                  />
                  Tick once so {guide.name} may use your question, current lesson, viewing and
                  saved lesson work to answer.
                </label>
                {notice ? (
                  <p className="academy-helper-notice" role="alert">
                    {notice}
                  </p>
                ) : null}
                {thread.length ? (
                  <div className="academy-thread" role="log" aria-live="polite">
                    {thread.map((m, i) => (
                      <div className="academy-bubble" data-role={m.role} key={i}>
                        <small>{m.role === "user" ? "You" : guide.name}</small>
                        {m.text}
                      </div>
                    ))}
                    {busy ? (
                      <div className="academy-bubble" data-role="spin">
                        <small>{guide.name}</small>
                        Thinking… this can take a few seconds.
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
                  <label className="academy-visually-hidden" htmlFor="thoth-question">
                    Your question
                  </label>
                  <textarea
                    id="thoth-question"
                    rows={3}
                    maxLength={1500}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about any lesson…"
                  />
                  <button
                    className="academy-button academy-button-small"
                    disabled={busy || !question.trim()}
                  >
                    {busy ? "Thinking…" : `Ask ${guide.name}`}
                  </button>
                </form>
                {context && !context.tutorReady ? (
                  <p className="academy-muted">Chat is being connected.</p>
                ) : null}

              </>
            )}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        className="academy-helper-launcher"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <GuideAvatar guide={guide} size={40} />
        <span>Ask {guide.name}</span>
      </button>
    </div>
  );
}


