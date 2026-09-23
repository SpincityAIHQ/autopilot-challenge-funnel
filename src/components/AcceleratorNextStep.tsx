import { useEffect, useState } from "react";
import { SUPPORT_TEXT_HREF, SUPPORT_TEXT_NUMBER } from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
import type { AcceleratorPath, PathStep } from "@/lib/accelerator-path";

const VIDEO: Record<PathStep["video"], string> = {
  watched: "Watched",
  partial: "Partly watched",
  none_recorded: "No viewing saved",
  unknown: "Viewing unknown",
  unavailable: "Recording not available yet",
};
const CHECK: Record<PathStep["check"], string> = {
  passed: "Check passed",
  practice: "Check needs practice",
  not_taken: "Check not taken",
};
const ACTIVITY: Record<PathStep["activity"], string> = {
  not_started: "Activity not started",
  draft: "Activity draft",
  submitted: "Activity submitted",
  approved: "Instructor approved",
  needs_revision: "Revision requested",
};
const STATUS: Record<PathStep["status"], string> = {
  complete: "Done",
  awaiting_review: "Submitted",
  in_progress: "In progress",
  not_started: "Not started",
  blocked: "No access",
};

export function AcceleratorNextStep() {
  const session = useAcademySession();
  // Keyed by the email it was loaded for, so a previous account's path or error never shows.
  const [state, setState] = useState<{ email: string; path: AcceleratorPath | null; error: string } | null>(null);
  useEffect(() => {
    const email = session.email;
    setState(null);
    if (!email) return;
    let active = true;
    academyApi<{ path: AcceleratorPath | null }>("dashboard")
      .then((d) => active && setState({ email, path: d.path ?? null, error: "" }))
      .catch((e: Error) => active && setState({ email, path: null, error: e.message || "failed" }));
    return () => {
      active = false;
    };
  }, [session.email]);
  const current = state && state.email === session.email ? state : null;
  const path = current?.path ?? null;
  const error = current?.error ?? "";

  if (session.loading) return null;
  if (!session.email)
    return (
      <div className="academy-card" style={{ marginTop: 32 }}>
        <p className="academy-eyebrow">Start here</p>
        <p>
          <a href="/join?mode=signin">Sign in</a> to see your own checklist and next step.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="academy-card" style={{ marginTop: 32 }} role="alert">
        <p className="academy-eyebrow">Start here</p>
        <p>Your checklist could not load. <a href={SUPPORT_TEXT_HREF}>Text {SUPPORT_TEXT_NUMBER}</a> if this continues.</p>
      </div>
    );
  if (!current)
    return (
      <div className="academy-card" style={{ marginTop: 32 }} aria-busy="true">
        <p className="academy-eyebrow">Start here</p>
        <p className="academy-muted">Loading your checklist…</p>
      </div>
    );
  if (!path)
    return (
      <div className="academy-card" style={{ marginTop: 32 }}>
        <p className="academy-eyebrow">Start here</p>
        <p>
          Your account does not show Accelerator access yet. If you enrolled,{" "}
          <a href="/redeem">activate your access</a> or <a href={SUPPORT_TEXT_HREF}>text {SUPPORT_TEXT_NUMBER}</a> with your sign-in email.
        </p>
      </div>
    );
  const next = path.next;
  return (
    <section className="academy-card" style={{ marginTop: 32 }} aria-labelledby="next-step-title">
      <p className="academy-eyebrow">Start here · My next step</p>
      <h2 id="next-step-title" style={{ marginTop: 4 }}>{path.whereAmI}</h2>
      {next ? (
        <div style={{ margin: "16px 0" }}>
          <p><strong>Do this next:</strong> {next.action}</p>
          <p><strong>Proof:</strong> {next.proof}</p>
          <a className="academy-button" href={next.href}>Resume: {next.title}</a>
        </div>
      ) : path.review ? (
        <div style={{ margin: "16px 0" }}>
          <p><strong>Next goal:</strong> {path.review.action}</p>
          <p><strong>Proof:</strong> {path.review.proof}</p>
          <a className="academy-button" href={path.review.href}>Review: customer step lesson</a>
        </div>
      ) : null}
      <details style={{ margin: "12px 0" }} open={!next || next.lessonId === "free-webinar"}>
        <summary><strong>Foundation self-check</strong> — confirm each rung yourself</summary>
        <ol style={{ paddingLeft: 20, display: "grid", gap: 10, marginTop: 8 }}>
          {path.foundation.map((f) => (
            <li key={f.id}>
              <strong>{f.title.replace(/^\d+\.\s*/, "")}</strong>
              <br />
              <span style={{ fontSize: "0.9em" }}>{f.verify}</span>
              {f.note ? <><br /><span className="academy-muted" style={{ fontSize: "0.85em" }}>{f.note}</span></> : null}
              {f.href ? <><br /><a href={f.href}>Open {f.linkLabel} →</a></> : null}
            </li>
          ))}
        </ol>
      </details>
      <p className="academy-eyebrow" style={{ marginTop: 12 }}>Lessons and saved evidence</p>
      <ol style={{ paddingLeft: 20, display: "grid", gap: 10 }}>
        {path.steps.map((s) => (
          <li key={s.lessonId} aria-current={next?.lessonId === s.lessonId ? "step" : undefined}>
            <a href={s.href}><strong>{s.title}</strong></a>{" "}
            <span className="academy-muted">· {STATUS[s.status]}</span>
            <br />
            <span className="academy-muted" style={{ fontSize: "0.9em" }}>
              {s.status === "blocked"
                ? s.action
                : `${VIDEO[s.video]} · ${CHECK[s.check]} · ${ACTIVITY[s.activity]}`}
            </span>
          </li>
        ))}
      </ol>
      {path.supplemental.some((s) => s.status !== "blocked") ? (
        <p className="academy-muted" style={{ marginTop: 12 }}>
          Optional extras:{" "}
          {path.supplemental
            .filter((s) => s.status !== "blocked")
            .map((s, i) => (
              <span key={s.lessonId}>
                {i ? " · " : ""}
                <a href={s.href}>{s.title}</a>
              </span>
            ))}
        </p>
      ) : null}
      <ul className="academy-muted" style={{ marginTop: 12, fontSize: "0.9em" }}>
        {path.uncertainty.map((u) => <li key={u}>{u}</li>)}
      </ul>
      <details style={{ marginTop: 12 }}>
        <summary>Glossary</summary>
        <dl>
          {path.glossary.map((g) => (
            <div key={g.term}><dt><strong>{g.term}</strong></dt><dd>{g.meaning}</dd></div>
          ))}
        </dl>
      </details>
      <p className="academy-muted" style={{ marginTop: 12 }}>
        Something not loading? <a href={SUPPORT_TEXT_HREF}>Text {SUPPORT_TEXT_NUMBER}</a> with the page and your sign-in email.
      </p>
    </section>
  );
}
