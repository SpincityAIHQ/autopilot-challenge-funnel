import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { academyJoinDestination, academyJoinHref } from "@/lib/academy-navigation";

const source = readFileSync("src/routes/join.tsx", "utf8");

describe("/join auth flow invariants", () => {
  test("sign-in does not impose the signup 12-character minimum", () => {
    // minLength is applied conditionally, only when not signing in.
    expect(source).toContain("{...(login ? {} : { minLength: 12 })}");
    // The new-password (recovery) field keeps its minimum.
    expect(source).toContain("minLength={12}");
  });

  test("resend uses auth.resend with type signup and never repeats signUp", () => {
    expect(source).toContain('supabase.auth.resend({');
    expect(source).toContain('type: "signup"');
    // signUp appears exactly once, inside the explicit signup handler.
    expect(source.match(/supabase\.auth\.signUp\(/g)?.length).toBe(1);
    expect(source.match(/supabase\.auth\.resend\(/g)?.length).toBe(1);
  });

  test("resend is user initiated only — never called from an effect on mount", () => {
    const effects = source.match(/useEffect\([\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
    for (const effect of effects) {
      expect(effect.includes("resendConfirmation(")).toBe(false);
      expect(effect.includes("auth.resend")).toBe(false);
      expect(effect.includes("resetPasswordForEmail")).toBe(false);
      expect(effect.includes("auth.signUp")).toBe(false);
    }
  });

  test("password reset handles the returned error object, not just throws", () => {
    // Reset goes through the shared runner, which inspects result.error and catches.
    expect(source).toContain('"reset",');
    expect(source).toContain("supabase.auth.resetPasswordForEmail(target");
    expect(source).toContain("const returned = result && typeof result === \"object\" ? result.error : null;");
    expect(source).toContain("if (returned) {");
  });

  test("every auth call is mapped through the allowlisted helper", () => {
    expect(source).toContain("describeAuthError");
    expect(source).toContain("describeAuthSuccess");
    // No raw provider text ever reaches the UI.
    expect(source).not.toContain("error.message");
    expect(source).not.toContain("(error as Error).message");
  });

  test("shared synchronous in-flight guard exists and busy is released in finally", () => {
    expect(source).toContain("const inFlight = useRef(false)");
    expect(source).toContain("if (inFlight.current) return");
    const finallyBlocks = source.match(/finally \{[\s\S]*?\}/g) ?? [];
    expect(finallyBlocks.length).toBeGreaterThanOrEqual(3);
    expect(finallyBlocks.filter((b) => b.includes("setBusy(false)")).length).toBeGreaterThanOrEqual(
      3,
    );
  });

  test("stale results under a changed address are discarded", () => {
    expect(source).toContain("requestToken.current += 1");
    expect(source).toContain("if (token !== requestToken.current) return");
  });

  test("submitted email is trimmed before use", () => {
    expect(source).toContain("const submitted = email.trim()");
  });

  test("signup without a session shows check-inbox, not another signup form", () => {
    expect(source).toContain("setAwaitingConfirmation(submitted)");
    expect(source).toContain("Check your inbox");
    expect(source).toContain("Back to sign in");
  });

  test("cooldown persists only a deadline timestamp — never email, password or tokens", () => {
    expect(source).toContain("window.sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(deadline))");
    const stores = source.match(/sessionStorage\.setItem\([^)]*\)/g) ?? [];
    expect(stores.length).toBe(1);
    for (const s of stores) {
      expect(s.includes("email")).toBe(false);
      expect(s.includes("password")).toBe(false);
      expect(s.includes("token_hash")).toBe(false);
    }
    expect(source).not.toContain("localStorage.setItem");
  });

  test("email cooldown does not block sign-in; attempt cooldown does", () => {
    expect(source).toContain("disabled={busy || (login ? attemptCooldownLeft > 0 : emailSendBlocked)}");
    expect(source).toContain("if (attemptCooldownLeft > 0) return;");
  });

  test("handlers are guarded as well as buttons", () => {
    expect(source).toContain(
      "if (!target || emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;",
    );
    expect(source).toContain("if (emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;");
  });

  test("a visible accessible countdown and alert region are rendered", () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role={feedback?.tone === "error" ? "alert" : "status"}');
    expect(source).toContain("cooldownLabel(emailCooldownLeft)");
  });

  test("the one-use token is stripped from the URL before the server call", () => {
    const stripIndex = source.indexOf("window.history.replaceState");
    const fetchIndex = source.indexOf("/api/academy/email-confirm");
    expect(stripIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(stripIndex);
  });

  test("PASSWORD_RECOVERY flow is preserved", () => {
    expect(source).toContain('if (event === "PASSWORD_RECOVERY") setRecovery(true)');
    expect(source).toContain("supabase.auth.updateUser({ password })");
  });

  test("redirects reuse the allowlisted same-origin helpers", () => {
    expect(source).toContain("academyJoinHref(search.next ?? \"\", true)");
    expect(source).toContain("academyJoinDestination(search.next)");
    expect(source).not.toMatch(/window\.location\.assign\((?!academyJoinDestination|academyJoinHref)/);
  });

  test("no auth or user table is queried to reveal account existence", () => {
    expect(source).not.toContain("auth.admin");
    expect(source).not.toContain("identities");
    expect(source).not.toContain('.from("profiles")');
  });
});

describe("redirect safety", () => {
  test("only allowlisted destinations survive", () => {
    expect(academyJoinDestination("/redeem")).toBe("/redeem");
    expect(academyJoinDestination("https://evil.example.com")).toBe("/learn");
    expect(academyJoinDestination("//evil.example.com")).toBe("/learn");
    expect(academyJoinDestination("/admin/leads")).toBe("/learn");
    expect(academyJoinHref("https://evil.example.com", true)).toBe("/join?mode=signin");
    expect(academyJoinHref("/redeem", true)).toBe("/join?mode=signin&next=%2Fredeem");
  });
});
