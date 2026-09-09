import { describe, expect, test } from "bun:test";
import { academyMessagePolicy } from "../lib/academy-message-policy";
import { composeWelcomeMessage, composeAccessCodeMessage, composeAccessActivatedMessage } from "../lib/academy-messages";

describe("account and purchase confirmations", () => {
  test("an account confirmation needs neither marketing consent nor daytime email scheduling", () => {
    const policy = academyMessagePolicy("webinar_registered");
    expect(policy.transactional).toBe(true);
    expect(policy.marketingRequired).toBe(false);
    expect(policy.daytimeRequired).toBe(false);
    expect(policy.sms).toBe(false);
    expect(composeWelcomeMessage(false, "Thoth", true).message_text).toContain("This email confirms");
  });
  test("SMS is an independent event with daytime rules", () => {
    expect(academyMessagePolicy("webinar_registered_sms").sms).toBe(true);
    expect(academyMessagePolicy("webinar_registered_sms").daytimeRequired).toBe(true);
    expect(academyMessagePolicy("access_activated_sms").transactional).toBe(true);
    expect(academyMessagePolicy("purchase_access_sms").sms).toBe(true);
  });
  test("return and preference changes are CRM updates without a notification", () => {
    for (const name of ["customer_returned", "customer_preferences_updated", "purchase_updated"]) {
      expect(academyMessagePolicy(name).crmOnly).toBe(true);
      expect(academyMessagePolicy(name).marketingRequired).toBe(false);
      expect(academyMessagePolicy(name).sms).toBe(false);
    }
  });
  test("learning and invented events cannot claim the transactional exception", () => {
    for (const name of ["learning_dropoff", "webinar_not_started", "made_up_transactional_event"]) {
      expect(academyMessagePolicy(name).transactional).toBe(false);
      expect(academyMessagePolicy(name).marketingRequired).toBe(true);
    }
  });
  test("purchase and activation give the correct next step without promotional upsells", () => {
    const purchase = composeAccessCodeMessage("vip", "SPIN-MOCK-CODE", "2026-10-01T00:00:00Z");
    expect(purchase.message_text).toContain("SPIN-MOCK-CODE");
    expect(purchase.action_url).toBe("https://aiautopilotsummit.com/redeem");
    expect(purchase.message_text).toContain("purchase email");
    const activated = composeAccessActivatedMessage("vip", "2026-10-02T00:00:00Z");
    expect(activated.action_url).toBe("https://aiautopilotsummit.com/learn");
    expect(activated.message_text).toContain("VIP lessons are unlocked");
    expect(activated.message_text).not.toContain("upgrade");
  });
});
