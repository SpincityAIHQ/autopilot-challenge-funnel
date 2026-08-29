import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  collapseLeads,
  filterLeads,
  latestConsentEvidenceByEmail,
  leadsToCsv,
  type MarketingConsentRow,
  type ReservationRow,
} from "@/lib/leads";

const rows: ReservationRow[] = [
  {
    first_name: "Sebastian",
    email: "seb@example.com",
    phone: "+1 555 0100",
    tier_reserved: "ga",
    settled: false,
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    first_name: "Sebastian",
    email: "SEB@example.com",
    phone: "+1 555 0100",
    tier_reserved: "ga_vip",
    settled: true,
    created_at: "2026-08-02T10:00:00Z",
  },
  {
    first_name: "Lindsey",
    email: "lindsey@example.com",
    phone: "",
    tier_reserved: "ga_vip_vault",
    settled: false,
    created_at: "2026-08-03T10:00:00Z",
  },
  {
    first_name: null,
    email: null,
    phone: null,
    tier_reserved: "ga",
    settled: false,
    created_at: "2026-08-04T10:00:00Z",
  },
];

function consentRow(
  overrides: Partial<MarketingConsentRow> &
    Pick<MarketingConsentRow, "id" | "channel" | "granted" | "created_at">,
): MarketingConsentRow {
  return {
    subject_email: "seb@example.com",
    granted_at: overrides.granted ? overrides.created_at : null,
    revoked_at: overrides.granted ? null : overrides.created_at,
    source: "public-reservation",
    source_route: "/reserve",
    copy_version: "2026-08-29-v2",
    signer_name: null,
    phone: "+1 555 0100",
    ...overrides,
  };
}

describe("collapseLeads", () => {
  const leads = collapseLeads(rows);

  it("collapses duplicates by lowercased email and drops rows without email", () => {
    expect(leads.length).toBe(2);
    expect(leads.map((l) => l.email).sort()).toEqual(["lindsey@example.com", "seb@example.com"]);
  });

  it("keeps the highest tier, earliest contact, and settled flag", () => {
    const seb = leads.find((l) => l.email === "seb@example.com")!;
    expect(seb.tier_reserved).toBe("ga_vip");
    expect(seb.first_seen).toBe("2026-08-01T10:00:00Z");
    expect(seb.last_seen).toBe("2026-08-02T10:00:00Z");
    expect(seb.settled).toBe(true);
    expect(seb.touches).toBe(2);
  });

  it("never downgrades a tier when an older lower-tier row arrives later", () => {
    const out = collapseLeads([
      { ...rows[1]!, created_at: "2026-08-02T10:00:00Z" },
      { ...rows[0]!, created_at: "2026-08-01T10:00:00Z" },
    ]);
    expect(out[0]!.tier_reserved).toBe("ga_vip");
  });
});

describe("filterLeads", () => {
  const leads = collapseLeads(rows);

  it("filters by tier", () => {
    expect(filterLeads(leads, { tier: "ga_vip_vault" }).length).toBe(1);
    expect(filterLeads(leads, { tier: "ga" }).length).toBe(0);
  });

  it("searches name, email and phone digits", () => {
    expect(filterLeads(leads, { q: "linds" }).length).toBe(1);
    expect(filterLeads(leads, { q: "seb@" }).length).toBe(1);
    expect(filterLeads(leads, { q: "5550100" }).length).toBe(1);
  });

  it("sorts newest activity first by default and oldest contact on request", () => {
    expect(filterLeads(leads, {})[0]!.email).toBe("lindsey@example.com");
    expect(filterLeads(leads, { sort: "oldest" })[0]!.email).toBe("seb@example.com");
  });
});

describe("latestConsentEvidenceByEmail", () => {
  it("uses the latest row per normalized email/channel with id as the timestamp tie-breaker", () => {
    const evidence = latestConsentEvidenceByEmail([
      consentRow({
        id: "00000000-0000-0000-0000-000000000001",
        subject_email: " SEB@EXAMPLE.COM ",
        channel: "email",
        granted: true,
        created_at: "2026-08-29T09:00:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000001",
        channel: "email",
        granted: true,
        created_at: "2026-08-29T10:00:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000002",
        channel: "email",
        granted: false,
        created_at: "2026-08-29T10:00:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000003",
        channel: "ai_call",
        granted: true,
        created_at: "2026-08-29T10:01:00Z",
        signer_name: "Ada Lovelace",
      }),
    ]);

    expect(evidence.size).toBe(1);
    expect(evidence.get("seb@example.com")?.email?.status).toBe("not_granted");
    expect(evidence.get("seb@example.com")?.email?.consent_at).toBe("2026-08-29T10:00:00Z");
    expect(evidence.get("seb@example.com")?.ai_call?.signer_evidence_present).toBe(true);
  });

  it("ignores unsupported channels and rows without a normalized email", () => {
    const evidence = latestConsentEvidenceByEmail([
      consentRow({
        id: "00000000-0000-0000-0000-000000000004",
        subject_email: "",
        channel: "sms",
        granted: true,
        created_at: "2026-08-29T10:00:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000005",
        channel: "fax",
        granted: true,
        created_at: "2026-08-29T10:00:00Z",
      }),
    ]);
    expect(evidence.size).toBe(0);
  });
});

describe("leadsToCsv", () => {
  it("preserves the existing columns first, adds safe consent evidence, and escapes commas", () => {
    const csv = leadsToCsv(collapseLeads([{ ...rows[0]!, first_name: "Doe, Jane" }]));
    const lines = csv.split("\r\n");
    const header = lines[0]!.split(",");
    expect(header.slice(0, 8)).toEqual([
      "first_name",
      "email",
      "phone",
      "tier_reserved",
      "settled",
      "first_seen",
      "last_seen",
      "touches",
    ]);
    expect(header).toContain("email_consent_status");
    expect(header).toContain("sms_consent_phone_match");
    expect(header).toContain("ai_call_signer_evidence_present");
    expect(header).not.toContain("consent_text");
    expect(header).not.toContain("request_hash");
    expect(header).not.toContain("user_agent_hash");
    expect(header).not.toContain("signer_name");
    expect(lines[1]).toContain('"Doe, Jane"');
  });

  it("exports latest consent state without exposing the signer name or raw phone evidence", () => {
    const leads = collapseLeads([rows[0]!]);
    const evidence = latestConsentEvidenceByEmail([
      consentRow({
        id: "00000000-0000-0000-0000-000000000010",
        channel: "email",
        granted: false,
        created_at: "2026-08-29T10:00:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000011",
        channel: "sms",
        granted: true,
        created_at: "2026-08-29T10:01:00Z",
      }),
      consentRow({
        id: "00000000-0000-0000-0000-000000000012",
        channel: "ai_call",
        granted: true,
        created_at: "2026-08-29T10:02:00Z",
        signer_name: "Ada Lovelace",
      }),
    ]);
    const csv = leadsToCsv(leads, evidence);
    const [headerLine, dataLine] = csv.split("\r\n");
    const headers = headerLine!.split(",");
    const values = dataLine!.split(",");
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    expect(record.email_consent_status).toBe("not_granted");
    expect(record.sms_consent_status).toBe("granted");
    expect(record.sms_consent_phone_match).toBe("yes");
    expect(record.ai_call_consent_status).toBe("granted");
    expect(record.ai_call_consent_phone_match).toBe("yes");
    expect(record.ai_call_signer_evidence_present).toBe("yes");
    expect(record.ai_call_consent_source).toBe("public-reservation");
    expect(record.ai_call_consent_copy_version).toBe("2026-08-29-v2");
    expect(csv).not.toContain("Ada Lovelace");
  });

  it("marks absent channel evidence as unknown", () => {
    const csv = leadsToCsv(collapseLeads([rows[0]!]));
    const [headerLine, dataLine] = csv.split("\r\n");
    const headers = headerLine!.split(",");
    const values = dataLine!.split(",");
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]]));

    expect(record.email_consent_status).toBe("unknown");
    expect(record.sms_consent_status).toBe("unknown");
    expect(record.ai_call_consent_status).toBe("unknown");
    expect(record.ai_call_signer_evidence_present).toBe("unknown");
  });
});

describe("owner CSV consent query", () => {
  const route = readFileSync("src/routes/api/public/admin/summit-leads.ts", "utf8");

  it("keeps the owner gate ahead of reservation and consent data access", () => {
    const ownerGate = route.indexOf("if (!(await verifyOwner()))");
    expect(ownerGate).toBeGreaterThan(-1);
    expect(route.indexOf('.from("summit_reservations")')).toBeGreaterThan(ownerGate);
    expect(route.indexOf('.from("marketing_consents")')).toBeGreaterThan(ownerGate);
  });

  it("orders consent rows deterministically and never selects raw sensitive evidence", () => {
    expect(route).toContain('.order("created_at", { ascending: false })');
    expect(route).toContain('.order("id", { ascending: false })');
    const projection = route.match(
      /\.from\("marketing_consents"\)[\s\S]*?\.select\(\s*"([^"]+)"/,
    )?.[1];
    expect(projection).toBeDefined();
    expect(projection).toContain("signer_name");
    expect(projection).not.toContain("consent_text");
    expect(projection).not.toContain("request_hash");
    expect(projection).not.toContain("user_agent_hash");
  });
});
