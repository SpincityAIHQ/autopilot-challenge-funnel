import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useEntitlementSummary } from "@/hooks/use-entitlement-summary";


export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Pre-Summit alignment audit — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "Three minutes of context that shapes what gets taught on Day 1 and Day 2. Your answers change the Summit.",
      },
      { property: "og:title", content: "Pre-Summit alignment audit" },
      {
        property: "og:description",
        content: "3 minutes. It changes what I teach.",
      },
    ],
    links: [{ rel: "canonical", href: "/audit" }],
  }),
  component: AuditPage,
});

const BUSINESS_TYPES = [
  "Coach / consultant",
  "Service business",
  "Agency",
  "Course / info product",
  "E-commerce / product",
  "Real estate / investing",
  "Solo creator",
  "Corporate / employed",
  "Just starting — no offer yet",
];
const REVENUE_STAGE = [
  "Pre-revenue",
  "Under $5k/mo",
  "$5k–$20k/mo",
  "$20k–$50k/mo",
  "$50k–$100k/mo",
  "Over $100k/mo",
];
const BOTTLENECKS = [
  "Lead flow",
  "Sales / closing",
  "Fulfillment / delivery",
  "Content / marketing",
  "Operations / admin",
  "Follow-up / retention",
  "Team / hiring",
];
const AI_TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Perplexity",
  "Lovable",
  "n8n / Make / Zapier",
  "HeyGen / Synthesia",
  "ElevenLabs",
  "Custom GPTs",
  "None yet",
];
const TEAM_SIZE = [
  "Just me",
  "Me + 1 VA / contractor",
  "2–5 people",
  "6–20 people",
  "Over 20 people",
];
const ATTENDANCE = [
  "Both days, live",
  "Day 1 live, Day 2 recording",
  "Day 2 live, Day 1 recording",
  "Recordings only",
];
const AUTONOMY_GOAL = [
  "Cut my hours in half",
  "Replace one hire",
  "Ship a new offer faster",
  "Turn content into a system",
  "Build a company brain",
  "Sell to corporate / bigger clients",
];

interface FormState {
  email: string;
  business_type: string;
  revenue_stage: string;
  bottleneck: string;
  what_stops: string;
  ai_tools: string[];
  team_size: string;
  attendance: string;
  top_question: string;
  autonomy_goal: string;
  anything_else: string;
  website: string; // honeypot — real users leave this empty
}

const INITIAL: FormState = {
  email: "",
  business_type: "",
  revenue_stage: "",
  bottleneck: "",
  what_stops: "",
  ai_tools: [],
  team_size: "",
  attendance: "",
  top_question: "",
  autonomy_goal: "",
  anything_else: "",
  website: "",
};


function AuditPage() {
  const summary = useEntitlementSummary();
  const sessionEmail =
    summary.status === "ok" && summary.email ? summary.email : null;
  const hasSession = sessionEmail !== null;

  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(
    () => computeProgress(form, hasSession),
    [form, hasSession],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTool(tool: string) {
    setForm((f) =>
      f.ai_tools.includes(tool)
        ? { ...f, ai_tools: f.ai_tools.filter((t) => t !== tool) }
        : { ...f, ai_tools: [...f.ai_tools, tool] },
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!hasSession && !form.email.trim()) {
      setError("Your email is required so we can align the Summit for you.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/summit-audit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: hasSession ? undefined : form.email.trim() || undefined,
          business_type: form.business_type || undefined,
          revenue_stage: form.revenue_stage || undefined,
          bottleneck: form.bottleneck || undefined,
          what_stops: form.what_stops || undefined,
          ai_tools: form.ai_tools.length ? form.ai_tools : undefined,
          team_size: form.team_size || undefined,
          attendance: form.attendance || undefined,
          top_question: form.top_question || undefined,
          autonomy_goal: form.autonomy_goal || undefined,
          anything_else: form.anything_else || undefined,
          website: form.website || undefined,
        }),
      });
      if (res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          verification?: string;
        };
        if (j.message) {
          // Neutral "no registration found" reply.
          setNotice(j.message);
        } else {
          setSubmitted(true);
        }
      } else if (res.status === 429) {
        setError("Too many submissions. Give it a minute and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow">Received</p>
        <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          Thank you, family — your answers are in.
        </h1>
        <p className="mt-4 text-muted-foreground">
          This is what actually shapes the Day 1 and Day 2 material. If your
          answer changes between now and the Summit, come back to this page
          and update it — the form remembers you by email.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-8 inline-flex items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          Revise my answers
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Pre-Summit alignment</p>
      <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
        3 minutes. It changes what I teach.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Ten questions. Your answers directly shape Day 1 and Day 2. Every field
        after your email is optional — the more you share, the sharper the room
        gets.
      </p>

      <ProgressBar percent={progress} />

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        {/* Honeypot — hidden from users, catches basic bots. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
          </label>
        </div>

        {hasSession ? (
          <Field label="1. Your email">
            <div className="rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground">
              {sessionEmail}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified from your session — we'll attach your answers to this
              address.
            </p>
          </Field>
        ) : (
          <Field label="1. Your email" required>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald-signal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--emerald-signal)]"
              placeholder="you@domain.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use the same email you registered with.
            </p>
          </Field>
        )}


        <SelectField
          label="2. What best describes your business?"
          options={BUSINESS_TYPES}
          value={form.business_type}
          onChange={(v) => update("business_type", v)}
        />

        <SelectField
          label="3. Where are you right now, revenue-wise?"
          options={REVENUE_STAGE}
          value={form.revenue_stage}
          onChange={(v) => update("revenue_stage", v)}
        />

        <SelectField
          label="4. What is the #1 bottleneck in your business today?"
          options={BOTTLENECKS}
          value={form.bottleneck}
          onChange={(v) => update("bottleneck", v)}
        />

        <Field label="5. What stops you from fixing it? (be specific)">
          <textarea
            rows={4}
            maxLength={2000}
            value={form.what_stops}
            onChange={(e) => update("what_stops", e.target.value)}
            className="w-full rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald-signal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--emerald-signal)]"
            placeholder="Time, money, don't know the steps, tried and failed…"
          />
        </Field>

        <Field label="6. Which AI tools have you actually used? (select all that apply)">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AI_TOOLS.map((tool) => {
              const active = form.ai_tools.includes(tool);
              return (
                <button
                  type="button"
                  key={tool}
                  onClick={() => toggleTool(tool)}
                  aria-pressed={active}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-[color:var(--emerald-signal)] bg-secondary text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </Field>

        <SelectField
          label="7. Who is on your team?"
          options={TEAM_SIZE}
          value={form.team_size}
          onChange={(v) => update("team_size", v)}
        />

        <SelectField
          label="8. How are you attending August 29–30?"
          options={ATTENDANCE}
          value={form.attendance}
          onChange={(v) => update("attendance", v)}
        />

        <Field label="9. Your top question for the Summit">
          <textarea
            rows={4}
            maxLength={2000}
            value={form.top_question}
            onChange={(e) => update("top_question", e.target.value)}
            className="w-full rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald-signal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--emerald-signal)]"
            placeholder="What do you most want answered live?"
          />
        </Field>

        <SelectField
          label="10. If we hit one autonomy goal, which one matters most?"
          options={AUTONOMY_GOAL}
          value={form.autonomy_goal}
          onChange={(v) => update("autonomy_goal", v)}
        />

        <Field label="Anything else you want me to know? (optional)">
          <textarea
            rows={3}
            maxLength={2000}
            value={form.anything_else}
            onChange={(e) => update("anything_else", e.target.value)}
            className="w-full rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald-signal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--emerald-signal)]"
          />
        </Field>

        {notice ? (
          <p className="rounded-md border border-border bg-[color:var(--surface)] p-3 text-sm text-foreground">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[color:var(--gold)]">{error}</p>
        ) : null}


        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-heading text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send my answers"}
          </button>
          <p className="text-xs text-muted-foreground">
            You can come back and revise this — we remember you by email.
          </p>
        </div>
      </form>
    </main>
  );
}

function computeProgress(form: FormState, hasSession: boolean): number {
  const fields = [
    hasSession ? "x" : form.email,
    form.business_type,
    form.revenue_stage,
    form.bottleneck,
    form.what_stops,
    form.ai_tools.length ? "x" : "",
    form.team_size,
    form.attendance,
    form.top_question,
    form.autonomy_goal,
  ];
  const done = fields.filter((v) => (v ?? "").length > 0).length;
  return Math.round((done / fields.length) * 100);
}


function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-6" aria-label={`Audit ${percent}% complete`}>
      <div className="flex items-center justify-between">
        <span className="label-mono">Progress</span>
        <span className="label-mono">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full bg-[color:var(--emerald-signal)] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-heading text-sm text-foreground">
        {label}
        {required ? (
          <span className="ml-1 text-[color:var(--gold)]">*</span>
        ) : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[color:var(--emerald-signal)] focus:outline-none focus:ring-1 focus:ring-[color:var(--emerald-signal)]"
      >
        <option value="">— choose one —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
