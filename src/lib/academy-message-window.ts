export type MessageWindow = {
  allowed: boolean;
  deferUntil: string | null;
  reason: "within_local_window" | "quiet_hours" | "timezone_required";
};

/** Email interventions run from 09:00 inclusive to 19:00 exclusive in the learner's IANA zone. */
export function learningMessageWindow(timezone: string | null | undefined, now = new Date()): MessageWindow {
  const safeNow = Number.isFinite(now.getTime()) ? now.getTime() : Date.now();
  const hold = (): MessageWindow => ({ allowed: false, deferUntil: new Date(safeNow + 86400000).toISOString(), reason: "timezone_required" });
  if (!timezone?.trim() || !Number.isFinite(now.getTime())) return hold();
  try {
    const format = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const local = (date: Date) => {
      const parts = format.formatToParts(date);
      return { hour: Number(parts.find((p) => p.type === "hour")?.value), minute: Number(parts.find((p) => p.type === "minute")?.value) };
    };
    const current = local(now);
    if (current.hour >= 9 && current.hour < 19) return { allowed: true, deferUntil: null, reason: "within_local_window" };
    // Search actual UTC instants, so daylight-saving changes do not reuse yesterday's offset.
    const firstMinute = Math.ceil(now.getTime() / 60000) * 60000;
    for (let minute = 0; minute <= 36 * 60; minute++) {
      const candidate = new Date(firstMinute + minute * 60000);
      const parts = local(candidate);
      if (candidate > now && parts.hour === 9 && parts.minute === 0)
        return { allowed: false, deferUntil: candidate.toISOString(), reason: "quiet_hours" };
    }
    return hold();
  } catch {
    return hold();
  }
}
