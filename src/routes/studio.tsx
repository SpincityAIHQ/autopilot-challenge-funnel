import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame } from "@/components/AcademyFrame";
import { academyApi, useAcademySession } from "@/lib/academy-client";
type Submission = {
  user_id: string;
  lesson_id: string;
  workbook: Record<string, string>;
  updated_at: string;
  workbook_status: string;
};
type Readiness = {
  key: string;
  group: string;
  label: string;
  state: "ready" | "partial" | "missing" | "off";
  detail: string;
  action: string;
  blocking: boolean;
};
type StudioData = {
  readiness: Readiness[];
  readinessSummary: { go: boolean; blockers: string[]; total: number; ready: number };
  submissions: Submission[];
  metrics: {
    registrations: number;
    learners: number;
    checkouts: number;
    pendingIntegrations: number;
  };
  integrations: { shopify: boolean; ghl: boolean; tutor: boolean };
};
export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Instructor studio | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Studio,
});
function Studio() {
  const session = useAcademySession();
  return <StudioSession key={session.email ?? "anonymous"} session={session} />;
}
function StudioSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const load = () =>
    academyApi<StudioData>("studio")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (!session.loading) void load();
  }, [session.loading, session.email]);
  async function review(s: Submission, status: string) {
    setBusy(true);
    setError("");
    try {
      await academyApi("review", {
        userId: s.user_id,
        lessonId: s.lesson_id,
        status,
        feedback: feedback[`${s.user_id}:${s.lesson_id}`] ?? "",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AcademyFrame>
      <section className="academy-section">
        <p className="academy-eyebrow">INSTRUCTOR STUDIO</p>
        <h1>Turn learning evidence into useful feedback.</h1>
        <p role="status">{error}</p>
        {data ? (
          <>
            <div className="academy-progress-strip">
              {Object.entries(data.metrics).map(([k, v]) => (
                <span key={k}>
                  {
                    (
                      {
                        registrations: "Registered students",
                        learners: "Students with activity",
                        checkouts: "Checkout clicks",
                        pendingIntegrations: "Queued integrations",
                      } as Record<string, string>
                    )[k]
                  }
                  <strong>{v}</strong>
                </span>
              ))}
            </div>
            <p className="academy-muted">
              All-time platform counts. Checkout clicks are not purchases. Ad spend and ROAS are not
              connected here.
            </p>
            <div
              className={`academy-card ${data.readinessSummary.go ? "academy-card-featured" : "academy-card-gold"}`}
              style={{ marginTop: 24 }}
            >
              <p className="academy-eyebrow">Launch board</p>
              <h2>
                {data.readinessSummary.go
                  ? "All blocking connections are green."
                  : `${data.readinessSummary.blockers.length} blocking item${data.readinessSummary.blockers.length === 1 ? "" : "s"} before the full experience is live.`}
              </h2>
              <p className="academy-muted">
                {data.readinessSummary.ready} of {data.readinessSummary.total} connections ready.
                Each row names the human action that turns it green. Values are never shown here.
              </p>
            </div>
            <div className="academy-readiness">
              {(["purchases", "messaging", "content", "guides", "operations"] as const).map(
                (group) => (
                  <div key={group}>
                    <p className="academy-subhead" style={{ marginTop: 22 }}>
                      {group}
                    </p>
                    {data.readiness
                      .filter((r) => r.group === group)
                      .map((r) => (
                        <div className="academy-readiness-row" data-state={r.state} key={r.key}>
                          <span className="academy-readiness-dot" aria-hidden="true" />
                          <div>
                            <strong>
                              {r.label}
                              {r.blocking ? <em> · blocking</em> : null}
                            </strong>
                            <span>{r.detail}</span>
                            {r.state !== "ready" ? <small>{r.action}</small> : null}
                          </div>
                          <b>{r.state}</b>
                        </div>
                      ))}
                  </div>
                ),
              )}
            </div>
            <h2 className="academy-section-heading">Submitted activity sheets</h2>
            {data.submissions.length === 0 ? (
              <div className="academy-card">No activity sheets are awaiting review.</div>
            ) : (
              data.submissions.map((s) => (
                <article
                  className="academy-card academy-review"
                  key={`${s.user_id}:${s.lesson_id}`}
                >
                  <p className="academy-eyebrow">
                    {s.lesson_id} · {new Date(s.updated_at).toLocaleDateString()}
                  </p>
                  {Object.entries(s.workbook).map(([key, value]) => (
                    <div key={key}>
                      <h3>{key}</h3>
                      <p className="academy-tutor-reply">{value}</p>
                    </div>
                  ))}
                  <label>
                    Feedback against the job-card rubric
                    <textarea
                      maxLength={3000}
                      value={feedback[`${s.user_id}:${s.lesson_id}`] ?? ""}
                      onChange={(e) =>
                        setFeedback({
                          ...feedback,
                          [`${s.user_id}:${s.lesson_id}`]: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="academy-actions">
                    <button
                      disabled={busy}
                      className="academy-button"
                      onClick={() => review(s, "approved")}
                    >
                      Approve applied work
                    </button>
                    <button
                      disabled={busy}
                      className="academy-button academy-button-secondary"
                      onClick={() => review(s, "needs_revision")}
                    >
                      Request revision
                    </button>
                  </div>
                </article>
              ))
            )}
          </>
        ) : null}
      </section>
    </AcademyFrame>
  );
}
