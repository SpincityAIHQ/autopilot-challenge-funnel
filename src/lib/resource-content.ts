/**
 * Backwards-compatible re-exports of PUBLIC resource metadata only.
 * Full sections live in resource-content.server.ts and are NEVER imported
 * from public route components. Do not add a `sections` export here.
 */
export {
  RESOURCE_METAS as RESOURCE_INDEX,
  getResourceMeta as getResource,
  listResourceMetas,
} from "./resource-metadata";
export type { ResourceTier, ResourceMeta as ResourceContent } from "./resource-metadata";
