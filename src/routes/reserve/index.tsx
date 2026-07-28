import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { WingedPlaneMark } from "@/components/reserve/WingedPlaneMark";

export const Route = createFileRoute("/reserve/")({
  head: () => ({
    meta: [
      { title: "Reserve your seat — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content: "Reserve your seat for the AI AutoPilot 2-Day Summit — August 29–30, 1–4 PM ET.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { httpEquiv: "Cache-Control", content: "private, no-store" },
    ],
  }),
  component: ReservePage,
});

function ReservePage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; next?: string; error?: string }
        | null;
      if (!res.ok || !body?.ok || !body.next) {
        setError("We couldn't reserve your seat. Check your details and try again.");
        return;
      }
      navigate({ to: body.next });
    } catch {
      setError("Network hiccup. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReserveFrame>
      <main className="mx-auto max-w-2xl px-5 py-14 sm:py-24">
        <div className="mx-auto w-full max-w-sm">
          <WingedPlaneMark className="w-full h-auto" />
        </div>

        <div className="mt-10 text-center">
          <h1 className="reserve-display reserve-gold-text text-3xl sm:text-5xl leading-tight">
            Reserve Your Seat
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[rgba(245,241,228,0.85)]">
            <span className="reserve-eyebrow reserve-gold-text">AI AutoPilot 2-Day Summit</span>
            <br />
            August 29–30 · 1–4 PM ET both days
          </p>
        </div>

        <div className="mt-6 reserve-hairline" />

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <div>
            <label htmlFor="rf-first" className="reserve-label block mb-2">First name</label>
            <input
              id="rf-first"
              name="first_name"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="reserve-input"
            />
          </div>
          <div>
            <label htmlFor="rf-email" className="reserve-label block mb-2">Email</label>
            <input
              id="rf-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="reserve-input"
            />
          </div>
          <div>
            <label htmlFor="rf-phone" className="reserve-label block mb-2">Phone</label>
            <input
              id="rf-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="reserve-input"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="reserve-gold-btn w-full rounded-xl py-4 text-base sm:text-lg"
          >
            {submitting ? "Reserving…" : "Reserve My Seat"}
          </button>

          <p
            style={{ fontSize: "15px", opacity: 0.7, fontFamily: "Rajdhani, ui-sans-serif" }}
            className="text-center"
          >
            Nothing is charged. You choose how to settle on the next page.
          </p>
        </form>
      </main>
    </ReserveFrame>
  );
}
