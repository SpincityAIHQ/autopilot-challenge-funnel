import { describe, expect, it } from "bun:test";
import { composePurchaseConfirmedMessage } from "../lib/academy-messages";
import { nativeEmailParagraphs } from "../lib/academy-native-email.server";
import { nativeEmailTemplate } from "../lib/academy-email-transport";
import { TEMPLATES } from "../lib/email-templates/registry";

describe("purchase confirmation as native email", () => {
  it("maps to a registered, authored template", () => {
    const name = nativeEmailTemplate("purchase_confirmed");
    expect(name).toBe("academy-purchase-confirmed");
    const entry = TEMPLATES[name!];
    expect(entry).toBeDefined();
    expect(typeof entry.subject === "function" ? entry.subject({}) : entry.subject).toBe(
      "Your ticket is ready",
    );
    expect(entry.previewData?.actionUrl).toBe("https://aiautopilotsummit.com/join?next=%2Fredeem");
  });
  it("keeps the activation instruction and drops the action line and footer", () => {
    const text = composePurchaseConfirmedMessage("ga", false, "buyer@example.com").message_text;
    const paragraphs = nativeEmailParagraphs(text);
    const joined = paragraphs.join(" ");
    expect(joined).toContain("Activate my purchased lessons");
    expect(joined).toContain("simply signing in or watching the free training does not");
    expect(joined).not.toContain("https://");
    expect(joined).not.toMatch(/this email confirms your ai autopilot/i);
  });
});
