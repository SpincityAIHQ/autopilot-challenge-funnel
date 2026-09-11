import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Pick up where you left off"} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    typeof data.subject === "string" && data.subject.trim() ? data.subject : "Pick up where you left off",
  displayName: "Inactivity (48h, saved progress)",
  previewData: {
    subject: "Your next 10 minutes in the free training",
    heading: "Pick up where you left off",
    paragraphs: [
      "Your saved viewing stops partway through the recording.",
      "Ten minutes gets you to the next step in your AI business tower.",
    ],
    actionLabel: "Resume the lesson",
    actionUrl: "https://aiautopilotsummit.com/class",
  },
} satisfies TemplateEntry;
