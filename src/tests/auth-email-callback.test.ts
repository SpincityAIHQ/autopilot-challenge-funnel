import { describe, expect, test } from "bun:test";
import { buildJoinVerificationUrl } from "../lib/email-templates/auth-callback";

const hash = "a".repeat(56);
const verifyUrl = (redirect: string) =>
  `https://poagabwvsxzagnvjzwuf.supabase.co/auth/v1/verify?token=${hash}&type=signup&redirect_to=${encodeURIComponent(redirect)}`;

describe("auth email verification link", () => {
  test("routes the one-use token to our same-origin join callback fragment", () => {
    const url = buildJoinVerificationUrl({ url: verifyUrl("https://aiautopilotsummit.com/join") });
    expect(url).toBe(`https://aiautopilotsummit.com/join?mode=signin#token_hash=${hash}&type=email`);
    expect(url).not.toContain("supabase.co");
    expect(url).not.toContain(`?token_hash=`);
  });
  test("keeps only validated local next destinations", () => {
    expect(buildJoinVerificationUrl({ url: verifyUrl("https://aiautopilotsummit.com/join?next=%2Fredeem") })).toContain("next=%2Fredeem");
    expect(buildJoinVerificationUrl({ url: verifyUrl("https://aiautopilotsummit.com/join?next=%2Flearn") })).toContain("next=%2Flearn");
    expect(buildJoinVerificationUrl({ url: verifyUrl("https://aiautopilotsummit.com/join?next=https%3A%2F%2Fevil.test%2Fx") })).not.toContain("next=");
    expect(buildJoinVerificationUrl({ url: verifyUrl("https://evil.test/join?next=%2Fadmin%2Fleads") })).not.toContain("next=");
  });
  test("fails closed when no usable token hash is present", () => {
    expect(() => buildJoinVerificationUrl({ url: "https://aiautopilotsummit.com/join" })).toThrow();
    expect(() => buildJoinVerificationUrl({ url: verifyUrl("https://aiautopilotsummit.com/join").replace(hash, "short") })).toThrow();
    expect(() => buildJoinVerificationUrl({ url: null })).toThrow();
  });
  test("accepts an explicit token_hash field when the hook supplies one", () => {
    expect(buildJoinVerificationUrl({ token_hash: hash, redirect_to: "/join?next=/redeem" } as { url?: string | null })).toBe(
      `https://aiautopilotsummit.com/join?mode=signin&next=%2Fredeem#token_hash=${hash}&type=email`,
    );
  });
});
