import type { AcademyMessage } from "./academy-messages";

export type MessageDraft = AcademyMessage & {
  message_origin: "thoth_ai" | "authored_template";
  generation_state: string;
};
export type MessageDraftBrief = {
  assistant: "Thoth" | "AI Spin";
  interventionReason: string;
  lessonTitle: string;
};
const forbidden = /(?:https?:|www\.|@|[0-9$€£%<>]|\b(?:today|tomorrow|tonight|deadline|midnight|hours?|days?|weeks?|months?|years?|call|dial|phone|text|sms|purchase|buy|upgrade|sale|price|discount|earned|earning|income|revenue|profit|guarantee|approved|completed|finished|passed|failed|mastered|diagnos\w*|anxious|depressed|lazy|behind|overdue|must)\b)/i;
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The engine fixes eligibility, evidence, next action and channel before Thoth drafts. */
export async function draftAcademyMessage(
  base: AcademyMessage,
  brief: MessageDraftBrief,
  budget: () => Promise<boolean>,
): Promise<MessageDraft> {
  const fallback = (generation_state: string): MessageDraft => ({ ...base, message_origin: "authored_template", generation_state });
  if (process.env.ACADEMY_THOTH_MESSAGES_ENABLED !== "true") return fallback("ai_drafting_disabled");
  if (!process.env.LOVABLE_API_KEY) return fallback("ai_provider_unavailable");
  try {
    if (!(await budget())) return fallback("ai_budget_unavailable");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": process.env.LOVABLE_API_KEY, "X-Lovable-AIG-SDK": "fetch", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: process.env.ACADEMY_TUTOR_MODEL || "google/gemini-3.7-flash",
        max_tokens: 250,
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: "You are Thoth, the AI learning guide. SPINXP has already decided whether and why a learning-support email is appropriate. Draft only a warm, brief, pressure-free subject prefix and opening sentence. The application will retain the verified evidence and next action verbatim. Return ONLY a JSON object with subject_prefix (3-45 characters) and opening (20-220 characters). Do not mention dates, time periods, numbers, deadlines, calls, purchases, offers, money, scores, progress claims, approval, completion, health, personality, or a student's inferred feelings. Do not address a person by name. Do not request a reply through email; help lives inside the platform. Use the supplied interventionReason only to choose an encouraging tone, never to invent facts. Never decide the channel or send anything." },
          { role: "user", content: JSON.stringify({ assistant: brief.assistant, interventionReason: brief.interventionReason, instruction: "Write a supportive bridge into the already verified learning evidence and next step." }) },
        ],
      }),
    });
    if (!response.ok) return fallback("ai_provider_error");
    const raw = await response.text();
    if (raw.length > 12000) return fallback("ai_response_too_large");
    const outer = JSON.parse(raw);
    const text = outer?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length > 2000) return fallback("ai_invalid_output");
    const draft = JSON.parse(text);
    if (!draft || typeof draft.subject_prefix !== "string" || typeof draft.opening !== "string") return fallback("ai_invalid_output");
    const prefix = draft.subject_prefix.trim();
    const opening = draft.opening.trim();
    if (prefix.length < 3 || prefix.length > 45 || opening.length < 20 || opening.length > 220 ||
        /[\r\n\u0000-\u001f]/.test(prefix + opening) || forbidden.test(prefix + " " + opening)) return fallback("ai_rejected_output");
    // The model's prose is supplementary. All learner facts, approved action, links,
    // SMS text and channel instructions remain exactly as authored by the engine.
    return {
      ...base,
      message_subject: `${prefix}: ${brief.lessonTitle}`.slice(0,180),
      message_text: opening + "\n\n" + base.message_text,
      message_html: `<p>${escapeHtml(opening)}</p>` + base.message_html,
      message_origin: "thoth_ai",
      generation_state: "ai_draft_validated",
    };
  } catch {
    return fallback("ai_provider_unavailable");
  }
}
