/**
 * Owner-only native email sample harness (manual, run from the sandbox).
 *
 * Renders each registered template with synthetic preview data and, with
 * --send, submits exactly one sample of each to the verified owner address
 * through Lovable's managed email API. Never touches the outbox queue and
 * never enables customer dispatch.
 */
import { render } from "@react-email/render";
import * as React from "react";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const OWNER = "sebastian@spincityhq.com";
const PREFIX = "Test — AI AutoPilot —";
const RUN_ID = process.env.OWNER_TEST_RUN_ID ?? "native-email-owner-20260911-a";
const send = process.argv.includes("--send");

if (send && process.env.ACADEMY_OWNER_EMAIL_TEST_ENABLED !== "true") {
  throw new Error("owner test gate off");
}
if (process.env.ACADEMY_NATIVE_EMAIL_ENABLED === "true") {
  throw new Error("production native email gate must stay off");
}

const SAMPLE_NOTE = "Sample only — this is an owner test message. It carries no real purchase, access code or entitlement.";
const SAMPLE_TEMPLATES = new Set(["academy-purchase-access-code", "academy-access-activated"]);

for (const [name, entry] of Object.entries(TEMPLATES)) {
  const base = entry.previewData ?? {};
  const data = SAMPLE_TEMPLATES.has(name)
    ? { ...base, paragraphs: [SAMPLE_NOTE, ...((base as any).paragraphs ?? [])] }
    : base;
  const el = React.createElement(entry.component, data);
  const html = await render(el);
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const subject = typeof entry.subject === "function" ? entry.subject(data) : entry.subject;
  console.log(`\n[${name}] subject="${PREFIX} ${subject}" bytes=${html.length}`);
  console.log(`  links: ${links.join(" | ") || "(none)"}`);
  if (!send) continue;
  try {
    const result = await sendTemplateEmail(name, OWNER, {
      templateData: data,
      purpose: "transactional",
      subjectPrefix: PREFIX,
      idempotencyKey: `owner-test:${RUN_ID}:${OWNER}:${name}`,
    });
    console.log(`  outcome: ${result.sent ? "accepted" : `not_sent:${result.reason}`} at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.log(`  outcome: error status=${error?.status ?? "?"} code=${error?.code ?? "?"} at ${new Date().toISOString()}`);
  }
}
