import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { applyReserveNoStoreHeaders } from "@/lib/reserve-headers";
import { ReserveFrame } from "@/components/reserve/ReserveFrame";
import { WingedPlaneMark } from "@/components/reserve/WingedPlaneMark";
import { RevealOnView } from "@/components/reserve/RevealOnView";
import { ReservationConsentFields } from "@/components/reserve/ReservationConsentFields";

export const Route = createFileRoute("/reserve/")({
  head: () => ({
    meta: [
      { title: "Reserve your seat — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "Reserve your seat for the AI AutoPilot 2-Day Summit — August 29-30, 11 AM-4 PM ET.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    await applyReserveNoStoreHeaders();
  },
  component: ReservePage,
});

type FieldErrors = {
  first_name?: string;
  email?: string;
  phone?: string;
  signer_name?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]{6,32}$/;

function validate(v: {
  first_name: string;
  email: string;
  phone: string;
  ai_call_consent: boolean;
  signer_name: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.first_name.trim()) errors.first_name = "Please enter your first name.";
  else if (v.first_name.trim().length > 80) errors.first_name = "First name is too long.";
  if (!v.email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (!v.phone.trim()) errors.phone = "Please enter your phone number.";
  else if (!PHONE_RE.test(v.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (v.ai_call_consent && v.signer_name.trim().length < 2) {
    errors.signer_name = "Type your full legal name to consent to AI/prerecorded calls.";
  }
  return errors;
}

function ReservePage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [aiCallConsent, setAiCallConsent] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const errors = useMemo(
    () =>
      attempted
        ? validate({
            first_name: firstName,
            email,
            phone,
            ai_call_consent: aiCallConsent,
            signer_name: signerName,
          })
        : {},
    [attempted, firstName, email, phone, aiCallConsent, signerName],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setGlobalError(null);
    const errs = validate({
      first_name: firstName,
      email,
      phone,
      ai_call_consent: aiCallConsent,
      signer_name: signerName,
    });
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          consents: {
            email: emailConsent,
            sms: smsConsent,
            ai_call: aiCallConsent,
            signer_name: aiCallConsent ? signerName.trim() : "",
          },
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        next?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok || !body.next) {
        setGlobalError("We couldn't reserve your seat. Check your details and try again.");
        return;
      }
      navigate({ to: body.next });
    } catch {
      setGlobalError("Network hiccup. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReserveFrame>
      <main className="mx-auto max-w-2xl px-5 py-14 sm:py-24">
        <RevealOnView delayMs={0}>
          <div className="mx-auto w-full max-w-sm">
            <WingedPlaneMark className="w-full h-auto" />
          </div>
        </RevealOnView>

        <RevealOnView delayMs={80}>
          <div className="mt-12 text-center">
            <h1 className="reserve-display reserve-gold-text text-3xl sm:text-5xl leading-tight">
              Reserve Your Seat
            </h1>
            <p className="mt-4 reserve-body-lg text-[rgba(245,241,228,0.85)]">
              <span className="reserve-eyebrow reserve-eyebrow--centered reserve-gold-text inline-block">
                AI AutoPilot 2-Day Summit
              </span>
              <br />
              August 29-30 · 11 AM-4 PM ET both days
            </p>
          </div>
        </RevealOnView>

        <RevealOnView delayMs={160}>
          <form
            onSubmit={onSubmit}
            className="mt-7 space-y-5"
            aria-describedby={globalError ? "rf-global-error" : undefined}
          >
            <div>
              <label htmlFor="rf-first" className="reserve-label block mb-2">
                First name
              </label>
              <input
                id="rf-first"
                name="first_name"
                type="text"
                required
                minLength={1}
                maxLength={80}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={errors.first_name ? true : undefined}
                aria-describedby={errors.first_name ? "rf-first-error" : undefined}
                className="reserve-input"
              />
              {errors.first_name ? (
                <p id="rf-first-error" className="reserve-field-error">
                  {errors.first_name}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="rf-email" className="reserve-label block mb-2">
                Email
              </label>
              <input
                id="rf-email"
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "rf-email-error" : undefined}
                className="reserve-input"
              />
              {errors.email ? (
                <p id="rf-email-error" className="reserve-field-error">
                  {errors.email}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="rf-phone" className="reserve-label block mb-2">
                Phone
              </label>
              <input
                id="rf-phone"
                name="phone"
                type="tel"
                required
                minLength={6}
                maxLength={32}
                pattern="[+()\-.\s0-9]{6,32}"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "rf-phone-error" : undefined}
                className="reserve-input"
              />
              {errors.phone ? (
                <p id="rf-phone-error" className="reserve-field-error">
                  {errors.phone}
                </p>
              ) : null}
            </div>

            <ReservationConsentFields
              idPrefix="reserve"
              emailConsent={emailConsent}
              onEmailConsentChange={setEmailConsent}
              smsConsent={smsConsent}
              onSmsConsentChange={setSmsConsent}
              aiCallConsent={aiCallConsent}
              onAiCallConsentChange={setAiCallConsent}
              signerName={signerName}
              onSignerNameChange={setSignerName}
              signerNameError={errors.signer_name}
            />

            <div id="rf-global-error" role="alert" aria-live="polite" className="min-h-[1.25rem]">
              {globalError ? (
                <p className="reserve-note-15" style={{ color: "#FFB4B4" }}>
                  {globalError}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="reserve-cta-primary w-full rounded-xl py-4 reserve-body-lg"
            >
              {submitting ? "Reserving…" : "Reserve My Seat"}
            </button>

            <p className="text-center reserve-note-15" style={{ opacity: 0.7 }}>
              Nothing is charged. You choose your ticket on the next page.
            </p>
          </form>
        </RevealOnView>
      </main>
    </ReserveFrame>
  );
}
