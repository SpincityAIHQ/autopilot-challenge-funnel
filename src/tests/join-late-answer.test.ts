/**
 * A provider answer that arrives after our own time limit.
 *
 * A rate limit in that late answer is an observed fact about the allowance and
 * must still extend the countdown. Nothing else may change: no feedback, no
 * session, no confirmation state, no retry. A second manual email send is
 * refused while an earlier one is unresolved, and password sign-in stays usable
 * when only an email-send restriction applies.
 *
 * All promises here are deferred fakes; no real request is made.
 */
import { describe, it, expect } from "bun:test";
import {
  createJoinController,
  PENDING_EMAIL_SEND,
  type JoinAuthClient,
} from "../lib/academy-join-controller";

type Deferred<T> = { promise: Promise<T>; settle: (v: T) => void; fail: (e: unknown) => void };
function deferred<T>(): Deferred<T> {
  let settle!: (v: T) => void;
  let fail!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    settle = res;
    fail = rej;
  });
  return { promise, settle, fail };
}

const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

function harness(client: Partial<JoinAuthClient>) {
  const state = {
    feedback: [] as Array<{ message: string } | null>,
    cooldowns: [] as Array<[number, boolean]>,
    sessions: 0,
    confirmations: [] as Array<string | null>,
    help: [] as boolean[],
    stale: [] as unknown[],
  };
  const never = () => new Promise<never>(() => {});
  const controller = createJoinController(
    {
      client: {
        signInWithPassword: never,
        signUp: never,
        resend: never,
        resetPasswordForEmail: never,
        updateUser: never,
        ...client,
      } as JoinAuthClient,
      redirectTo: () => "https://aiautopilotsummit.com/join",
      token: () => 1,
      setBusy: () => {},
      setFeedback: (f) => state.feedback.push(f as { message: string } | null),
      applyCooldown: (s, a) => state.cooldowns.push([s, a]),
      setAwaitingConfirmation: (e) => state.confirmations.push(e),
      setConfirmationHelp: (on) => state.help.push(on),
      setStaleFeedback: (f) => state.stale.push(f),
      onSession: () => {
        state.sessions += 1;
      },
    },
    10, // short limit so the test does not wait
  );
  return { state, controller };
}

const messages = (state: { feedback: Array<{ message: string } | null> }) =>
  state.feedback.filter(Boolean).map((f) => f!.message);

describe("A late RETURNED rate limit still extends the cooldown", () => {
  it("applies the countdown and changes nothing else", async () => {
    const d = deferred<{ error: unknown }>();
    const { state, controller } = harness({ resetPasswordForEmail: () => d.promise });
    await controller.reset("buyer@example.com");
    const afterTimeout = messages(state).length;
    expect(state.cooldowns).toEqual([]);

    d.settle({ error: { code: "over_email_send_rate_limit", status: 429 } });
    await tick();

    // The observed limit is honoured...
    expect(state.cooldowns).toEqual([[60, false]]);
    // ...and it is email-only, so sign-in is not gated.
    expect(state.cooldowns[0]![1]).toBe(false);
    // ...while no state belonging to the user's screen is rewritten.
    expect(messages(state).length).toBe(afterTimeout);
    expect(state.sessions).toBe(0);
    expect(state.confirmations).toEqual([]);
    expect(state.help).toEqual([]);
    expect(state.stale).toEqual([]);
  });
});

describe("A late THROWN rate limit still extends the cooldown", () => {
  it("honours a request-rate limit, which also gates attempts", async () => {
    const d = deferred<never>();
    const { state, controller } = harness({ resend: () => d.promise });
    await controller.resend("buyer@example.com");

    d.fail({ code: "over_request_rate_limit", status: 429 });
    await tick();

    expect(state.cooldowns).toEqual([[60, true]]);
    expect(state.sessions).toBe(0);
  });

  it("honours a trustworthy Retry-After from a late answer", async () => {
    const d = deferred<never>();
    const { state, controller } = harness({ resend: () => d.promise });
    await controller.resend("buyer@example.com");

    d.fail({ code: "over_email_send_rate_limit", status: 429, retryAfterSeconds: 300 });
    await tick();

    expect(state.cooldowns).toEqual([[300, false]]);
  });

  it("ignores a late answer that is not a rate limit", async () => {
    const d = deferred<never>();
    const { state, controller } = harness({ resend: () => d.promise });
    await controller.resend("buyer@example.com");
    const afterTimeout = messages(state).length;

    d.fail({ code: "validation_failed", status: 400 });
    await tick();

    expect(state.cooldowns).toEqual([]);
    expect(messages(state).length).toBe(afterTimeout);
  });
});

describe("A second email send is refused while one is unresolved", () => {
  it("explains what is unknown instead of sending again", async () => {
    let calls = 0;
    const d = deferred<{ error: unknown }>();
    const { state, controller } = harness({
      resend: () => {
        calls += 1;
        return d.promise;
      },
    });
    await controller.resend("buyer@example.com"); // times out, still unresolved
    expect(controller.emailSendPending).toBe(true);

    await controller.resend("buyer@example.com");
    await controller.signUp("buyer@example.com", "a".repeat(12));

    expect(calls).toBe(1); // no second send of any kind
    const last = messages(state).at(-1);
    expect(last).toBe(PENDING_EMAIL_SEND.message);
    expect(last).toContain("Check your inbox");
    expect(last).toContain("reload");
    // Never silently nothing, and never left claiming it was sent.
    expect(last).not.toContain("sent you");
  });

  it("frees the next send once the late answer finally arrives", async () => {
    const d = deferred<{ error: unknown }>();
    let calls = 0;
    const { controller } = harness({
      resend: () => {
        calls += 1;
        return calls === 1 ? d.promise : Promise.resolve({ error: null });
      },
    });
    await controller.resend("buyer@example.com");
    d.settle({ error: null });
    await tick();
    expect(controller.emailSendPending).toBe(false);

    await controller.resend("buyer@example.com");
    expect(calls).toBe(2);
  });
});

describe("Password sign-in survives an email-only restriction", () => {
  it("still signs in while an email send is unresolved", async () => {
    const d = deferred<{ error: unknown }>();
    const { state, controller } = harness({
      resend: () => d.promise,
      signInWithPassword: async () => ({ data: { session: { token: "x" } } }),
    });
    await controller.resend("buyer@example.com");
    expect(controller.emailSendPending).toBe(true);

    await controller.signIn("buyer@example.com", "old-short");

    expect(state.sessions).toBe(1);
  });

  it("still signs in after a late email-send limit sets an email cooldown", async () => {
    const d = deferred<never>();
    const { state, controller } = harness({
      resend: () => d.promise,
      signInWithPassword: async () => ({ data: { session: { token: "x" } } }),
    });
    await controller.resend("buyer@example.com");
    d.fail({ code: "over_email_send_rate_limit", status: 429 });
    await tick();

    expect(state.cooldowns).toEqual([[60, false]]); // email only, attempts untouched
    await controller.signIn("buyer@example.com", "old-short");
    expect(state.sessions).toBe(1);
  });
});
