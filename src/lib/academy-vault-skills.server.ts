/**
 * Vault skill packages (.zip) — dark launch. All package data (names, previews,
 * overviews, zip bytes) lives only in the database; nothing is shipped in code.
 * Only published rows exist as far as members are concerned. Server-only.
 */
import { AcademyError } from "./academy.server";
import { vaultAllows } from "./academy";

export const SKILL_SLUG_RE = /^[a-z0-9-]{1,64}$/;
export const DOWNLOAD_CAP_PER_DAY = 40;
export const DOWNLOAD_CAP_MESSAGE = "You've hit today's download limit. Try again tomorrow.";
/** Existing Vault cards that a VIP-access package may unlock. */
export const LINKABLE_RESOURCE_SLUGS = ["site-blueprint", "company-brain", "prompt-stack"] as const;

export type SkillAccess = "vip" | "vault";
export type SkillMetaRow = {
  slug: string;
  name: string;
  preview: string;
  access: string;
  is_bundle: boolean;
  linked_resource_slug: string | null;
  version: string;
  file_name: string;
  byte_size: number;
  sort_order: number;
};
export type SkillOverviewRow = SkillMetaRow & { overview: unknown };
export type SkillZipRow = SkillMetaRow & { zip_base64: string; sha256: string };

export interface SkillStore {
  listPublished(): Promise<SkillMetaRow[]>;
  getOverview(slug: string): Promise<SkillOverviewRow | null>;
  getZip(slug: string): Promise<SkillZipRow | null>;
  countDownloadsSince(userId: string, sinceIso: string): Promise<number>;
  recordDownload(row: { slug: string; version: string; user_id: string }): Promise<void>;
}

const META_COLUMNS =
  "slug,name,preview,access,is_bundle,linked_resource_slug,version,file_name,byte_size,sort_order";

/** Production store: service-role client, published rows only. */
export function supabaseSkillStore(): SkillStore {
  const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const fail = (): never => {
    throw new AcademyError("The Vault is temporarily unavailable. Please try again.", 503);
  };
  return {
    async listPublished() {
      const { data, error } = await (await admin())
        .from("vault_skill_packages")
        .select(META_COLUMNS)
        .eq("published", true);
      if (error) fail();
      return (data ?? []) as SkillMetaRow[];
    },
    async getOverview(slug) {
      const { data, error } = await (await admin())
        .from("vault_skill_packages")
        .select(`${META_COLUMNS},overview`)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) fail();
      return (data as SkillOverviewRow | null) ?? null;
    },
    async getZip(slug) {
      const { data, error } = await (await admin())
        .from("vault_skill_packages")
        .select(`${META_COLUMNS},zip_base64,sha256`)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) fail();
      return (data as SkillZipRow | null) ?? null;
    },
    async countDownloadsSince(userId, sinceIso) {
      const { count, error } = await (await admin())
        .from("vault_skill_downloads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", sinceIso);
      if (error) fail();
      return count ?? 0;
    },
    async recordDownload(row) {
      const { error } = await (await admin()).from("vault_skill_downloads").insert(row);
      if (error) fail();
    },
  };
}

export function skillAllows(grants: string[], access: string) {
  if (access === "vip") return grants.includes("vip") || vaultAllows(grants);
  if (access === "vault") return vaultAllows(grants);
  return false; // unknown access values fail closed
}

function sortRows<T extends SkillMetaRow>(rows: T[]) {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** Signed-in listing. Never includes overview or zip data. */
export async function skillListing(store: SkillStore, grants: string[]) {
  return sortRows(await store.listPublished()).map((r) => ({
    slug: r.slug,
    name: r.name,
    preview: r.preview,
    isBundle: r.is_bundle,
    linkedResourceSlug: r.linked_resource_slug,
    version: r.version,
    fileName: r.file_name,
    byteSize: r.byte_size,
    unlocked: skillAllows(grants, r.access),
  }));
}

/** Public, signed-out catalogue: sealed card info only. */
export async function skillCatalogue(store: SkillStore) {
  return {
    skills: sortRows(await store.listPublished()).map((r) => ({
      slug: r.slug,
      name: r.name,
      preview: r.preview,
      isBundle: r.is_bundle,
      linkedResourceSlug: r.linked_resource_slug,
    })),
  };
}

function parseSlug(slug: string) {
  if (!SKILL_SLUG_RE.test(slug)) throw new AcademyError("This skill was not found.", 404);
  return slug;
}
function locked(): never {
  throw new AcademyError(
    "This skill opens with the right Vault key. Redeem your code to unlock it.",
    403,
  );
}

function sections(overview: unknown) {
  if (!Array.isArray(overview)) return [];
  return overview
    .filter((s): s is { heading: unknown; bullets: unknown } => !!s && typeof s === "object")
    .map((s) => ({
      heading: String(s.heading ?? ""),
      bullets: Array.isArray(s.bullets) ? s.bullets.map(String) : [],
    }));
}

export async function skillOverview(store: SkillStore, grants: string[], rawSlug: string) {
  const row = await store.getOverview(parseSlug(rawSlug));
  if (!row) throw new AcademyError("This skill was not found.", 404);
  if (!skillAllows(grants, row.access)) locked();
  return { slug: row.slug, name: row.name, version: row.version, overview: sections(row.overview) };
}

export async function skillDownload(
  store: SkillStore,
  grants: string[],
  userId: string,
  rawSlug: string,
  now = Date.now(),
) {
  const row = await store.getZip(parseSlug(rawSlug));
  if (!row) throw new AcademyError("This skill was not found.", 404);
  if (!skillAllows(grants, row.access)) locked();
  const since = new Date(now - 24 * 3600 * 1000).toISOString();
  if ((await store.countDownloadsSince(userId, since)) >= DOWNLOAD_CAP_PER_DAY)
    throw new AcademyError(DOWNLOAD_CAP_MESSAGE, 429);
  await store.recordDownload({ slug: row.slug, version: row.version, user_id: userId });
  return {
    fileName: row.file_name,
    contentType: "application/zip" as const,
    base64: row.zip_base64,
    sha256: row.sha256,
    version: row.version,
  };
}

/** True when a published package linked to this existing card unlocks it for these grants. */
export async function linkedCardUnlocked(store: SkillStore, grants: string[], resourceSlug: string) {
  if (!(LINKABLE_RESOURCE_SLUGS as readonly string[]).includes(resourceSlug)) return false;
  const rows = await store.listPublished();
  return rows.some((r) => r.linked_resource_slug === resourceSlug && skillAllows(grants, r.access));
}
