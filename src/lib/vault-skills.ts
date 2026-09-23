/**
 * Client-safe merging of published Vault skill packages into the Vault cards.
 * Contains no package data — rows come from the academy API at runtime.
 */
import type { VaultCategory, VaultItem } from "./vault";

export type VaultSkill = {
  slug: string;
  name: string;
  preview: string;
  isBundle: boolean;
  linkedResourceSlug: string | null;
  version?: string;
  fileName?: string;
  byteSize?: number;
  unlocked?: boolean;
};
export type VaultCard = {
  slug: string;
  name: string;
  preview: string;
  category: VaultCategory;
  unlocked: boolean;
  skill?: VaultSkill;
};

/** With zero skills this returns the existing cards unchanged. */
export function mergeVaultSkills(
  items: (VaultItem & { unlocked: boolean })[],
  skills: VaultSkill[],
): { cards: VaultCard[]; bundle: VaultSkill | null; standaloneCount: number } {
  const bundle = skills.find((s) => s.isBundle && s.unlocked) ?? null;
  const linked = new Map<string, VaultSkill>();
  const standalone: VaultSkill[] = [];
  for (const s of skills) {
    if (s.isBundle) continue;
    if (s.linkedResourceSlug) {
      if (!linked.has(s.linkedResourceSlug)) linked.set(s.linkedResourceSlug, s);
    } else standalone.push(s);
  }
  const cards: VaultCard[] = items.map((i) => {
    const skill = linked.get(i.slug);
    if (!skill)
      return {
        slug: i.slug,
        name: i.name,
        preview: i.preview,
        category: i.category,
        unlocked: i.unlocked,
      };
    return {
      slug: i.slug,
      name: i.name,
      preview: skill.preview,
      category: i.category,
      unlocked: i.unlocked || Boolean(skill.unlocked),
      skill,
    };
  });
  for (const s of standalone)
    cards.push({
      slug: s.slug,
      name: s.name,
      preview: s.preview,
      category: "skills",
      unlocked: Boolean(s.unlocked),
      skill: s,
    });
  return { cards, bundle, standaloneCount: standalone.length };
}

/** Decode base64 zip bytes and check the declared size. */
export function decodeZip(base64: string, expectedBytes?: number): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (expectedBytes !== undefined && bytes.length !== expectedBytes)
    throw new Error("The download was incomplete. Please try again.");
  return bytes;
}
