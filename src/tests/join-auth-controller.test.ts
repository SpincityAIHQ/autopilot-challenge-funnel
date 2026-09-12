import { describe, expect, test } from "bun:test";
import {
  createJoinController,
  type JoinAuthClient,
  type JoinHost,
} from "@/lib/academy-join-controller";
import { describeAuthSuccess, type AuthFeedback } from "@/lib/academy-auth-feedback";

type Call = { name: string; args: unknown[] };

function harness(client: Partial<JoinAuthClient> = {}) {
  const calls: Call[] = [];
  const state = {
    busy: [] as boolean[],
    feedback: null as AuthFeedback | null,
    awaiting: null as string | null,
    confirmationHelp: false,
    sessions: 0,
    cooldowns: [] as { seconds: number; alsoAttempts: boolean }[],
    token: 0,
  };
  const record =
    (name: string, impl?: (...args: never[]) => unknown) =>
    async (...args: unknown[]) => {
      calls.push({ name, args });
      return impl ? await (impl as (...a: unknown[]) => unknown)(...args) : { error: null };
    };

  const host: JoinHost = {
    client: {
      signInWithPassword: record("signInWithPassword", client.signInWithPassword),
      signUp: record("signUp", client.signUp),
      resend: record("resend", client.resend),
      resetPasswordForEmail: record("resetPasswordForEmail", client.resetPasswordForEmail),
      updateUser: record("updateUser", client.updateUser),
    } as JoinAuthClient,
    redirectTo: () => "https://aiautopilotsummit.com/join?mode=signin",
    token: () => state.token,
    setBusy: (b) => state.busy.push(b),
    setFeedback: (f) => {
      state.feedback = f;
    },
    applyCooldown: (seconds, alsoAttempts) => state.cooldowns.push({ seconds, alsoAttempts }),
    setAwaitingConfirmation: (e) => {
      state.awaiting = e;
    },
    setConfirmationHelp: (on) => {
      state.confirmationHelp = on;
    },
    onSession: () => {
      state.sessions += 1;
    },
  };
  return { controller: createJoinController(host), calls, state };
}

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("session handling after a failed confirmation link", () => {
  test("a returned session unblocks onboarding; no session does not", async () => {
    const withSession = harness({
      signInWithPassword: async () => ({ data: { session: { access_token: "x" } } }),
    });
    // Simulates the post-expired-link state: verification blocked upstream.
    await withSession.controller.signIn("a@b.com", "pw");
    expect(withSession.state.sessions).toBe(1);
    expect(withSession.state.confirmationHelp).toBe(false);

    const noSession = harness({ signInWithPassword: async () => ({ data: { session: null } }) });
    await noSession.controller.signIn("a@b.com", "pw");
    expect(noSession.state.sessions).toBe(0);
  });

  test("an error never counts as a session", async () => {
    const h = harness({
      signInWithPassword: async () => ({ error: { code: "invalid_credentials", status: 400 } }),
    });
    await h.controller.signIn("a@b.com", "pw");
    expect(h.state.sessions).toBe(0);
    expect(h.state.feedback?.message).toContain("Email or password is incorrect");
  });
});

describe("anti-enumeration equivalence", () => {
  const neutralErrors = [
    { code: "user_not_found", status: 400 },
    { code: "user_already_exists", status: 422 },
    { code: "email_not_confirmed", status: 400 },
  ];

  test("reset: existence-sensitive errors look identical to acceptance", async () => {
    const accepted = harness();
    await accepted.controller.reset("a@b.com");
    for (const error of neutralErrors) {
      const h = harness({ resetPasswordForEmail: async () => ({ error }) });
      await h.controller.reset("a@b.com");
      expect(h.state.feedback).toEqual(accepted.state.feedback);
      expect(h.state.cooldowns).toEqual(accepted.state.cooldowns);
      expect(h.state.awaiting).toEqual(accepted.state.awaiting);
      expect(h.state.feedback?.message).toBe(describeAuthSuccess("reset").message);
      // email_not_confirmed guidance must not leak through reset.
      expect(h.state.feedback?.offer).toBe(null);
    }
  });

  test("resend: existence-sensitive errors look identical to acceptance", async () => {
    const accepted = harness();
    await accepted.controller.resend("a@b.com");
    for (const error of neutralErrors) {
      const h = harness({ resend: async () => ({ error }) });
      await h.controller.resend("a@b.com");
      expect(h.state.feedback).toEqual(accepted.state.feedback);
      expect(h.state.cooldowns).toEqual(accepted.state.cooldowns);
      expect(h.state.confirmationHelp).toBe(true);
    }
  });

  test("duplicate signup enters the same check-inbox state and cooldown", async () => {
    const eligible = harness({ signUp: async () => ({ data: { session: null } }) });
    await eligible.controller.signUp("a@b.com", "password1234");

    for (const code of ["user_already_exists", "email_exists"]) {
      const dup = harness({ signUp: async () => ({ error: { code, status: 422 } }) });
      await dup.controller.signUp("a@b.com", "password1234");
      expect(dup.state.awaiting).toBe(eligible.state.awaiting);
      expect(dup.state.feedback).toEqual(eligible.state.feedback);
      expect(dup.state.cooldowns).toEqual(eligible.state.cooldowns);
      expect(dup.state.cooldowns.length).toBe(1);
    }
  });

  test("credential sign-in keeps explicit confirm-your-email guidance", async () => {
    const h = harness({
      signInWithPassword: async () => ({ error: { code: "email_not_confirmed", status: 400 } }),
    });
    await h.controller.signIn("a@b.com", "pw");
    expect(h.state.feedback?.message).toContain("Confirm your email before signing in");
    expect(h.state.feedback?.offer).toBe("resend-confirmation");
    expect(h.state.confirmationHelp).toBe(true);
  });
});

describe("cooldowns and stale requests", () => {
  test("changing the address mid-flight still applies the send cooldown", async () => {
    const gate = deferred<{ data: { session: null } }>();
    const h = harness({ resetPasswordForEmail: async () => gate.promise as never });
    const pending = h.controller.reset("a@b.com");
    h.state.token = 1; // user typed a different address
    gate.resolve({ data: { session: null } });
    await pending;
    expect(h.state.cooldowns).toEqual([{ seconds: 60, alsoAttempts: false }]);
    expect(h.state.feedback).toBe(null); // stale UI feedback suppressed
  });

  test("rate limits guard attempts for resend, signup and reset too", async () => {
    for (const action of ["resend", "signUp", "reset"] as const) {
      const error = { code: "over_request_rate_limit", status: 429 };
      const h = harness({
        resend: async () => ({ error }),
        signUp: async () => ({ error }),
        resetPasswordForEmail: async () => ({ error }),
      });
      if (action === "signUp") await h.controller.signUp("a@b.com", "password1234");
      else if (action === "resend") await h.controller.resend("a@b.com");
      else await h.controller.reset("a@b.com");
      expect(h.state.cooldowns).toEqual([{ seconds: 60, alsoAttempts: true }]);
    }
  });

  test("a trustworthy Retry-After is honoured", async () => {
    const h = harness({
      resend: async () => ({
        error: { code: "over_email_send_rate_limit", status: 429, retryAfterSeconds: 120 },
      }),
    });
    await h.controller.resend("a@b.com");
    expect(h.state.cooldowns).toEqual([{ seconds: 120, alsoAttempts: true }]);
  });
});

describe("in-flight guard and cleanup", () => {
  test("duplicate submits call the provider exactly once", async () => {
    const gate = deferred<{ data: { session: null } }>();
    const h = harness({ resend: async () => gate.promise as never });
    const first = h.controller.resend("a@b.com");
    await h.controller.resend("a@b.com"); // Enter/double-click while in flight
    gate.resolve({ data: { session: null } });
    await first;
    expect(h.calls.filter((c) => c.name === "resend").length).toBe(1);
    // A later explicit click is allowed again.
    await h.controller.resend("a@b.com");
    expect(h.calls.filter((c) => c.name === "resend").length).toBe(2);
  });

  test("resend uses auth.resend with type signup and never signUp", async () => {
    const h = harness();
    await h.controller.resend("a@b.com");
    expect(h.calls.map((c) => c.name)).toEqual(["resend"]);
    expect((h.calls[0]!.args[0] as { type: string }).type).toBe("signup");
  });

  test("thrown failures are mapped and busy is released in finally", async () => {
    const h = harness({
      signUp: async () => {
        throw new Error("network down");
      },
    });
    await h.controller.signUp("a@b.com", "password1234");
    expect(h.state.busy).toEqual([true, false]);
    expect(h.state.feedback?.message).toContain("could not confirm the result");
    expect(h.state.feedback?.message).not.toContain("network down");
  });

  test("update-password reports success and maps returned errors", async () => {
    const ok = harness();
    await ok.controller.updatePassword("a-long-password");
    expect(ok.state.feedback?.tone).toBe("success");

    const bad = harness({ updateUser: async () => ({ error: { code: "weak_password" } }) });
    await bad.controller.updatePassword("short");
    expect(bad.state.feedback?.message).toContain("stronger password");
    expect(bad.state.busy).toEqual([true, false]);
  });
});
