/**
 * Pure helpers for the owner-only reservation lead list.
 * No server-only imports — safe for tests and for the admin page.
 */

export type TierReserved = "ga" | "ga_vip" | "ga_vip_vault";

export const TIER_RANK: Record<TierReserved, number> = {
  ga: 1,
  ga_vip: 2,
  ga_vip_vault: 3,
};

export const TIER_LABEL: Record<TierReserved, string> = {
  ga: "General Admission",
  ga_vip: "GA + VIP",
  ga_vip_vault: "GA + VIP + Vault",
};

export interface ReservationRow {
  first_name: string | null;
  email: string | null;
  phone: string | null;
  tier_reserved: string;
  settled: boolean;
  created_at: string;
}

export interface Lead {
  first_name: string;
  email: string;
  phone: string;
  tier_reserved: TierReserved;
  settled: boolean;
  first_seen: string;
  last_seen: string;
  touches: number;
}

export function normalizeTier(v: string): TierReserved {
  return v === "ga_vip" || v === "ga_vip_vault" ? v : "ga";
}

/** One row per email: highest tier reached, earliest first contact. */
export function collapseLeads(rows: ReservationRow[]): Lead[] {
  const byEmail = new Map<string, Lead>();
  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email) continue;
    const tier = normalizeTier(r.tier_reserved);
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        first_name: (r.first_name ?? "").trim(),
        email,
        phone: (r.phone ?? "").trim(),
        tier_reserved: tier,
        settled: r.settled,
        first_seen: r.created_at,
        last_seen: r.created_at,
        touches: 1,
      });
      continue;
    }
    existing.touches += 1;
    if (TIER_RANK[tier] > TIER_RANK[existing.tier_reserved]) {
      existing.tier_reserved = tier;
    }
    if (r.settled) existing.settled = true;
    if (r.created_at < existing.first_seen) existing.first_seen = r.created_at;
    if (r.created_at > existing.last_seen) {
      existing.last_seen = r.created_at;
      if (r.first_name?.trim()) existing.first_name = r.first_name.trim();
      if (r.phone?.trim()) existing.phone = r.phone.trim();
    }
  }
  return [...byEmail.values()];
}

export function filterLeads(
  leads: Lead[],
  opts: { q?: string; tier?: string; sort?: string },
): Lead[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const tier = opts.tier ?? "";
  let out = leads;
  if (tier === "ga" || tier === "ga_vip" || tier === "ga_vip_vault") {
    out = out.filter((l) => l.tier_reserved === tier);
  }
  if (q) {
    const digits = q.replace(/\D/g, "");
    out = out.filter((l) => {
      if (l.first_name.toLowerCase().includes(q)) return true;
      if (l.email.includes(q)) return true;
      if (l.phone.toLowerCase().includes(q)) return true;
      if (digits && l.phone.replace(/\D/g, "").includes(digits)) return true;
      return false;
    });
  }
  const asc = opts.sort === "oldest";
  return [...out].sort((a, b) =>
    asc
      ? a.first_seen.localeCompare(b.first_seen)
      : b.last_seen.localeCompare(a.last_seen),
  );
}

export function leadsToCsv(leads: Lead[]): string {
  const escape = (v: string) =>
    /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [
    [
      "first_name",
      "email",
      "phone",
      "tier_reserved",
      "settled",
      "first_seen",
      "last_seen",
      "touches",
    ].join(","),
  ];
  for (const l of leads) {
    lines.push(
      [
        escape(l.first_name),
        escape(l.email),
        escape(l.phone),
        escape(l.tier_reserved),
        escape(l.settled ? "yes" : "no"),
        escape(l.first_seen),
        escape(l.last_seen),
        escape(String(l.touches)),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}
