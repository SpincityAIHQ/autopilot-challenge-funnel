import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const NOTE =
  "This email confirms your AI AutoPilot account or access. Optional learning and promotional emails follow your separate preferences.";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Your lessons are unlocked"} note={NOTE} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    typeof data.subject === "string" && data.subject.trim() ? data.subject : "Your lessons are unlocked",
  displayName: "Access activated",
  previewData: {
    subject: "Your lessons are unlocked",
    heading: "Your lessons are unlocked",
    paragraphs: ["Your ticket is activated and your lessons are open in your account."],
    actionLabel: "Open your lessons",
    actionUrl: "https://aiautopilotsummit.com/learn",
  },
} satisfies TemplateEntry;
