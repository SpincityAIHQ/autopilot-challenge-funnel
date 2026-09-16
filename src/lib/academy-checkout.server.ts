/**
 * Payments are OFF.
 *
 * Every Summit ticket is open for free during the open week, and the only
 * onward step (Accelerator or a consultation) starts with a text message, not
 * a card. This resolver therefore returns no checkout URL for any tier. The
 * provider configuration is intentionally left untouched elsewhere so paid
 * checkout can be restored later without rebuilding it.
 */
export function academyCheckoutUrl(
  _tier: string,
  _env: Record<string, string | undefined> = process.env,
): string | null {
  return null;
}
