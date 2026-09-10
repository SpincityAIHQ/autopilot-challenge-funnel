/** Only an explicit ISO timestamp with a timezone can define a programme cutoff. */
export function explicitProgrammeEnd(value: string | undefined): string | null {
  if (!value) return null;
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d{1,3})?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value.trim());
  if (!parts || /[+-]14:(?!00)/.test(parts[4])) return null;
  // Date.parse otherwise accepts impossible calendar days by normalizing them.
  const local = `${parts[1]}T${parts[2]}${parts[3] ?? ""}Z`;
  const localTime = Date.parse(local);
  const time = Date.parse(value.trim());
  if (!Number.isFinite(localTime) || !Number.isFinite(time) ||
      new Date(localTime).toISOString().slice(0, 19) !== `${parts[1]}T${parts[2]}`) return null;
  return new Date(time).toISOString();
}

export function accessTermsFor(tier: string, env: Record<string, string | undefined> = process.env) {
  try {
    const t = JSON.parse(env.ACADEMY_ACCESS_TERMS_JSON || "{}")[tier];
    if (t?.starts !== "redemption" || !Number.isInteger(t.hours) || t.hours < 1 ||
        t.hours > 87600 || typeof t.version !== "string" || !t.version.trim()) return null;
    const programmeEndsAt = tier === "accelerator" ? explicitProgrammeEnd(env.ACADEMY_ACCELERATOR_ENDS_AT) : null;
    if (tier === "accelerator" && !programmeEndsAt) return null;
    return { hours: t.hours as number, version: t.version.slice(0, 100) as string, programmeEndsAt };
  } catch { return null; }
}
