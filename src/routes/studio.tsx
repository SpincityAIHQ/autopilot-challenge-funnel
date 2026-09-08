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
type AccessDeliveryIssue = {
  id: string;
  code_id: string;
  status: "failed" | "unknown";
  attempts: number;
  created_at: string;
  completed_at: string | null;
  send_attempted_at: string | null;
};
type StudioData = {
  submissions: Submission[];
  accessDeliveries: AccessDeliveryIssue[];
  metrics: {
    registrations: number;
    learners: number;
    checkouts: number;
    pendingIntegrations: number;
    commerceReceiptsPending: number;
    ordersNeedingReview: number;
    accessDeliveryQueued: number;
    accessDeliveryAttention: number;
    integrationUnknown: number;
  };
  integrations: {
    shopify: boolean;
    shopifyBlockers: string[];
    ghl: boolean;
    tutor: boolean;
  };
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
  const [accessEvidence, setAccessEvidence] = useState<Record<string, string>>({});
  const [accessConfirmed, setAccessConfirmed] = useState<Record<string, boolean>>({});
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
  async function requeueAccess(delivery: AccessDeliveryIssue) {
    setBusy(true);
    setError("");
    try {
      await academyApi("access-requeue", { deliveryId: delivery.id });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function requeueUnknownAccess(delivery: AccessDeliveryIssue) {
    setBusy(true);
    setError("");
    try {
      await academyApi("access-requeue-unknown", {
        deliveryId: delivery.id,
        providerEvidence: accessEvidence[delivery.id]?.trim() ?? "",
        confirmedNoDelivery: true,
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
                        commerceReceiptsPending: "Shopify receipts requiring attention",
                        ordersNeedingReview: "Orders needing review",
                        accessDeliveryQueued: "Access emails queued",
                        accessDeliveryAttention: "Access deliveries needing review",
                        integrationUnknown: "GHL deliveries needing review",
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
            {data.accessDeliveries.length ? (
              <section className="academy-card">
                <p className="academy-eyebrow">ACCESS DELIVERY EXCEPTIONS</p>
                <h2>Reconcile uncertain sends. Requeue only proven-unsent failures.</h2>
                <p className="academy-muted">
                  An unknown delivery may already have reached GHL. Match its event ID in GHL before
                  taking any support action; this screen will not resend it.
                </p>
                <div className="academy-table-wrap">
                  <table className="academy-table">
                    <thead>
                      <tr>
                        <th>Event / delivery ID</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.accessDeliveries.map((delivery) => {
                        const recoverable =
                          delivery.status === "failed" && !delivery.send_attempted_at;
                        return (
                          <tr key={delivery.id}>
                            <td>
                              <code>{delivery.id}</code>
                            </td>
                            <td>{delivery.status}</td>
                            <td>{delivery.attempts}</td>
                            <td>
                              {recoverable ? (
                                <button
                                  type="button"
                                  className="academy-button academy-button-secondary"
                                  disabled={busy}
                                  onClick={() => void requeueAccess(delivery)}
                                >
                                  Requeue proven-unsent email
                                </button>
                              ) : delivery.status === "unknown" ? (
                                <div className="academy-recovery-controls">
                                  <label htmlFor={`evidence-${delivery.id}`}>
                                    GHL execution/search reference (no URLs, tokens, or access
                                    codes)
                                  </label>
                                  <input
                                    id={`evidence-${delivery.id}`}
                                    type="text"
                                    maxLength={500}
                                    value={accessEvidence[delivery.id] ?? ""}
                                    onChange={(event) =>
                                      setAccessEvidence((current) => ({
                                        ...current,
                                        [delivery.id]: event.target.value,
                                      }))
                                    }
                                  />
                                  <label className="academy-check">
                                    <input
                                      type="checkbox"
                                      checked={accessConfirmed[delivery.id] === true}
                                      onChange={(event) =>
                                        setAccessConfirmed((current) => ({
                                          ...current,
                                          [delivery.id]: event.target.checked,
                                        }))
                                      }
                                    />
                                    I confirmed in GHL that no workflow action or message exists.
                                  </label>
                                  <button
                                    type="button"
                                    className="academy-button academy-button-secondary"
                                    disabled={
                                      busy ||
                                      accessConfirmed[delivery.id] !== true ||
                                      (accessEvidence[delivery.id]?.trim().length ?? 0) < 12
                                    }
                                    onClick={() => void requeueUnknownAccess(delivery)}
                                  >
                                    Requeue reconciled unknown
                                  </button>
                                </div>
                              ) : (
                                <span>Reconcile in GHL — do not resend</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
            <div className="academy-three">
              {(
                [
                  {
                    key: "shopify",
                    ready: data.integrations.shopify,
                    detail: data.integrations.shopifyBlockers.length
                      ? `Blocked: ${data.integrations.shopifyBlockers.join(", ")}`
                      : "Configured · paid-order tests still required",
                  },
                  {
                    key: "ghl",
                    ready: data.integrations.ghl,
                    detail: data.integrations.ghl
                      ? "Configured · delivery and suppression tests still required"
                      : "Not configured",
                  },
                  {
                    key: "tutor",
                    ready: data.integrations.tutor,
                    detail: data.integrations.tutor
                      ? "Configured · answer-quality tests still required"
                      : "Not configured",
                  },
                ] as const
              ).map(({ key, ready, detail }) => (
                <div className="academy-card" key={key} data-ready={ready}>
                  <h2>{key.toUpperCase()}</h2>
                  <p>{detail}</p>
                </div>
              ))}
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
