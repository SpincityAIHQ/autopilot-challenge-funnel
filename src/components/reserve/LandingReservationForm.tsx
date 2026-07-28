import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type FieldErrors = {
  first_name?: string;
  email?: string;
  phone?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-.\s\d]{6,32}$/;

function validate(values: { first_name: string; email: string; phone: string }): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.first_name.trim()) {
    errors.first_name = "Please enter your first name.";
  } else if (values.first_name.trim().length > 80) {
    errors.first_name = "First name is too long.";
  }

  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!EMAIL_RE.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (!PHONE_RE.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }

  return errors;
}

type LandingReservationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LandingReservationForm({ open, onOpenChange }: LandingReservationFormProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const errors = useMemo(
    () => (attempted ? validate({ first_name: firstName, email, phone }) : {}),
    [attempted, firstName, email, phone],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setGlobalError(null);

    const nextErrors = validate({
      first_name: firstName,
      email,
      phone,
    });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/public/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        next?: string;
      } | null;

      if (!response.ok || !body?.ok || !body.next) {
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

  const inputClass =
    "mt-2 w-full rounded-md border border-border bg-[color:var(--surface)] px-4 py-3 text-base text-foreground outline-none transition focus-visible:border-[color:var(--gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/20";

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="mt-5 max-w-2xl scroll-mt-6">
      <CollapsibleTrigger asChild>
        <button
          id="reserve-seat"
          type="button"
          disabled={submitting}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-[color:var(--gold)]/55 bg-primary px-5 py-4 text-left font-heading text-base font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_30px_rgba(15,191,127,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 sm:px-6"
        >
          <span>Reserve General Admission</span>
          <span
            aria-hidden="true"
            className={`text-xl leading-none transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            ⌄
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent
        role="region"
        aria-labelledby="reserve-seat"
        className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      >
        <form
          onSubmit={onSubmit}
          aria-busy={submitting}
          aria-describedby={globalError ? "landing-reserve-error" : undefined}
          className="rounded-b-xl border border-t-0 border-[color:var(--gold)]/45 bg-[color:var(--surface)] p-5 shadow-[0_0_32px_rgba(218,177,72,0.08)] sm:p-6"
        >
          <p className="label-mono text-[color:var(--gold)]">Place the seat under your name</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Enter your name, best email, and mobile number. No card is needed and nothing is charged
            on this page.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-foreground">
              First name
              <input
                name="first_name"
                type="text"
                required
                minLength={1}
                maxLength={80}
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-invalid={errors.first_name ? true : undefined}
                aria-describedby={errors.first_name ? "landing-first-name-error" : undefined}
                className={inputClass}
              />
              {errors.first_name ? (
                <span id="landing-first-name-error" className="mt-1 block text-xs text-red-300">
                  {errors.first_name}
                </span>
              ) : null}
            </label>

            <label className="text-sm font-medium text-foreground">
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "landing-email-error" : undefined}
                className={inputClass}
              />
              {errors.email ? (
                <span id="landing-email-error" className="mt-1 block text-xs text-red-300">
                  {errors.email}
                </span>
              ) : null}
            </label>

            <label className="text-sm font-medium text-foreground">
              Phone
              <input
                name="phone"
                type="tel"
                required
                minLength={6}
                maxLength={32}
                pattern="[+()\-.\s0-9]{6,32}"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "landing-phone-error" : undefined}
                className={inputClass}
              />
              {errors.phone ? (
                <span id="landing-phone-error" className="mt-1 block text-xs text-red-300">
                  {errors.phone}
                </span>
              ) : null}
            </label>
          </div>

          <div
            id="landing-reserve-error"
            role="alert"
            aria-live="polite"
            className="mt-3 min-h-[1.25rem]"
          >
            {globalError ? <p className="text-sm text-red-300">{globalError}</p> : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 font-heading text-base font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_28px_rgba(15,191,127,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
          >
            {submitting ? "Reserving…" : "Reserve My General Admission Seat"}
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            Your contact details stay attached to your Summit reservation.
          </p>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
