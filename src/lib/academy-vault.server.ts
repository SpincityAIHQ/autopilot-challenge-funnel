import { AcademyError } from "./academy.server";
import { vaultAllows } from "./academy";
import { vaultCatalogue } from "./vault";
import { getResource } from "./resource-content.server";
/** Vault listing for the signed-in student; content stays server-side until the key check passes. */
export function vaultListing(grants: string[]) {
  const unlocked = vaultAllows(grants);
  return { unlocked, items: vaultCatalogue().map((i) => ({ ...i, unlocked })) };
}
export function vaultItem(grants: string[], slug: string) {
  if (!vaultAllows(grants))
    throw new AcademyError(
      "The Vault opens with the Emerald Vault Key or Accelerator access. Redeem your code to enter.",
      403,
    );
  const item = getResource(slug);
  if (!item) throw new AcademyError("This Vault item was not found.", 404);
  return { slug: item.slug, name: item.name, tier: item.tier, sections: item.sections };
}
