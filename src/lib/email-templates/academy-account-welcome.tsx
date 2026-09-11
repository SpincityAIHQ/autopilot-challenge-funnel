import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const NOTE =
  "This email confirms your AI AutoPilot account or access. Optional learning and promotional emails follow your separate preferences.";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Your AI AutoPilot account is ready"} note={NOTE} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    typeof data.subject === "string" && data.subject.trim() ? data.subject : "Your AI AutoPilot account is ready",
  displayName: "Account ready (welcome)",
  previewData: {
    subject: "Your AI AutoPilot account is ready",
    heading: "Your AI AutoPilot account is ready",
    paragraphs: [
      "Your account is confirmed. Bring one repeated task from your business.",
      "Open the free training, map your AI business tower, ask Thoth and save your work.",
    ],
    actionLabel: "Open your classroom",
    actionUrl: "https://aiautopilotsummit.com/class",
  },
} satisfies TemplateEntry;
