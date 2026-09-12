import { describe, expect, test } from "bun:test";
import {
  COOLDOWN_STORAGE_KEY,
  DEFAULT_EMAIL_COOLDOWN_SECONDS,
  cooldownDeadline,
  cooldownLabel,
  cooldownRemaining,
  describeAuthError,
  describeAuthSuccess,
  normalizeRetryAfter,
  readStoredDeadline,
} from "@/lib/academy-auth-feedback";

const RAW_LEAK = /supabase|jwt|token|sql|500 |stack|Error:/i;

describe("error mapping is allowlisted and safe", () => {
  test("email_not_confirmed offers an explicit resend", () => {
    const f = describeAuthError("signin", { code: "email_not_confirmed", status: 400 });
    expect(f.tone).toBe("error");
    expect(f.message).toContain("Confirm your email");
    expect(f.offer).toBe("resend-confirmation");
  });

  test("invalid_credentials never blames the password alone or confirms the account", () => {
    const f = describeAuthError("signin", { code: "invalid_credentials", status: 400 });
    expect(f.message).toBe(
      "Email or password is incorrect. Check both and try again, or reset your password.",
    );
    expect(f.offer).toBe("reset-password");
    expect(f.message.toLowerCase()).not.toContain("no account");
    expect(f.message.toLowerCase()).not.toContain("not registered");
  });

  test("existing-account errors stay neutral", () => {
    for (const code of ["user_already_exists", "email_exists"]) {
      const f = describeAuthError("signup", { code });
      expect(f.message).toContain("If this address is eligible");
      expect(f.message.toLowerCase()).not.toContain("already has an account");
    }
  });

  test("user_not_found is neutral for reset/resend but shared wording for signin", () => {
    expect(describeAuthError("reset", { code: "user_not_found" }).message).toContain(
      "If this address is eligible",
    );
    expect(describeAuthError("signin", { code: "user_not_found" }).message).toContain(
      "Email or password is incorrect",
    );
  });

  test("unknown, network, timeout and 5xx failures get safe temporary guidance", () => {
    const cases = [
      null,
      undefined,
      {},
      { name: "TypeError" },
      { name: "AbortError" },
      { code: "totally_unknown_code" },
      { status: 500 },
      { status: 503 },
      new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:54321"),
    ];
    for (const err of cases) {
      const f = describeAuthError("signin", err as never);
      // Outcome-uncertain wording: never claims nothing was changed.
      expect(f.message).toBe(
        "We could not confirm the result of that request. It may or may not have gone through — please wait a few moments and check before trying again.",
      );
      expect(f.message).not.toContain("Nothing was changed");
      // Email requests advise checking the inbox before retrying.
      expect(describeAuthError("reset", err as never).message).toContain(
        "check your inbox and spam folder before trying again",
      );
      expect(f.cooldownSeconds).toBeNull();
    }
  });

  test("raw provider message text is never echoed", () => {
    const f = describeAuthError("reset", {
      message: "Error: relation auth.users does not exist (SQL 42P01) jwt malformed",
      status: 500,
    } as never);
    expect(RAW_LEAK.test(f.message)).toBe(false);
  });

  test("string matching is not used: message alone cannot trigger a mapping", () => {
    const f = describeAuthError("signin", { message: "Email not confirmed" } as never);
    expect(f.offer).toBeNull();
  });

  test("expired confirmation link guidance", () => {
    for (const code of ["otp_expired", "flow_state_expired", "flow_state_not_found"]) {
      const f = describeAuthError("confirm-link", { code });
      expect(f.message).toContain("expired");
      expect(f.offer).toBe("resend-confirmation");
    }
    const unknownLink = describeAuthError("confirm-link", { status: 400 });
    expect(unknownLink.message).toContain("Request a new confirmation email");
    expect(RAW_LEAK.test(unknownLink.message)).toBe(false);
  });
});

describe("cooldown note wording", () => {
  test("never suggests bypassing provider limits with another address", () => {
    const f = describeAuthError("resend", { code: "over_email_send_rate_limit", status: 429 });
    expect(f.message).not.toContain("another email");
    expect(f.message).toContain("retry this request after the countdown");
    expect(f.message).toContain("server limit may last longer");
    const attempts = describeAuthError("signin", { code: "over_request_rate_limit", status: 429 });
    expect(attempts.message).not.toContain("from this device");
  });
});

describe("rate limiting and cooldown", () => {
  test("email send rate limit returns the conservative default cooldown", () => {
    const f = describeAuthError("resend", { code: "over_email_send_rate_limit", status: 429 });
    expect(f.cooldownSeconds).toBe(DEFAULT_EMAIL_COOLDOWN_SECONDS);
    expect(f.message).toContain("may last longer");
  });

  test("429 without a known code still guards retries", () => {
    const f = describeAuthError("signin", { status: 429 });
    expect(f.cooldownSeconds).toBe(DEFAULT_EMAIL_COOLDOWN_SECONDS);
  });

  test("only a trustworthy numeric Retry-After is honoured", () => {
    expect(normalizeRetryAfter(45)).toBe(45);
    expect(normalizeRetryAfter(0.4)).toBe(1);
    expect(normalizeRetryAfter("90")).toBeNull();
    expect(normalizeRetryAfter(-5)).toBeNull();
    expect(normalizeRetryAfter(Number.NaN)).toBeNull();
    expect(normalizeRetryAfter(undefined)).toBeNull();
    expect(normalizeRetryAfter(10 ** 9)).toBe(1800);
    const f = describeAuthError("reset", {
      code: "over_email_send_rate_limit",
      retryAfterSeconds: 120,
    });
    expect(f.cooldownSeconds).toBe(120);
  });

  test("cooldown is deadline based and never promises success", () => {
    const now = 1_000_000;
    const deadline = cooldownDeadline(now, 60);
    expect(deadline).toBe(now + 60_000);
    expect(cooldownRemaining(deadline, now)).toBe(60);
    expect(cooldownRemaining(deadline, now + 59_500)).toBe(1);
    expect(cooldownRemaining(deadline, now + 60_000)).toBe(0);
    expect(cooldownRemaining(deadline, now + 999_000)).toBe(0);
    expect(cooldownRemaining(null, now)).toBe(0);
    expect(cooldownLabel(1)).toContain("1 second.");
    expect(cooldownLabel(30)).toContain("may last longer");
  });

  test("persisted deadline survives mode switches and discards junk", () => {
    const now = 5_000;
    expect(readStoredDeadline(String(now + 10_000), now)).toBe(now + 10_000);
    expect(readStoredDeadline(String(now - 1), now)).toBeNull();
    expect(readStoredDeadline("not-a-number", now)).toBeNull();
    expect(readStoredDeadline(null, now)).toBeNull();
    // Only a timestamp is ever persisted.
    expect(COOLDOWN_STORAGE_KEY).toBe("academy.join.emailCooldownUntil");
  });
});

describe("success copy is neutral", () => {
  test("acceptance is never described as delivery", () => {
    for (const action of ["signup", "resend", "reset"] as const) {
      const f = describeAuthSuccess(action);
      expect(f.message).toContain("If this address is eligible");
      expect(f.message.toLowerCase()).not.toContain("we have delivered");
      expect(f.message.toLowerCase()).not.toContain("has arrived");
    }
    expect(describeAuthSuccess("update-password").tone).toBe("success");
  });
});
