/**
 * Substantive resource content used by /resources and /resources/$slug.
 * SERVER-ONLY: never import from public route components.
 * by /api/public/resources/read after cookie session validation.
 * hashed unexpired entitlement token check. NEVER import `.content` into
 * a public page component; the type discourages it.
 */

export type ResourceTier = "ga" | "vip" | "vault";

export interface ResourceSection {
  heading: string;
  bullets: string[];
}

export interface ResourceContent {
  slug: string;
  tier: ResourceTier;
  name: string;
  preview: string;
  sections: ResourceSection[];
}

export const RESOURCE_INDEX: readonly ResourceContent[] = [
  // ============ GA tier ============
  {
    slug: "action-guide",
    tier: "ga",
    name: "Summit Action Guide",
    preview:
      "The two-day live implementation guide. Preview: what to bring, how to move fast, what 'done' looks like each day.",
    sections: [
      {
        heading: "Day 1 · MAP IT",
        bullets: [
          "Name the wall — the specific bottleneck that AI can move this month.",
          "Fill Research / Create / Distribute Autonomy Map with real jobs.",
          "Pick THREE jobs AI takes over this month (no more, no less).",
          "Rules of the fence — what AI does and doesn't touch.",
          "Homework: bring one lead source + one offer to Day 2.",
        ],
      },
      {
        heading: "Day 2 · BUILD IT",
        bullets: [
          "Turn one mapped job into a working AI-powered workflow, live.",
          "Set reliability checks: pass/fail definition + one human review point.",
          "Wire your capture, follow-up, and delivery to the same place.",
          "Ship an internal test with a real message from a real inbox.",
          "Reliability math: how often it holds up before scale.",
        ],
      },
      {
        heading: "The 8 live prompts you'll use",
        bullets: [
          "1. Map my business as Research / Create / Distribute.",
          "2. Rewrite my offer for a specific buyer, with proof and risk reversal.",
          "3. Draft a 5-email welcome sequence with a clear next step.",
          "4. Build a 60-second follow-up call script (human, not corporate).",
          "5. Turn one long-form asset into a 7-day content pull.",
          "6. Write a proposal for a specific corporate buyer.",
          "7. Rules-of-the-fence checklist for any AI agent I hand a task.",
          "8. What can I stop doing this week that AI can already handle?",
        ],
      },
    ],
  },
  {
    slug: "ai-readiness-scorecard",
    tier: "ga",
    name: "AI Readiness Scorecard",
    preview:
      "25 questions across 5 pillars (Data, Distribution, Delivery, Decision-making, Discipline). Preview: how to score and interpret the pillar grade.",
    sections: [
      {
        heading: "How to score",
        bullets: [
          "5 pillars × 5 questions = 25 questions total.",
          "Each question = 0 to 4 points. Max 100.",
          "Pillar grade = pillar total (max 20). Report both.",
          "Under 12 in any pillar = the wall for this month.",
        ],
      },
      {
        heading: "Pillar 1 · Data",
        bullets: [
          "Do you know your last 20 customers by name and channel?",
          "Is there one place your customer list lives?",
          "Do you have a note file per customer or offer?",
          "Can you export leads/customers in one click?",
          "Do you know your top 3 questions buyers ask before buying?",
        ],
      },
      {
        heading: "Pillar 2 · Distribution",
        bullets: [
          "Do you post from one editorial calendar?",
          "Do you have one nurture sequence that runs on its own?",
          "Do you follow up within 24 hours of a new lead?",
          "Do you know your best channel by cost per lead?",
          "Is there a link between your posts and your offer page?",
        ],
      },
      {
        heading: "Pillar 3 · Delivery",
        bullets: [
          "Is 'what buyers get' written down anywhere?",
          "Do you have a repeatable onboarding step 1?",
          "Do you have a scheduled check-in with paying clients?",
          "Do you have SOPs for the top 3 recurring tasks?",
          "Do you have refund/complaint rules that anyone on your team can follow?",
        ],
      },
      {
        heading: "Pillar 4 · Decision-making",
        bullets: [
          "Do you review revenue by offer weekly?",
          "Do you know your gross margin per offer?",
          "Do you have a 'stop doing' list from the last quarter?",
          "Do you know cost per customer acquired?",
          "Do you decide from data, not vibes?",
        ],
      },
      {
        heading: "Pillar 5 · Discipline",
        bullets: [
          "Do you protect 4 focused hours per work day?",
          "Do you have a written no-list this month?",
          "Do you finish what you start before opening a new tab?",
          "Do you have one accountability partner?",
          "Do you review the week each Friday?",
        ],
      },
    ],
  },
  {
    slug: "buyer-offer-canvas",
    tier: "ga",
    name: "Buyer + Offer Canvas",
    preview:
      "One-page canvas that separates FACT / INFERENCE / UNKNOWN for your buyer + offer. Preview: the four fields and how to fill them without lying to yourself.",
    sections: [
      {
        heading: "Field 1 · Buyer",
        bullets: [
          "FACT — what your last 5 buyers actually said/did.",
          "INFERENCE — what you believe about them (mark as inference, not fact).",
          "UNKNOWN — what you'd have to ask to know.",
        ],
      },
      {
        heading: "Field 2 · Problem",
        bullets: [
          "FACT — words the buyer used, verbatim.",
          "INFERENCE — how you're translating that into a bigger problem.",
          "UNKNOWN — what still doesn't line up.",
        ],
      },
      {
        heading: "Field 3 · Offer",
        bullets: [
          "FACT — exactly what buyers get, in the order they get it.",
          "INFERENCE — what you assume they value most.",
          "UNKNOWN — pricing/format they'd actually pay for.",
        ],
      },
      {
        heading: "Field 4 · Proof",
        bullets: [
          "FACT — receipts you already have (screenshots, wins, revenue).",
          "INFERENCE — what those receipts imply about your promise.",
          "UNKNOWN — what evidence you still need to earn.",
        ],
      },
    ],
  },

  // ============ VIP tier ============
  {
    slug: "vip-proposal-kit",
    tier: "vip",
    name: "VIP Proposal + Outreach Kit",
    preview:
      "The corporate outreach + proposal kit built for VIP registrants.",
    sections: [
      {
        heading: "3-touch outreach cadence",
        bullets: [
          "Touch 1 · warm, specific, one-line: what you noticed about their business.",
          "Touch 2 · one deliverable inside the email (prompt, chart, checklist).",
          "Touch 3 · direct ask with a link to a 15-min slot.",
        ],
      },
      {
        heading: "One-page proposal skeleton",
        bullets: [
          "Their problem, in their words.",
          "Your one-line promise.",
          "Scope: what's IN + what's explicitly OUT.",
          "Deliverables + dates.",
          "Investment + payment terms.",
          "Next step + who signs.",
        ],
      },
      {
        heading: "Recording + resource workspace",
        bullets: [
          "Recordings unlock via magic-link email; expire per configured window.",
          "Prompts + assets stay behind entitlement, not in the public bundle.",
          "Refund = revoked access; the link stops working the same day.",
        ],
      },
    ],
  },

  // ============ Vault tier ============
  {
    slug: "company-brain",
    tier: "vault",
    name: "Company Brain Starter Kit",
    preview:
      "One index that any AI agent (or new teammate) can read to sound like you.",
    sections: [
      {
        heading: "Sections to fill",
        bullets: [
          "Who we serve — and who we don't.",
          "Voice + words we always/never use.",
          "Product lines + prices + refund rules.",
          "Top 20 buyer questions with our real answers.",
          "Escalation rules: what humans handle, always.",
        ],
      },
    ],
  },
  {
    slug: "prompt-stack",
    tier: "vault",
    name: "AI Sales + Follow-up Agent Prompt Stack",
    preview:
      "Agent cards for sales, follow-up, and support — with an explicit safety block for every one.",
    sections: [
      {
        heading: "Sales agent card",
        bullets: [
          "Role: help a warm lead pick the right offer.",
          "Never guarantee an outcome. Never quote a price we don't sell.",
          "Escalate: pricing negotiation, refunds, legal, medical, financial.",
        ],
      },
      {
        heading: "Follow-up agent card",
        bullets: [
          "Role: re-engage a lead who paused within 14 days.",
          "Never send at buyer-local 8pm–9am (quiet hours).",
          "Escalate: any 'STOP', 'HELP', or complaint keyword.",
        ],
      },
      {
        heading: "Safety block (paste at the top of every agent prompt)",
        bullets: [
          "You represent NuAmenti. You are AI. If asked, say so.",
          "Never promise outcomes, income, or medical/legal/financial advice.",
          "If unsure — stop and hand to a human. That is a success, not a failure.",
        ],
      },
    ],
  },
  {
    slug: "site-blueprint",
    tier: "vault",
    name: "Lovable Funnel + Site Blueprint",
    preview:
      "The route map + content model for a monetizable Lovable site.",
    sections: [
      {
        heading: "Route map",
        bullets: [
          "/ · sales page with real countdown + one clear offer.",
          "/checkout · single-purpose checkout shell (no payment code).",
          "/confirmed · exact ticket, receipt expectations, calendars, one upsell.",
          "/offer/* · one route per upsell; each individually fail-closed.",
          "/resources · gated by hashed entitlement token, no public paid content.",
        ],
      },
      {
        heading: "Content model",
        bullets: [
          "One tier catalog file. Every price/CTA reads from it.",
          "One env-driven checkout URL per product with a strict host allowlist.",
          "One webhook route; RPC does the fulfillment.",
          "One .ics generator; all-day events until real times are set.",
        ],
      },
    ],
  },
  {
    slug: "campaign-calendar",
    tier: "vault",
    name: "30-Day Campaign Calendar",
    preview:
      "Day-by-day campaign spine for the 30 days after the Summit.",
    sections: [
      {
        heading: "Week 1 — Prove",
        bullets: [
          "Publish one 'what I built at the Summit' asset.",
          "DM 10 warm contacts a personal recap with one artifact.",
          "Email your list a specific before/after.",
        ],
      },
      {
        heading: "Week 2 — Package",
        bullets: [
          "Turn the artifact into a productized offer.",
          "Write the outcome, scope, price, and refund rule.",
          "Book 5 conversations for feedback.",
        ],
      },
      {
        heading: "Week 3 — Sell",
        bullets: [
          "Send 3 offers this week (not 30).",
          "Ask each for a yes/no; write down the 'no' reason.",
          "Iterate copy on the top 'no'.",
        ],
      },
      {
        heading: "Week 4 — Systemize",
        bullets: [
          "Write the SOP for the delivery you just did.",
          "Hand one repeat step to an AI agent using the safety block.",
          "Book next month's calendar before this one ends.",
        ],
      },
    ],
  },
  {
    slug: "proposal-builder",
    tier: "vault",
    name: "Corporate Proposal Builder",
    preview: "Fill-in-the-blank proposal for corporate/agency buyers.",
    sections: [
      {
        heading: "Sections",
        bullets: [
          "Their goal in their words.",
          "Success metric with a number and a date.",
          "Scope (in/out), deliverables, milestones.",
          "Investment + payment schedule + refund rule.",
          "Team + tools + reporting cadence.",
          "Next step + signature block.",
        ],
      },
    ],
  },
  {
    slug: "autonomy-map",
    tier: "vault",
    name: "Autonomy Map + SOP Templates",
    preview: "The Research / Create / Distribute canvas + matching SOP templates.",
    sections: [
      {
        heading: "How the map works",
        bullets: [
          "List every recurring job under Research, Create, or Distribute.",
          "Tag each: HUMAN-ONLY, HUMAN-REVIEWED, or AI-HANDLED.",
          "Move one job per week from HUMAN-ONLY to HUMAN-REVIEWED.",
          "Move one job per week from HUMAN-REVIEWED to AI-HANDLED.",
        ],
      },
      {
        heading: "SOP skeleton",
        bullets: [
          "Trigger: what starts this SOP.",
          "Inputs: what the person or agent needs before starting.",
          "Steps: numbered, verb-first, with a done-definition.",
          "Handoff: who or what runs next.",
          "Escalation: what breaks the SOP and who to page.",
        ],
      },
    ],
  },
  {
    slug: "affiliate-directory",
    tier: "vault",
    name: "Verified Tool Stack + Affiliate Directory",
    preview:
      "Every tool we teach, with a disclosure. Placeholder entries render no outbound CTA until a live URL is verified.",
    sections: [
      {
        heading: "How we list tools",
        bullets: [
          "Every entry names an owner and a status (placeholder / live).",
          "Placeholders show the tool name + disclosure but no clickable link.",
          "Live entries use rel=\"sponsored nofollow noopener noreferrer\".",
          "Every live entry shows the disclosure text on the same screen.",
        ],
      },
    ],
  },
];

export function getResource(slug: string): ResourceContent | null {
  return RESOURCE_INDEX.find((r) => r.slug === slug) ?? null;
}

export function listResourceMetas(): Array<{
  slug: string;
  tier: ResourceTier;
  name: string;
  preview: string;
}> {
  return RESOURCE_INDEX.map(({ slug, tier, name, preview }) => ({
    slug,
    tier,
    name,
    preview,
  }));
}
