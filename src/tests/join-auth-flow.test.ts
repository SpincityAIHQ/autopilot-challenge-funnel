import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { academyJoinDestination, academyJoinHref } from "@/lib/academy-navigation";

const source = readFileSync("src/routes/join.tsx", "utf8");
const controllerSource = readFileSync("src/lib/academy-join-controller.ts", "utf8");
const css = readFileSync("src/academy.css", "utf8");

describe("/join auth flow invariants", () => {
  test("sign-in does not impose the signup 12-character minimum", () => {
    // minLength is applied conditionally, only when not signing in.
    expect(source).toContain("{...(login ? {} : { minLength: 12 })}");
    // The new-password (recovery) field keeps its minimum.
    expect(source).toContain("minLength={12}");
  });

  test("auth calls are routed once each through the shared controller client", () => {
    expect(source).toContain("createJoinController");
    expect(source.match(/supabase\.auth\.signUp\(/g)?.length).toBe(1);
    expect(source.match(/supabase\.auth\.resend\(/g)?.length).toBe(1);
    expect(source).toContain("controller.resend(target)");
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

  test("password reset goes through the controller, which handles returned errors", () => {
    expect(source).toContain("controller.reset(target)");
    expect(controllerSource).toContain("if (result?.error");
    expect(controllerSource).toContain("} catch (error) {");
  });

  test("a session — and only a session — unblocks onboarding", () => {
    expect(controllerSource).toContain("if (result?.data?.session)");
    expect(source).toContain("verificationBlocked.current = false;");
  });

  test("confirmation help is durable and not cleared when the email changes", () => {
    expect(source).toContain("confirmationHelp || feedback?.offer === \"resend-confirmation\"");
    const onChange = source.slice(source.indexOf("requestToken.current += 1;"));
    expect(onChange.slice(0, 400).includes("setConfirmationHelp(false)")).toBe(false);
  });

  test("every auth call is mapped through the allowlisted helper", () => {
    expect(source).toContain("describeAuthError");
    expect(controllerSource).toContain("describeAuthSuccess");
    expect(controllerSource).not.toContain("error.message");
    // No raw provider text ever reaches the UI.
    expect(source).not.toContain("error.message");
    expect(source).not.toContain("(error as Error).message");
  });

  test("shared synchronous in-flight guard exists and busy is released in finally", () => {
    expect(controllerSource).toContain("let inFlight = false");
    expect(controllerSource).toContain("if (inFlight) return");
    expect(controllerSource).toContain("inFlight = false;");
    expect(controllerSource).toContain("host.setBusy(false);");
    expect(source).toContain("const inFlight = useRef(false)");
  });

  test("stale results under a changed address are discarded", () => {
    expect(source).toContain("requestToken.current += 1");
    expect(controllerSource).toContain("const stale = token !== host.token();");
  });

  test("submitted email is trimmed before use", () => {
    expect(source).toContain("const submitted = email.trim()");
  });

  test("signup without a session shows check-inbox, not another signup form", () => {
    expect(controllerSource).toContain('host.setAwaitingConfirmation(submitted)');
    expect(source).toContain("Check your inbox");
    expect(source).toContain("Back to sign in");
  });

  test("cooldown persists only a deadline timestamp — never email, password or tokens", () => {
    expect(source).toContain("window.sessionStorage.setItem(");
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
    expect(
      source.match(/if \(busy \|\| emailCooldownLeft > 0 \|\| attemptCooldownLeft > 0\) return;/g)
        ?.length,
    ).toBe(2);
    expect(source).toContain("if (emailCooldownLeft > 0 || attemptCooldownLeft > 0) return;");
    expect(source).toContain("if (busy || attemptCooldownLeft > 0) return;");
  });

  test("adjacent secondary actions are grouped with a visible gap", () => {
    expect(source).toContain("academy-auth-actions");
    expect(css).toContain(".academy-auth-actions");
    expect(css).toContain("flex-wrap: wrap");
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
    expect(source).toContain("controller.updatePassword(password)");
    expect(source).toContain("supabase.auth.updateUser(args)");
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
