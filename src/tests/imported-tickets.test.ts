import { describe, expect, it } from "bun:test";
import { confirmationRequired } from "../lib/academy-imported-tickets.server";
import { ticketFor, tierAllows } from "../lib/academy";

describe("historical Summit ticket matching", () => {
  it("rejects implicit email confirmation and unknown Auth settings", () => {
    expect(confirmationRequired({ mailer_autoconfirm: false })).toBe(true);
    expect(confirmationRequired({ mailer_autoconfirm: true })).toBe(false);
    expect(confirmationRequired({ mailer_autoconfirm: "false" })).toBe(false);
    expect(confirmationRequired({})).toBe(false);
    expect(confirmationRequired(null)).toBe(false);
  });

  it("preserves paid tier inheritance and requires an explicit Accelerator purchase", () => {
    expect(tierAllows(["ga"], "vip")).toBe(false);
    expect(tierAllows(["vip"], "ga")).toBe(true);
    expect(tierAllows(["vault"], "vip")).toBe(true);
    expect(tierAllows(["vault"], "accelerator")).toBe(false);
    expect(ticketFor(["ga", "vip", "vault"]).summit).toBe("vault");
    expect(tierAllows(["vip", "accelerator"], "accelerator")).toBe(true);
    expect(ticketFor(["vip", "accelerator"]).accelerator).toBe(true);
    expect(ticketFor(["vip", "accelerator"]).summit).toBe("vip");
    expect(ticketFor(["vip", "vault", "accelerator"]).summit).toBe("vault");
  });
});
