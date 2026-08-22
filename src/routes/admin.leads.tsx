import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  filterLeads,
  TIER_LABEL,
  type Lead,
} from "@/lib/leads";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads — internal" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Internal." },
    ],
    links: [{ rel: "canonical", href: "/admin/leads" }],
  }),
  component: AdminLeadsPage,
});

interface LeadsPayload {
  total: number;
  shown: number;
  tiers: { ga: number; ga_vip: number; ga_vip_vault: number };
  leads: Lead[];
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AdminLeadsPage() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "denied" }
    | { status: "error" }
    | { status: "ok"; data: LeadsPayload }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/admin/summit-leads", {
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
        const json = (await res.json()) as LeadsPayload;
        setState({ status: "ok", data: json });
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
        <p className="text-sm text-muted-foreground">Could not load leads.</p>
      </main>
    );
  }

  return <LeadsContent data={state.data} />;
}

function LeadsContent({ data }: { data: LeadsPayload }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [sort, setSort] = useState("newest");

  const rows = useMemo(
    () => filterLeads(data.leads, { q, tier, sort }),
    [data.leads, q, tier, sort],
  );

  const csvHref = useMemo(() => {
    const params = new URLSearchParams({ format: "csv", sort });
    if (q.trim()) params.set("q", q.trim());
    if (tier) params.set("tier", tier);
    return `/api/public/admin/summit-leads?${params.toString()}`;
  }, [q, tier, sort]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner-only</p>
          <h1 className="mt-2 font-display text-3xl text-foreground">
            Reservation leads
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.total} people · {data.tiers.ga} GA · {data.tiers.ga_vip} GA +
            VIP · {data.tiers.ga_vip_vault} GA + VIP + Vault
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            One row per person. Tier shown is the highest they reached.
          </p>
        </div>
        <a
          href={csvHref}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Download CSV
        </a>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or phone"
          aria-label="Search leads"
          className="min-w-[240px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          aria-label="Filter by tier"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">All tiers</option>
          <option value="ga">General Admission</option>
          <option value="ga_vip">GA + VIP</option>
          <option value="ga_vip_vault">GA + VIP + Vault</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort leads"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="newest">Newest activity first</option>
          <option value="oldest">Oldest contact first</option>
        </select>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Showing {rows.length} of {data.total}
      </p>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {rows.map((l) => (
          <li key={l.email} className="flex flex-wrap gap-4 px-4 py-4">
            <div className="min-w-[200px] flex-1">
              <p className="text-[17px] text-foreground">
                {l.first_name || "—"}
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                <a className="underline" href={`mailto:${l.email}`}>
                  {l.email}
                </a>
              </p>
              {l.phone ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  <a className="underline" href={`tel:${l.phone}`}>
                    {l.phone}
                  </a>
                </p>
              ) : null}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="text-sm text-foreground">
                {TIER_LABEL[l.tier_reserved]}
              </p>
              <p className="mt-1">First contact {fmtDate(l.first_seen)}</p>
              <p>Last activity {fmtDate(l.last_seen)}</p>
              {l.settled ? <p className="mt-1">Checkout reached</p> : null}
            </div>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted-foreground">
            No one matches that search.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
