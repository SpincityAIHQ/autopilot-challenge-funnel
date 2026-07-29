import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const LANDING = readFileSync("src/routes/index.tsx", "utf8");
const FORM = readFileSync("src/components/reserve/LandingReservationForm.tsx", "utf8");
const ROOT_METADATA = [
  readFileSync("src/routes/__root.tsx", "utf8"),
  readFileSync("src/lib/site-meta.ts", "utf8"),
].join("\n");
const GENERAL_ADMISSION_CALENDAR = readFileSync("src/lib/ics.ts", "utf8");

describe("landing reservation disclosure", () => {
  it("is closed by default and controlled by the landing route", () => {
    expect(LANDING).toContain("const [reservationOpen, setReservationOpen] = useState(false);");
    expect(LANDING).toContain("open={reservationOpen}");
    expect(LANDING).toContain("onOpenChange={onReservationOpenChange}");
    expect(FORM).toContain(
      "LandingReservationForm({ open, onOpenChange }: LandingReservationFormProps)",
    );
    expect(FORM).toContain("<Collapsible open={open} onOpenChange={onOpenChange}");
    expect(FORM).not.toContain("const [isOpen, setIsOpen]");
  });

  it("opens and scrolls to the same trigger from the final CTA in one click", () => {
    expect(LANDING).toContain("<FinalCta onReserve={() => setReservationOpen(true)} />");
    expect(LANDING).toContain('href="#reserve-seat"');
    expect(LANDING).toContain("onClick={onReserve}");
    expect(FORM).toContain('id="reserve-seat"');
    expect(FORM).toContain("<CollapsibleTrigger asChild>");
  });

  it("keeps the disclosure and validation relationships accessible", () => {
    expect(FORM).toContain('type="button"');
    expect(FORM).toContain('role="region"');
    expect(FORM).toContain('aria-labelledby="reserve-seat"');
    expect(FORM).toContain("aria-busy={submitting}");
    for (const [field, errorId] of [
      ["first_name", "landing-first-name-error"],
      ["email", "landing-email-error"],
      ["phone", "landing-phone-error"],
    ] as const) {
      expect(FORM).toContain(`aria-describedby={errors.${field} ? "${errorId}" : undefined}`);
      expect(FORM).toContain(`id="${errorId}"`);
    }
    expect(FORM.indexOf("<CollapsibleTrigger")).toBeLessThan(FORM.indexOf("<CollapsibleContent"));
    expect(FORM.indexOf("<CollapsibleContent")).toBeLessThan(FORM.indexOf("<form"));
  });

  it("does not expose the retired three-step explainer", () => {
    for (const copy of [
      "1. Hold your GA seat",
      "2. Watch the GA ticket video",
      "3. Choose your ticket and check out",
      "On the next page, Spin explains",
    ]) {
      expect(FORM).not.toContain(copy);
    }
  });

  it("does not promise the VIP AI Business GPS product to General Admission", () => {
    for (const generalAdmissionSurface of [LANDING, ROOT_METADATA, GENERAL_ADMISSION_CALENDAR]) {
      expect(generalAdmissionSurface).not.toContain("AI Business GPS");
    }
    expect(LANDING).toContain("AI Readiness Blueprint");
    expect(ROOT_METADATA).toContain("AI readiness blueprint");
    expect(GENERAL_ADMISSION_CALENDAR).toContain("AI readiness blueprint");
    expect(LANDING).toContain("Income is not guaranteed.");
  });
});
