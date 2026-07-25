/**
 * Typed affiliate/resource registry.
 * Every tool taught in the Vault or Summit gets an entry here.
 *
 * RULES:
 *  - Never invent affiliate URLs. If `destination_url` is missing, the
 *    entry is `placeholder` and the UI renders a DISABLED link with the
 *    disclosure text visible.
 *  - Every entry MUST carry a disclosure string; the UI must render it.
 *  - When operators later paste live URLs, set `status: "live"`.
 *  - Separate speaker/partner referrals from tool affiliate links.
 */

export type AffiliateStatus = "placeholder" | "live";

export interface AffiliateEntry {
  id: string;
  name: string;
  category: "ai" | "site" | "email" | "sms" | "voice" | "crm" | "other";
  owner: string; // internal owner label for maintenance
  status: AffiliateStatus;
  destination_url?: string;
  disclosure: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  };
}

export const DEFAULT_DISCLOSURE =
  "This is an affiliate link. NuAmenti may earn a commission at no extra cost to you if you sign up through it.";

export const AFFILIATE_REGISTRY: readonly AffiliateEntry[] = [
  {
    id: "lovable",
    name: "Lovable — build sites and apps with AI",
    category: "site",
    owner: "nuamenti",
    status: "placeholder",
    disclosure: DEFAULT_DISCLOSURE,
    utm: { source: "nuamenti", medium: "summit", campaign: "autopilot-2026" },
  },
  {
    id: "mailchimp",
    name: "Mailchimp — email + audiences",
    category: "email",
    owner: "nuamenti",
    status: "placeholder",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "heygen",
    name: "HeyGen — AI video avatars",
    category: "ai",
    owner: "nuamenti",
    status: "placeholder",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "openai",
    name: "OpenAI — API + ChatGPT team",
    category: "ai",
    owner: "nuamenti",
    status: "placeholder",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "twilio",
    name: "Twilio — SMS + voice",
    category: "sms",
    owner: "nuamenti",
    status: "placeholder",
    disclosure: DEFAULT_DISCLOSURE,
  },
] as const;

export function getAffiliate(id: string): AffiliateEntry | undefined {
  return AFFILIATE_REGISTRY.find((e) => e.id === id);
}

/** Returns a UTM-tagged URL, or null if the entry is not live yet. */
export function resolveAffiliateUrl(entry: AffiliateEntry): string | null {
  if (entry.status !== "live" || !entry.destination_url) return null;
  try {
    const u = new URL(entry.destination_url);
    if (u.protocol !== "https:") return null;
    if (entry.utm?.source) u.searchParams.set("utm_source", entry.utm.source);
    if (entry.utm?.medium) u.searchParams.set("utm_medium", entry.utm.medium);
    if (entry.utm?.campaign) u.searchParams.set("utm_campaign", entry.utm.campaign);
    if (entry.utm?.content) u.searchParams.set("utm_content", entry.utm.content);
    return u.toString();
  } catch {
    return null;
  }
}
