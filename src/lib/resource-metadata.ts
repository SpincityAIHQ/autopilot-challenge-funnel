/**
 * PUBLIC resource metadata (safe for the client bundle).
 * Contains only slug/tier/name/preview — never the full sections.
 * Full paid content lives ONLY in resource-content.server.ts, imported
 * by server routes. A production-bundle scan test guards regressions.
 */

export type ResourceTier = "ga" | "vip" | "vault";

export interface ResourceMeta {
  slug: string;
  tier: ResourceTier;
  name: string;
  preview: string;
}

export const RESOURCE_METAS: readonly ResourceMeta[] = [
  { slug: "action-guide", tier: "ga", name: "Summit Action Guide",
    preview: "The two-day live implementation guide. Preview: what to bring, how to move fast, what 'done' looks like each day." },
  { slug: "ai-readiness-scorecard", tier: "ga", name: "AI Readiness Scorecard",
    preview: "25 questions across 5 pillars (Data, Distribution, Delivery, Decision-making, Discipline). Preview: how to score and interpret the pillar grade." },
  { slug: "buyer-offer-canvas", tier: "ga", name: "Buyer + Offer Canvas",
    preview: "One-page canvas that separates FACT / INFERENCE / UNKNOWN for your buyer + offer. Preview: the four fields and how to fill them without lying to yourself." },
  { slug: "vip-proposal-kit", tier: "vip", name: "VIP Proposal + Outreach Kit",
    preview: "The corporate outreach + proposal kit built for VIP registrants." },
  { slug: "company-brain", tier: "vault", name: "Company Brain Starter Kit",
    preview: "One index that any AI agent (or new teammate) can read to sound like you." },
  { slug: "prompt-stack", tier: "vault", name: "AI Sales + Follow-up Agent Prompt Stack",
    preview: "Agent cards for sales, follow-up, and support — with an explicit safety block for every one." },
  { slug: "site-blueprint", tier: "vault", name: "Lovable Funnel + Site Blueprint",
    preview: "The route map + content model for a monetizable Lovable site." },
  { slug: "campaign-calendar", tier: "vault", name: "30-Day Campaign Calendar",
    preview: "Day-by-day campaign spine for the 30 days after the Summit." },
  { slug: "proposal-builder", tier: "vault", name: "Corporate Proposal Builder",
    preview: "Fill-in-the-blank proposal for corporate/agency buyers." },
  { slug: "autonomy-map", tier: "vault", name: "Autonomy Map + SOP Templates",
    preview: "The Research / Create / Distribute canvas + matching SOP templates." },
  { slug: "affiliate-directory", tier: "vault", name: "Verified Tool Stack + Affiliate Directory",
    preview: "Every tool we teach, with a disclosure. Placeholder entries render no outbound CTA until a live URL is verified." },
] as const;

export function getResourceMeta(slug: string): ResourceMeta | null {
  return RESOURCE_METAS.find((r) => r.slug === slug) ?? null;
}

export function listResourceMetas(): readonly ResourceMeta[] {
  return RESOURCE_METAS;
}

/**
 * Entitlement model (NO ordering).
 * - GA entitlement grants ONLY ga resources.
 * - VIP entitlement grants ONLY vip resources.
 * - Vault entitlement grants ONLY vault resources.
 * - vip_upgrade is treated as vip for gating purposes.
 * A buyer may hold multiple scopes concurrently.
 */
export function canScopeAccessTier(scope: string, tier: ResourceTier): boolean {
  const s = String(scope || "").toLowerCase();
  if (tier === "ga") return s === "ga";
  if (tier === "vip") return s === "vip" || s === "vip_upgrade";
  if (tier === "vault") return s === "vault";
  return false;
}

export function scopesGrantTier(
  scopes: readonly string[],
  tier: ResourceTier,
): boolean {
  return scopes.some((s) => canScopeAccessTier(s, tier));
}
