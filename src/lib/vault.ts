/**
 * The Vault: the good stuff behind the Emerald Vault Key and the Accelerator.
 * Public catalogue only (names, previews, categories). Full content is served
 * by the academy API after the ticket check and never enters the client bundle.
 */
import { RESOURCE_METAS, type ResourceMeta } from "./resource-metadata";
export type VaultCategory = "skills" | "prompts" | "plugins" | "playbooks" | "scorecards";
export const VAULT_CATEGORIES: {
  id: VaultCategory;
  title: string;
  glyph: string;
  blurb: string;
}[] = [
  {
    id: "skills",
    title: "Skills",
    glyph: "◈",
    blurb: "Reusable AI skills and builders you drop straight into your operating system.",
  },
  {
    id: "prompts",
    title: "Prompts",
    glyph: "✦",
    blurb: "The live prompts from the room, ready to run.",
  },
  {
    id: "plugins",
    title: "Plug-ins",
    glyph: "⬢",
    blurb: "The verified tool stack and how each piece connects.",
  },
  {
    id: "playbooks",
    title: "Playbooks",
    glyph: "▣",
    blurb: "Fill-in-the-blank kits, calendars and SOP templates.",
  },
  {
    id: "scorecards",
    title: "Scorecards",
    glyph: "◎",
    blurb: "Diagnose before you automate.",
  },
];
export const VAULT_ITEM_CATEGORY: Record<string, VaultCategory> = {
  "prompt-stack": "skills",
  "site-blueprint": "skills",
  "company-brain": "skills",
  "action-guide": "prompts",
  "affiliate-directory": "plugins",
  "vip-proposal-kit": "playbooks",
  "proposal-builder": "playbooks",
  "campaign-calendar": "playbooks",
  "autonomy-map": "playbooks",
  "buyer-offer-canvas": "playbooks",
  "ai-readiness-scorecard": "scorecards",
};
export type VaultItem = ResourceMeta & { category: VaultCategory };
export function vaultCatalogue(): VaultItem[] {
  return RESOURCE_METAS.map((m) => ({
    ...m,
    category: VAULT_ITEM_CATEGORY[m.slug] ?? "playbooks",
  }));
}
