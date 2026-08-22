import { describe, expect, it } from "vitest";
import {
  collapseLeads,
  filterLeads,
  leadsToCsv,
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

describe("collapseLeads", () => {
  const leads = collapseLeads(rows);

  it("collapses duplicates by lowercased email and drops rows without email", () => {
    expect(leads).toHaveLength(2);
    expect(leads.map((l) => l.email).sort()).toEqual([
      "lindsey@example.com",
      "seb@example.com",
    ]);
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
    expect(filterLeads(leads, { tier: "ga_vip_vault" })).toHaveLength(1);
    expect(filterLeads(leads, { tier: "ga" })).toHaveLength(0);
  });

  it("searches name, email and phone digits", () => {
    expect(filterLeads(leads, { q: "linds" })).toHaveLength(1);
    expect(filterLeads(leads, { q: "seb@" })).toHaveLength(1);
    expect(filterLeads(leads, { q: "5550100" })).toHaveLength(1);
  });

  it("sorts newest activity first by default and oldest contact on request", () => {
    expect(filterLeads(leads, {})[0]!.email).toBe("lindsey@example.com");
    expect(filterLeads(leads, { sort: "oldest" })[0]!.email).toBe(
      "seb@example.com",
    );
  });
});

describe("leadsToCsv", () => {
  it("emits a header row and escapes commas", () => {
    const csv = leadsToCsv(
      collapseLeads([{ ...rows[0]!, first_name: "Doe, Jane" }]),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "first_name,email,phone,tier_reserved,settled,first_seen,last_seen,touches",
    );
    expect(lines[1]).toContain('"Doe, Jane"');
  });
});
