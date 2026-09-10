import { describe, expect, test } from "bun:test";
import type { User } from "@supabase/supabase-js";
import { emailOwnershipProven } from "../lib/academy-email-ownership.server";
import { composeAccessCodeMessage } from "../lib/academy-messages";
const user = { id: "fixture-owner", email: "learner@example.test", email_confirmed_at: "2026-09-01T12:00:00Z", is_anonymous: false, app_metadata: {} } as User;
const proof = { version: 1, email: user.email, emailConfirmedAt: user.email_confirmed_at, verifiedAt: "2026-09-01T12:00:01Z" };
describe("email-matched ticket ownership", () => {
  test("historic auto-confirm and user-editable metadata do not prove inbox ownership", () => {
    expect(emailOwnershipProven(user)).toBe(false);
    expect(emailOwnershipProven({ ...user, user_metadata: { academy_email_ownership: proof } })).toBe(false);
  });
  test("trusted proof follows the current confirmed email, never an anonymous identity", () => {
    const verified = { ...user, app_metadata: { academy_email_ownership: proof } };
    expect(emailOwnershipProven(verified)).toBe(true);
    expect(emailOwnershipProven({ ...verified, email: "another@example.test" })).toBe(false);
    expect(emailOwnershipProven({ ...verified, email_confirmed_at: "2026-09-02T00:00:00Z" })).toBe(false);
    expect(emailOwnershipProven({ ...verified, is_anonymous: true })).toBe(false);
  });
  test("new delivery explains explicit activation without exposing the internal purchase code", () => {
    const message = composeAccessCodeMessage("ga", "SPIN-PRIVATE-FIXTURE", "2026-10-01T00:00:00Z", true);
    expect(message.action_url).toBe("https://aiautopilotsummit.com/redeem");
    expect(message.message_text).toContain("without a purchase code");
    expect(message.message_text).toContain("simply signing in or watching the free training does not");
    expect(message.message_text).not.toContain("SPIN-PRIVATE-FIXTURE");
    expect(message.sms_text).not.toContain("SPIN-PRIVATE-FIXTURE");
  });
  test("legacy email still delivers its original purchase code", () => {
    expect(composeAccessCodeMessage("ga", "SPIN-LEGACY-FIXTURE", "2026-10-01T00:00:00Z").message_text).toContain("SPIN-LEGACY-FIXTURE");
  });
});
