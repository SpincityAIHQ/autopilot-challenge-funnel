import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Ten minutes to your first department"} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    typeof data.subject === "string" && data.subject.trim()
      ? data.subject
      : "Ten minutes to your first department",
  displayName: "Never started (24h)",
  previewData: {
    subject: "Ten minutes to your first department",
    heading: "Ten minutes to your first department",
    paragraphs: [
      "Set aside ten minutes and name your first department.",
      "The free training is waiting in your classroom whenever you are ready.",
    ],
    actionLabel: "Start the free training",
    actionUrl: "https://aiautopilotsummit.com/class",
  },
} satisfies TemplateEntry;
