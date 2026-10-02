import * as React from "react";
import { AcademyEmail, type AcademyEmailProps } from "./academy-layout";
import type { TemplateEntry } from "./registry";

const NOTE =
  "This email confirms your AI AutoPilot purchase. Your ticket opens when you choose Activate my purchased lessons in your account; signing in alone does not start your access period.";

const Email = (props: AcademyEmailProps) => (
  <AcademyEmail {...props} heading={props.heading || "Your ticket is ready"} note={NOTE} />
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    typeof data.subject === "string" && data.subject.trim() ? data.subject : "Your ticket is ready",
  displayName: "Purchase confirmed (ticket ready)",
  previewData: {
    subject: "Your General Admission ticket is ready",
    heading: "Your General Admission ticket is ready",
    paragraphs: [
      "Your General Admission purchase is confirmed. Your ticket is matched to the email you used at checkout.",
      "Create your free account with that exact email, confirm it from the email we send, then choose Activate my purchased lessons. There is no code to type.",
      "Thoth is your guide inside: every recording, every timed word, your watch map and your activity sheet.",
    ],
    actionLabel: "Create your account",
    actionUrl: "https://aiautopilotsummit.com/join?next=%2Fredeem",
  },
} satisfies TemplateEntry;
