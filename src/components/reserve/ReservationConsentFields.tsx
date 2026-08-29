import { CONSENT_COPY, SELLER_IDENTITY } from "@/lib/consent";

type ReservationConsentFieldsProps = {
  idPrefix: string;
  emailConsent: boolean;
  onEmailConsentChange: (checked: boolean) => void;
  smsConsent: boolean;
  onSmsConsentChange: (checked: boolean) => void;
  aiCallConsent: boolean;
  onAiCallConsentChange: (checked: boolean) => void;
  signerName: string;
  onSignerNameChange: (name: string) => void;
  signerNameError?: string;
};

/**
 * Seller-specific, channel-separated reminder consent for public reservation forms.
 * All choices intentionally render unchecked; contact details alone never grant consent.
 */
export function ReservationConsentFields({
  idPrefix,
  emailConsent,
  onEmailConsentChange,
  smsConsent,
  onSmsConsentChange,
  aiCallConsent,
  onAiCallConsentChange,
  signerName,
  onSignerNameChange,
  signerNameError,
}: ReservationConsentFieldsProps) {
  const noteId = `${idPrefix}-consent-note`;
  const signerErrorId = `${idPrefix}-signer-name-error`;

  return (
    <fieldset
      className="mt-5 rounded-xl border border-[color:var(--gold)]/35 bg-black/10 p-4 sm:p-5"
      aria-describedby={noteId}
    >
      <legend className="px-1 font-heading text-base font-semibold text-foreground">
        Optional Summit reminder permissions
      </legend>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose each channel separately. All three are optional and consent is not required to
        reserve, purchase, or attend. Seller: {SELLER_IDENTITY}.
      </p>

      <div className="mt-4 space-y-4">
        <label
          htmlFor={`${idPrefix}-consent-email`}
          className="flex cursor-pointer items-start gap-3 text-sm text-foreground"
        >
          <input
            id={`${idPrefix}-consent-email`}
            name="consent_email"
            type="checkbox"
            checked={emailConsent}
            onChange={(event) => onEmailConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--gold)]"
          />
          <span className="text-muted-foreground">{CONSENT_COPY.email}</span>
        </label>

        <label
          htmlFor={`${idPrefix}-consent-sms`}
          className="flex cursor-pointer items-start gap-3 text-sm text-foreground"
        >
          <input
            id={`${idPrefix}-consent-sms`}
            name="consent_sms"
            type="checkbox"
            checked={smsConsent}
            onChange={(event) => onSmsConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--gold)]"
          />
          <span className="text-muted-foreground">{CONSENT_COPY.sms}</span>
        </label>

        <label
          htmlFor={`${idPrefix}-consent-ai-call`}
          className="flex cursor-pointer items-start gap-3 text-sm text-foreground"
        >
          <input
            id={`${idPrefix}-consent-ai-call`}
            name="consent_ai_call"
            type="checkbox"
            checked={aiCallConsent}
            onChange={(event) => onAiCallConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--gold)]"
          />
          <span className="text-muted-foreground">{CONSENT_COPY.ai_call}</span>
        </label>
      </div>

      {aiCallConsent ? (
        <label htmlFor={`${idPrefix}-signer-name`} className="mt-4 block">
          <span className="text-sm font-medium text-foreground">
            Typed e-signature for AI/prerecorded calls
          </span>
          <input
            id={`${idPrefix}-signer-name`}
            name="ai_call_signer_name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={signerName}
            onChange={(event) => onSignerNameChange(event.target.value)}
            placeholder="Type your full legal name"
            aria-invalid={signerNameError ? true : undefined}
            aria-describedby={signerNameError ? signerErrorId : noteId}
            className="mt-2 w-full rounded-md border border-border bg-[color:var(--surface)] px-4 py-3 text-base text-foreground outline-none transition focus-visible:border-[color:var(--gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/20"
          />
          {signerNameError ? (
            <span id={signerErrorId} className="mt-1 block text-xs text-red-300">
              {signerNameError}
            </span>
          ) : null}
          <span className="mt-2 block text-xs text-muted-foreground">
            Typing your name is your written signature for the exact AI/prerecorded-call consent
            above, tied to the phone number you entered.
          </span>
        </label>
      ) : null}

      <p id={noteId} className="mt-4 text-xs text-muted-foreground">
        Leave any box unchecked to decline that channel. Use the unsubscribe link in emails or reply
        STOP to end texts. You can revoke any permission at any time through communication
        preferences or by writing Sebastian@spincityhq.com. See our{" "}
        <a className="underline underline-offset-2" href="/privacy">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a className="underline underline-offset-2" href="/terms">
          Terms
        </a>
        .
      </p>
    </fieldset>
  );
}
