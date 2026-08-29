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

export type ConsentChannel = "email" | "sms" | "ai_call";
export type ConsentStatus = "granted" | "not_granted" | "unknown";

export interface MarketingConsentRow {
  id: string;
  subject_email: string;
  channel: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  source: string | null;
  source_route: string | null;
  copy_version: string | null;
  created_at: string;
  signer_name: string | null;
  phone: string | null;
}

export interface ConsentEvidence {
  status: Exclude<ConsentStatus, "unknown">;
  consent_at: string;
  recorded_at: string;
  source: string;
  source_route: string;
  copy_version: string;
  signer_evidence_present: boolean;
  phone: string;
}

export type ConsentEvidenceByChannel = Partial<Record<ConsentChannel, ConsentEvidence>>;

export type ConsentEvidenceByEmail = Map<string, ConsentEvidenceByChannel>;

const CONSENT_CHANNELS = new Set<ConsentChannel>(["email", "sms", "ai_call"]);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isConsentChannel(value: string): value is ConsentChannel {
  return CONSENT_CHANNELS.has(value as ConsentChannel);
}

function rowIsLater(candidate: MarketingConsentRow, current: MarketingConsentRow): boolean {
  const createdOrder = candidate.created_at.localeCompare(current.created_at);
  if (createdOrder !== 0) return createdOrder > 0;
  return candidate.id.localeCompare(current.id) > 0;
}

/** Latest explicit row for each normalized email/channel, ordered by created_at then id. */
export function latestConsentEvidenceByEmail(rows: MarketingConsentRow[]): ConsentEvidenceByEmail {
  const latestRows = new Map<string, Partial<Record<ConsentChannel, MarketingConsentRow>>>();

  for (const row of rows) {
    const email = normalizeEmail(row.subject_email);
    if (!email || !isConsentChannel(row.channel)) continue;
    const byChannel = latestRows.get(email) ?? {};
    const current = byChannel[row.channel];
    if (!current || rowIsLater(row, current)) {
      byChannel[row.channel] = row;
      latestRows.set(email, byChannel);
    }
  }

  const evidenceByEmail: ConsentEvidenceByEmail = new Map();
  for (const [email, byChannel] of latestRows) {
    const evidence: ConsentEvidenceByChannel = {};
    for (const channel of CONSENT_CHANNELS) {
      const row = byChannel[channel];
      if (!row) continue;
      evidence[channel] = {
        status: row.granted ? "granted" : "not_granted",
        consent_at: (row.granted ? row.granted_at : row.revoked_at) ?? row.created_at,
        recorded_at: row.created_at,
        source: row.source ?? "",
        source_route: row.source_route ?? "",
        copy_version: row.copy_version ?? "",
        signer_evidence_present: channel === "ai_call" && Boolean(row.signer_name?.trim()),
        phone: row.phone?.trim() ?? "",
      };
    }
    evidenceByEmail.set(email, evidence);
  }
  return evidenceByEmail;
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
    asc ? a.first_seen.localeCompare(b.first_seen) : b.last_seen.localeCompare(a.last_seen),
  );
}

const BASE_CSV_COLUMNS = [
  "first_name",
  "email",
  "phone",
  "tier_reserved",
  "settled",
  "first_seen",
  "last_seen",
  "touches",
] as const;

const CONSENT_CSV_COLUMNS = [
  "email_consent_status",
  "email_consent_at",
  "email_consent_recorded_at",
  "email_consent_source",
  "email_consent_source_route",
  "email_consent_copy_version",
  "sms_consent_status",
  "sms_consent_at",
  "sms_consent_recorded_at",
  "sms_consent_source",
  "sms_consent_source_route",
  "sms_consent_copy_version",
  "sms_consent_phone_match",
  "ai_call_consent_status",
  "ai_call_consent_at",
  "ai_call_consent_recorded_at",
  "ai_call_consent_source",
  "ai_call_consent_source_route",
  "ai_call_consent_copy_version",
  "ai_call_consent_phone_match",
  "ai_call_signer_evidence_present",
] as const;

function comparablePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function phoneMatch(
  leadPhone: string,
  evidence: ConsentEvidence | undefined,
): "yes" | "no" | "unknown" {
  if (!evidence) return "unknown";
  const lead = comparablePhone(leadPhone);
  const consent = comparablePhone(evidence.phone);
  if (!lead || !consent) return "unknown";
  return lead === consent ? "yes" : "no";
}

function consentCells(
  channel: ConsentChannel,
  evidence: ConsentEvidence | undefined,
  leadPhone: string,
): string[] {
  const cells = [
    evidence?.status ?? "unknown",
    evidence?.consent_at ?? "",
    evidence?.recorded_at ?? "",
    evidence?.source ?? "",
    evidence?.source_route ?? "",
    evidence?.copy_version ?? "",
  ];
  if (channel === "sms") {
    cells.push(phoneMatch(leadPhone, evidence));
  }
  if (channel === "ai_call") {
    cells.push(phoneMatch(leadPhone, evidence));
    cells.push(evidence ? (evidence.signer_evidence_present ? "yes" : "no") : "unknown");
  }
  return cells;
}

export function leadsToCsv(
  leads: Lead[],
  consentByEmail: ConsentEvidenceByEmail = new Map(),
): string {
  const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [[...BASE_CSV_COLUMNS, ...CONSENT_CSV_COLUMNS].join(",")];
  for (const l of leads) {
    const consent = consentByEmail.get(normalizeEmail(l.email)) ?? {};
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
        ...consentCells("email", consent.email, l.phone).map(escape),
        ...consentCells("sms", consent.sms, l.phone).map(escape),
        ...consentCells("ai_call", consent.ai_call, l.phone).map(escape),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}
