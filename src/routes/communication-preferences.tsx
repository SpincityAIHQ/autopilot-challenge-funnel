import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CONSENT_COPY, SELLER_IDENTITY } from "@/lib/consent";

export const Route = createFileRoute("/communication-preferences")({
  head: () => ({
    meta: [
      { title: "Communication preferences · AI AutoPilot Summit" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Choose how SpincityHQ LLC / NuAmenti communicates with you about the AI AutoPilot Summit. Every channel is optional and revocable.",
      },
      { property: "og:url", content: "/communication-preferences" },
    ],
    links: [{ rel: "canonical", href: "/communication-preferences" }],
  }),
  component: CommunicationPreferences,
});

type SessionState =
  | { status: "loading" }
  | { status: "authenticated" }
  | { status: "unauthenticated" };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; message: string };

function CommunicationPreferences() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [phone, setPhone] = useState("");
  const [signerName, setSignerName] = useState("");
  const [wantEmail, setWantEmail] = useState(false);
  const [wantSms, setWantSms] = useState(false);
  const [wantAiCall, setWantAiCall] = useState(false);
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/resources/entitlement-summary", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setSession({ status: "unauthenticated" });
          return;
        }
        const body = (await res.json()) as { authenticated?: boolean };
        setSession({
          status: body.authenticated ? "authenticated" : "unauthenticated",
        });
      } catch {
        if (!cancelled) setSession({ status: "unauthenticated" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneRequired = wantSms || wantAiCall;
  const signatureRequired = wantAiCall;
  const canSubmit = useMemo(() => {
    if (session.status !== "authenticated") return false;
    if (phoneRequired && phone.trim().length < 7) return false;
    if (signatureRequired && signerName.trim().length < 2) return false;
    return true;
  }, [session.status, phone, phoneRequired, signatureRequired, signerName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/public/communication-preferences", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          signerName: signerName.trim(),
          sourceRoute:
            typeof window !== "undefined" ? window.location.pathname : "/communication-preferences",
          channels: { email: wantEmail, sms: wantSms, ai_call: wantAiCall },
        }),
      });
      if (res.status === 401) {
        setSession({ status: "unauthenticated" });
        setState({ status: "idle" });
        return;
      }
      if (!res.ok) {
        setState({
          status: "error",
          message:
            res.status === 429
              ? "Too many requests — please try again in a minute."
              : "We couldn't save that. Please try again or email Sebastian@spincityhq.com.",
        });
        return;
      }
      setState({ status: "done" });
    } catch {
      setState({
        status: "error",
        message: "Network error — please try again or email Sebastian@spincityhq.com.",
      });
    }
  }

  if (session.status === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow">Communication preferences</p>
        <p className="mt-4 text-sm text-muted-foreground">Checking your secure session…</p>
      </main>
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow">Communication preferences</p>
        <h1 className="mt-3 font-display text-3xl text-foreground">
          You’ll need your secure link first.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          For your protection, we don’t let anyone opt another person in or out from this page. Open
          the most recent “Your Summit access” email we sent to your registered address and click
          the secure link — that starts a private session on this device, then you can set your
          preferences.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Can’t find it? Email Sebastian@spincityhq.com from the address you used at registration
          and we’ll resend the link. Transactional access messages about your Summit ticket are
          separate from marketing consent — those will still reach you.
        </p>
        <Link
          to="/confirmed"
          className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to your confirmation
        </Link>
      </main>
    );
  }

  if (state.status === "done") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <p className="eyebrow">Preferences saved</p>
        <h1 className="mt-3 font-display text-3xl text-foreground">
          Thank you, family — your choices are recorded.
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          You can update these preferences any time by returning to this page or writing
          Sebastian@spincityhq.com. Transactional messages about your Summit access remain separate
          from marketing consent.
        </p>
        <Link
          to="/confirmed"
          className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to your confirmation
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="eyebrow">Communication preferences</p>
      <h1 className="mt-3 font-display text-3xl text-foreground">
        Choose how the family talks to you.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Every channel below is optional, unbundled, and revocable. Marketing consent is never
        required to purchase or attend the Summit. Transactional order and access messages are
        separate from marketing consent. Seller: {SELLER_IDENTITY} · Atlanta, GA.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Your identity is confirmed by your secure session on this device — we never ask you to
        retype your email here, and no one else can change your preferences from another browser.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        <label className="block">
          <span className="label-mono">
            Phone{" "}
            {phoneRequired
              ? "(required for SMS or AI-call)"
              : "(only if you opt into SMS or AI-call)"}
          </span>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:border-[color:var(--gold)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We only use your phone for the channels you check below.
          </p>
        </label>

        <fieldset className="space-y-4">
          <legend className="label-mono">Marketing channels</legend>

          <ChoiceRow
            id="ch-email"
            checked={wantEmail}
            onChange={setWantEmail}
            label={CONSENT_COPY.email}
          />
          <ChoiceRow id="ch-sms" checked={wantSms} onChange={setWantSms} label={CONSENT_COPY.sms} />
          <ChoiceRow
            id="ch-ai"
            checked={wantAiCall}
            onChange={setWantAiCall}
            label={CONSENT_COPY.ai_call}
          />
        </fieldset>

        {signatureRequired ? (
          <label className="block rounded-md border border-border/70 bg-secondary/30 p-4">
            <span className="label-mono">
              Typed e-signature (required for AI/prerecorded calls)
            </span>
            <input
              type="text"
              autoComplete="name"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Type your full legal name"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[color:var(--gold)] focus:outline-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              By typing your name above, you provide a written signature acknowledging the exact
              AI/prerecorded-call consent shown above, tied to the phone number you provided, from{" "}
              {SELLER_IDENTITY}. You may revoke this consent at any time.
            </p>
          </label>
        ) : null}

        <p className="text-xs text-muted-foreground">
          For SMS: reply STOP to opt out or HELP for help. Msg &amp; data rates may apply.
          AI/prerecorded calls: your consent is explicit, not required to buy, and revocable at any
          time. All channels can be revoked by writing Sebastian@spincityhq.com or resubmitting this
          form unchecked.
        </p>

        {state.status === "error" ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground"
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || state.status === "submitting"}
            className={`inline-flex items-center rounded-md bg-primary px-5 py-3 font-heading text-sm font-semibold text-primary-foreground transition ${
              canSubmit && state.status !== "submitting"
                ? "hover:opacity-90"
                : "cursor-not-allowed opacity-50"
            }`}
          >
            {state.status === "submitting" ? "Saving…" : "Save preferences"}
          </button>
          <Link
            to="/confirmed"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Skip for now
          </Link>
        </div>
      </form>
    </main>
  );
}

function ChoiceRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-foreground">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[color:var(--gold)]"
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  );
}
