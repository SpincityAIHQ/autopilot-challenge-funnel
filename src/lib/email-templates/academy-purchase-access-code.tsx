import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const NOTE =
  "This is your purchase email. It carries the access details for the ticket you bought. Optional learning and promotional emails follow your separate preferences.";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Your ticket access details"} note={NOTE} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    typeof data.subject === "string" && data.subject.trim() ? data.subject : "Your ticket access details",
  displayName: "Purchase access code",
  // Synthetic preview only — never a real code.
  previewData: {
    subject: "Your ticket access details",
    heading: "Your ticket access details",
    paragraphs: [
      "Thank you for your ticket. Use the access details below to activate your lessons.",
      "Access code: SPIN-SAMPLE-CODE",
    ],
    actionLabel: "Activate your ticket",
    actionUrl: "https://aiautopilotsummit.com/redeem",
  },
} satisfies TemplateEntry;
