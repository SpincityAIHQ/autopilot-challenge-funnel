import { useEffect, useState } from "react";
import {
  QA_REVIEW_QUERY_KEY,
  QA_REVIEW_STAGES,
  getQaReviewStage,
  isQaReviewRuntimeEnabled,
  qaReviewStageLabel,
  setQaReviewStage,
  type QaReviewStage,
} from "@/lib/qa-review";

const REVIEW_PAGES = [
  { label: "Landing", path: "/" },
  { label: "$22 Checkout", path: "/checkout" },
  { label: "GA Confirmation", path: "/confirmed" },
  { label: "$77 VIP", path: "/offer/vip-upgrade" },
  { label: "$199 Vault", path: "/offer/implementation-vault" },
  { label: "$1,000 1-on-1", path: "/strategy-intensive" },
  { label: "Final Next Steps", path: "/next-steps" },
] as const;

/**
 * Preview-only owner control panel.
 *
 * It changes only browser sessionStorage and reloads the current page with a
 * client-side display scope. It never talks to payment APIs or Supabase and
 * it is absent from the published host unless explicitly enabled by env.
 */
export function QaReviewPanel() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [stage, setStage] = useState<QaReviewStage>("anonymous");

  useEffect(() => {
    if (!isQaReviewRuntimeEnabled()) return;
    setStage(getQaReviewStage() ?? "anonymous");
    setEnabled(true);
  }, []);

  if (!enabled) return null;

  function applyStage(next: QaReviewStage) {
    setQaReviewStage(next);
    const url = new URL(window.location.href);
    url.searchParams.set(QA_REVIEW_QUERY_KEY, next);
    window.location.assign(url.toString());
  }

  function pageHref(path: string): string {
    const url = new URL(path, window.location.origin);
    url.searchParams.set(QA_REVIEW_QUERY_KEY, stage);
    return `${url.pathname}${url.search}`;
  }

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[100] rounded-md border border-[color:var(--gold)] bg-background/95 p-3 shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:w-[440px]"
      aria-label="Funnel QA review controls"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-mono text-[color:var(--gold)]">OWNER QA · NO PAYMENT</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current view: {qaReviewStageLabel(stage)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded border border-border px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            This mode changes presentation only. It creates no purchase,
            entitlement, seat, database row, or paid-resource access. All
            checkout handoffs are forced off while QA mode is active.
          </p>

          <div>
            <p className="label-mono mb-2">Choose buyer stage</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(QA_REVIEW_STAGES) as QaReviewStage[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyStage(item)}
                  className={`rounded border px-2.5 py-1.5 text-xs transition ${
                    item === stage
                      ? "border-[color:var(--gold)] bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {qaReviewStageLabel(item)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label-mono mb-2">Open a funnel page</p>
            <div className="grid grid-cols-2 gap-2">
              {REVIEW_PAGES.map((page) => (
                <a
                  key={page.path}
                  href={pageHref(page.path)}
                  className="rounded border border-border px-2.5 py-2 text-center text-xs text-foreground hover:bg-secondary"
                >
                  {page.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
