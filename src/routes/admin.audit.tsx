import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit dashboard — internal" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Internal." },
    ],
    links: [{ rel: "canonical", href: "/admin/audit" }],
  }),
  component: AdminAuditPage,
});

type Tier = "ga" | "vip" | "vault" | "none";

interface Bucket {
  total: number;
  byTier: Record<Tier, number>;
}

interface Stats {
  total: number;
  tiers: Record<Tier, number>;
  breakdowns: Record<string, Record<string, Bucket>>;
  aiTools: Record<string, Bucket>;
  openText: Array<{
    id: string;
    email: string;
    created_at: string;
    entitlement_tier: string | null;
    what_stops: string | null;
    top_question: string | null;
    anything_else: string | null;
  }>;
}

const FIELD_LABELS: Record<string, string> = {
  business_type: "Business type",
  revenue_stage: "Revenue stage",
  bottleneck: "Bottleneck",
  team_size: "Team size",
  attendance: "Attendance",
  autonomy_goal: "Autonomy goal",
};

function AdminAuditPage() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "denied" }
    | { status: "error" }
    | { status: "ok"; stats: Stats }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/admin/summit-audit", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!alive) return;
        if (res.status === 404 || res.status === 401 || res.status === 403) {
          setState({ status: "denied" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const json = (await res.json()) as Stats;
        setState({ status: "ok", stats: json });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }
  if (state.status === "denied") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="eyebrow">Not available</p>
        <h1 className="mt-3 font-display text-2xl text-foreground">
          This page is only visible to the Summit owner.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Open the private access link from your owner email in the same
          browser session.
        </p>
      </main>
    );
  }
  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-muted-foreground">
          Could not load audit data.
        </p>
      </main>
    );
  }

  const { stats } = state;
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner-only</p>
          <h1 className="mt-2 font-display text-3xl text-foreground">
            Pre-Summit alignment audit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {stats.total} total submissions ·{" "}
            {stats.tiers.ga} GA · {stats.tiers.vip} VIP ·{" "}
            {stats.tiers.vault} Vault · {stats.tiers.none} unverified
          </p>
        </div>
        <a
          href="/api/public/admin/summit-audit?format=csv"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-heading text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-10 grid gap-6">
        {Object.entries(stats.breakdowns).map(([field, values]) => (
          <BreakdownCard
            key={field}
            title={FIELD_LABELS[field] ?? field}
            total={stats.total}
            values={values}
          />
        ))}
        <BreakdownCard
          title="AI tools used (multi-select)"
          total={stats.total}
          values={stats.aiTools}
        />
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-lg text-foreground">
          Open-text answers ({stats.openText.length})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Newest first. Email + tier shown for follow-up.
        </p>
        <ul className="mt-4 space-y-4">
          {stats.openText.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-border bg-[color:var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="text-foreground">{r.email}</span>
                <span>·</span>
                <span>{r.entitlement_tier ?? "unverified"}</span>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.what_stops ? (
                <OpenLine label="What stops them" value={r.what_stops} />
              ) : null}
              {r.top_question ? (
                <OpenLine label="Top question" value={r.top_question} />
              ) : null}
              {r.anything_else ? (
                <OpenLine label="Anything else" value={r.anything_else} />
              ) : null}
            </li>
          ))}
          {stats.openText.length === 0 ? (
            <li className="text-sm text-muted-foreground">No answers yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}

function BreakdownCard({
  title,
  total,
  values,
}: {
  title: string;
  total: number;
  values: Record<string, Bucket>;
}) {
  const sorted = Object.entries(values).sort((a, b) => b[1].total - a[1].total);
  return (
    <section className="surface p-5">
      <h3 className="font-heading text-base text-foreground">{title}</h3>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No responses yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 font-normal">Answer</th>
              <th className="py-2 font-normal">Total</th>
              <th className="py-2 font-normal">GA</th>
              <th className="py-2 font-normal">VIP</th>
              <th className="py-2 font-normal">Vault</th>
              <th className="py-2 font-normal">Unv.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([value, b]) => {
              const pct = total > 0 ? Math.round((b.total / total) * 100) : 0;
              return (
                <tr key={value} className="border-t border-border">
                  <td className="py-2 pr-3 text-foreground">{value}</td>
                  <td className="py-2 pr-3">
                    {b.total}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({pct}%)
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {b.byTier.ga}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {b.byTier.vip}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {b.byTier.vault}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {b.byTier.none}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function OpenLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2">
      <p className="label-mono">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {value}
      </p>
    </div>
  );
}
