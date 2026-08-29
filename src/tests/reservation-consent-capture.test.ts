import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { CONSENT_COPY, SELLER_IDENTITY } from "@/lib/consent";

const component = readFileSync("src/components/reserve/ReservationConsentFields.tsx", "utf8");
const landingForm = readFileSync("src/components/reserve/LandingReservationForm.tsx", "utf8");
const reservePage = readFileSync("src/routes/reserve/index.tsx", "utf8");
const reserveApi = readFileSync("src/routes/api/public/reserve.ts", "utf8");
const databaseTypes = readFileSync("src/integrations/supabase/types.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260829090000_reservation_consent_capture.sql",
  "utf8",
);

describe("public reservation consent capture", () => {
  it("shows separate optional email, SMS and AI-call controls next to both reservation submits", () => {
    expect(component).toContain('name="consent_email"');
    expect(component).toContain('name="consent_sms"');
    expect(component).toContain('name="consent_ai_call"');
    expect(component).toContain("All three are optional and consent is not required to");
    expect(component).toContain("Seller: {SELLER_IDENTITY}");
    expect(component).toContain("{CONSENT_COPY.email}");
    expect(component).toContain("{CONSENT_COPY.sms}");
    expect(component).toContain("{CONSENT_COPY.ai_call}");
    expect(component).toContain('href="/privacy"');
    expect(component).toContain('href="/terms"');
    for (const channel of ["email", "sms", "ai_call"] as const) {
      expect(CONSENT_COPY[channel]).toContain(SELLER_IDENTITY);
    }
    for (const source of [landingForm, reservePage]) {
      expect(source).toContain("<ReservationConsentFields");
      expect(source).toContain("const [emailConsent, setEmailConsent] = useState(false)");
      expect(source).toContain("const [smsConsent, setSmsConsent] = useState(false)");
      expect(source).toContain("const [aiCallConsent, setAiCallConsent] = useState(false)");
    }
  });

  it("requires a typed signature only when AI-call consent is selected", () => {
    expect(component).toContain("{aiCallConsent ? (");
    expect(component).toContain('name="ai_call_signer_name"');
    expect(component).toContain("Typed e-signature for AI/prerecorded calls");
    for (const source of [landingForm, reservePage]) {
      expect(source).toContain("ai_call_consent: aiCallConsent");
      expect(source).toContain("Type your full legal name to consent");
      expect(source).toContain('signer_name: aiCallConsent ? signerName.trim() : ""');
    }
  });

  it("never infers consent from phone presence and persists canonical evidence", () => {
    expect(reserveApi).toContain("const emailGranted = consents?.email === true");
    expect(reserveApi).toContain("const smsGranted = consents?.sms === true");
    expect(reserveApi).toContain("const aiCallGranted = consents?.ai_call === true");
    expect(reserveApi).toContain("contact details are");
    expect(reserveApi).toContain("never interpreted as consent");
    expect(reserveApi).toContain("_copy_version: CONSENT_COPY_VERSION");
    expect(reserveApi).toContain("_email_consent_text: CONSENT_COPY.email");
    expect(reserveApi).toContain("_sms_consent_text: CONSENT_COPY.sms");
    expect(reserveApi).toContain("_ai_call_consent_text: CONSENT_COPY.ai_call");
    expect(reserveApi).toContain('_source: "public-reservation"');
  });

  it("records reservation plus explicit granted/declined channel rows atomically", () => {
    expect(migration).toContain("create_summit_reservation_with_consents");
    expect(migration).toContain("INSERT INTO public.summit_reservations");
    expect(migration).toContain("RETURNING id INTO created_reservation_id");
    expect(migration).toContain("INSERT INTO public.marketing_consents");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS reservation_id uuid");
    expect(migration).toContain("REFERENCES public.summit_reservations(id) ON DELETE SET NULL");
    expect(migration).toContain("marketing_consents_reservation_id_idx");
    expect(migration.match(/^\s{4}created_reservation_id,$/gm)?.length).toBe(3);
    expect(migration).toContain("'email'");
    expect(migration).toContain("'sms'");
    expect(migration).toContain("'ai_call'");
    expect(migration).toContain("captured_at timestamptz := statement_timestamp()");
    expect(migration).toContain("CASE WHEN _email_granted THEN captured_at ELSE NULL END");
    expect(migration).toContain("CASE WHEN _sms_granted THEN captured_at ELSE NULL END");
    expect(migration).toContain("CASE WHEN _ai_call_granted THEN captured_at ELSE NULL END");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("SET search_path TO ''");
    expect(migration).not.toContain("SECURITY DEFINER");
    expect(migration).toContain("REVOKE ALL ON FUNCTION");
    expect(migration).toContain("TO service_role");
  });

  it("types the nullable reservation relationship on marketing consent rows", () => {
    expect(databaseTypes).toContain("reservation_id: string | null");
    expect(databaseTypes).toContain("reservation_id?: string | null");
    expect(databaseTypes).toContain('foreignKeyName: "marketing_consents_reservation_id_fkey"');
    expect(databaseTypes).toContain('referencedRelation: "summit_reservations"');
    expect(databaseTypes).toContain('referencedColumns: ["id"]');
  });
});
