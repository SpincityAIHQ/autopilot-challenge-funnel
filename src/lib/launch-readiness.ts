import { LESSONS, type LessonMeta } from "./academy";
/**
 * The launch board. Every connection the complete experience depends on, its
 * current state, and the exact human action that turns it green. The server
 * fills the input from environment presence and database counts; nothing here
 * reveals a secret value.
 */
export type ReadinessState = "ready" | "partial" | "missing" | "off";
export type ReadinessItem = {
  key: string;
  group: "content" | "purchases" | "messaging" | "guides" | "operations";
  label: string;
  state: ReadinessState;
  detail: string;
  action: string;
  blocking: boolean;
};
export type ReadinessInput = {
  env: Record<string, string | undefined>;
  connected: string[];
  transcripts: string[];
  counts: {
    importedTickets: number;
    importedClaimed: number;
    orders: number;
    activeGrants: number;
    pendingOutbox: number;
    unknownOutbox: number;
    profiles: number;
    waitlist: number;
  };
  lastOutboxRunAt: string | null;
};
const has = (env: ReadinessInput["env"], key: string) => Boolean(env[key]?.trim());
const on = (env: ReadinessInput["env"], key: string) => env[key] === "true";
export function launchReadiness(input: ReadinessInput): ReadinessItem[] {
  const { env, counts } = input;
  const lessons = LESSONS.filter((l) => l.kind === "lesson");
  const days = LESSONS.filter((l) => l.kind === "session");
  const slotName = (l: LessonMeta) => `ACADEMY_VIMEO_${l.envKey}`;
  const missingLessons = lessons.filter((l) => !input.connected.includes(l.id));
  const connectedDays = days.filter((l) => input.connected.includes(l.id));
  const missingTranscripts = lessons.filter(
    (l) => input.connected.includes(l.id) && !input.transcripts.includes(l.id),
  );
  const vsl = [
    "VITE_ACADEMY_VSL_URL",
    "VITE_ACADEMY_VSL_SUMMIT",
    "VITE_ACADEMY_VSL_VAULT",
    "VITE_ACADEMY_VSL_ACCELERATOR",
  ];
  const missingVsl = vsl.filter((k) => !has(env, k));
  const shopifyKeys = [
    "ACADEMY_SHOPIFY_SHOP",
    "SHOPIFY_ADMIN_ACCESS_TOKEN",
    "ACADEMY_SHOPIFY_WEBHOOK_SECRET",
  ];
  const missingShopify = shopifyKeys.filter((k) => !has(env, k));
  const ghlUrlOk = /^https:\/\/services\.leadconnectorhq\.com\/hooks\//.test(
    env.ACADEMY_GHL_WEBHOOK_URL ?? "",
  );
  const lastRun = input.lastOutboxRunAt ? Date.parse(input.lastOutboxRunAt) : NaN;
  const schedulerFresh = Number.isFinite(lastRun) && Date.now() - lastRun < 30 * 60000;
  const items: ReadinessItem[] = [
    {
      key: "free-training-video",
      group: "content",
      label: "Free training recording",
      state: input.connected.includes("free-webinar") ? "ready" : "missing",
      detail: input.connected.includes("free-webinar") ? "Connected" : "No recording in the slot",
      action: "Paste the Vimeo link into ACADEMY_VIMEO_FREE_WEBINAR.",
      blocking: true,
    },
    {
      key: "summit-videos",
      group: "content",
      label: "Summit and lab recordings",
      state:
        missingLessons.length === 0
          ? "ready"
          : missingLessons.length < lessons.length
            ? "partial"
            : "missing",
      detail: `${lessons.length - missingLessons.length} of ${lessons.length} connected`,
      action: missingLessons.length
        ? `Paste Vimeo links into: ${missingLessons.map(slotName).join(", ")}.`
        : "Nothing to do.",
      blocking: true,
    },
    {
      key: "accelerator-days",
      group: "content",
      label: "Accelerator build-room replays",
      state:
        connectedDays.length === days.length
          ? "ready"
          : connectedDays.length
            ? "partial"
            : "missing",
      detail: `${connectedDays.length} of ${days.length} days connected`,
      action:
        "Paste each day's Vimeo link into ACADEMY_VIMEO_ACCELERATOR_DAY_NN as rooms are recorded.",
      blocking: false,
    },
    {
      key: "transcripts",
      group: "content",
      label: "Transcripts for the guides",
      state: missingTranscripts.length === 0 ? "ready" : "partial",
      detail: `${input.transcripts.length} slot${input.transcripts.length === 1 ? "" : "s"} with a transcript`,
      action: has(env, "VIMEO_ACCESS_TOKEN")
        ? "Turn on auto-captions for each Vimeo upload; they are pulled automatically."
        : "Add VIMEO_ACCESS_TOKEN (Vimeo personal token, scopes private + video_files) so captions flow in automatically.",
      blocking: false,
    },
    {
      key: "vsl",
      group: "content",
      label: "Welcome videos (home, Summit, Vault, Accelerator)",
      state:
        missingVsl.length === 0 ? "ready" : missingVsl.length < vsl.length ? "partial" : "missing",
      detail: `${vsl.length - missingVsl.length} of ${vsl.length} slots filled`,
      action: missingVsl.length
        ? `Record and paste links into: ${missingVsl.join(", ")}.`
        : "Nothing to do.",
      blocking: false,
    },
    {
      key: "shopify",
      group: "purchases",
      label: "Shopify connection",
      state:
        missingShopify.length === 0 && on(env, "ACADEMY_SHOPIFY_ENABLED")
          ? "ready"
          : missingShopify.length < shopifyKeys.length
            ? "partial"
            : "missing",
      detail: missingShopify.length
        ? `Missing: ${missingShopify.join(", ")}`
        : on(env, "ACADEMY_SHOPIFY_ENABLED")
          ? "Credentials present and webhooks enabled"
          : "Credentials present; ACADEMY_SHOPIFY_ENABLED is not true",
      action:
        "In Shopify admin create an Admin API token with read_orders; add the shop domain, token and webhook signing secret as secrets; subscribe orders/paid, orders/updated, orders/cancelled and refunds/create to /api/public/webhooks/shopify; then set ACADEMY_SHOPIFY_ENABLED=true.",
      blocking: true,
    },
    {
      key: "email-tickets",
      group: "purchases",
      label: "Automatic tickets by purchase email",
      state: on(env, "ACADEMY_EMAIL_TICKETS_ENABLED")
        ? has(env, "ACADEMY_ACCELERATOR_ENDS_AT")
          ? "ready"
          : "partial"
        : "off",
      detail: on(env, "ACADEMY_EMAIL_TICKETS_ENABLED")
        ? has(env, "ACADEMY_ACCELERATOR_ENDS_AT")
          ? "New paid orders become tickets the purchaser claims by signing in"
          : "On for Summit tiers; Accelerator lines skipped until ACADEMY_ACCELERATOR_ENDS_AT is set"
        : "Off: purchases would wait for access codes",
      action:
        "Set ACADEMY_EMAIL_TICKETS_ENABLED=true and ACADEMY_ACCELERATOR_ENDS_AT to the programme end (ISO date, e.g. 2026-12-31T23:59:59-05:00).",
      blocking: true,
    },
    {
      key: "historical-tickets",
      group: "purchases",
      label: "Imported Summit purchasers",
      state: counts.importedTickets > 0 ? "ready" : "missing",
      detail: `${counts.importedTickets} tickets imported, ${counts.importedClaimed} claimed by a signed-in account`,
      action:
        "Email every imported purchaser: create your account with the purchase email and your ticket activates itself.",
      blocking: false,
    },
    {
      key: "ghl",
      group: "messaging",
      label: "GHL inbound workflow (welcome, purchase, coaching)",
      state:
        on(env, "ACADEMY_GHL_ENABLED") && ghlUrlOk ? "ready" : ghlUrlOk ? "partial" : "missing",
      detail: ghlUrlOk
        ? on(env, "ACADEMY_GHL_ENABLED")
          ? "Enabled"
          : "URL present; ACADEMY_GHL_ENABLED is not true"
        : "No valid services.leadconnectorhq.com hook URL",
      action:
        "In GHL: verify the email action on the inbound workflow, add an SMS action gated on send_sms=true, branch on event_name (webinar_registered, purchase_confirmed, learning_*), and send a test to your own inbox.",
      blocking: true,
    },
    {
      key: "scheduler",
      group: "operations",
      label: "Sender heartbeat (every 5 minutes)",
      state: schedulerFresh ? "ready" : input.lastOutboxRunAt ? "partial" : "missing",
      detail: input.lastOutboxRunAt
        ? `Last message processed ${new Date(input.lastOutboxRunAt).toISOString()}`
        : "No processed message yet",
      action:
        "Check the pg_cron job academy-process-integrations and the academy_scheduler_bearer vault secret; sign up with a test email and confirm a welcome arrives within 10 minutes.",
      blocking: true,
    },
    {
      key: "outbox",
      group: "operations",
      label: "Message queue health",
      state:
        counts.unknownOutbox === 0 ? (counts.pendingOutbox < 50 ? "ready" : "partial") : "partial",
      detail: `${counts.pendingOutbox} pending, ${counts.unknownOutbox} unknown outcome`,
      action: counts.unknownOutbox
        ? "Reconcile unknown outcomes against GHL delivery logs before re-queueing."
        : "Nothing to do.",
      blocking: false,
    },
    {
      key: "nudges",
      group: "messaging",
      label: "SPINXP coaching emails",
      state: on(env, "ACADEMY_LEARNING_NUDGES_ENABLED") ? "ready" : "off",
      detail: on(env, "ACADEMY_LEARNING_NUDGES_ENABLED")
        ? "Drop-off, practice, stalled, feedback and approval nudges active"
        : "Paused",
      action:
        "Set ACADEMY_LEARNING_NUDGES_ENABLED=true after the welcome email is verified in a real inbox.",
      blocking: false,
    },
    {
      key: "thoth-drafting",
      group: "guides",
      label: "Thoth wording on coaching emails",
      state: on(env, "ACADEMY_THOTH_MESSAGES_ENABLED") ? "ready" : "off",
      detail: on(env, "ACADEMY_THOTH_MESSAGES_ENABLED")
        ? "AI drafting on"
        : "Authored templates only",
      action:
        "Set ACADEMY_THOTH_MESSAGES_ENABLED=true when you want Thoth to personalise the wording (uses the shared AI quota).",
      blocking: false,
    },
    {
      key: "tutor",
      group: "guides",
      label: "Thoth and AI Spin chat",
      state:
        env.ACADEMY_TUTOR_ENABLED !== "false" &&
        has(env, "LOVABLE_API_KEY") &&
        has(env, "RATE_LIMIT_HMAC_SECRET")
          ? "ready"
          : "missing",
      detail: "Managed AI gateway plus rate-limit secret",
      action: "Nothing to do unless chat reports paused; then check AI credits in Lovable.",
      blocking: true,
    },
    {
      key: "avatar",
      group: "guides",
      label: "AI Spin live avatar (Accelerator)",
      state:
        on(env, "ACADEMY_AVATAR_ENABLED") &&
        has(env, "LIVEAVATAR_API_KEY") &&
        has(env, "LIVEAVATAR_AVATAR_ID") &&
        has(env, "LIVEAVATAR_VOICE_ID")
          ? "ready"
          : "off",
      detail: on(env, "ACADEMY_AVATAR_ENABLED") ? "Enabled" : "Off: text chat only",
      action:
        "Add LIVEAVATAR_API_KEY, LIVEAVATAR_AVATAR_ID, LIVEAVATAR_VOICE_ID from HeyGen LiveAvatar and set ACADEMY_AVATAR_ENABLED=true; run one live session yourself.",
      blocking: false,
    },
    {
      key: "booking",
      group: "guides",
      label: "1-on-1 booking calendar",
      state: has(env, "ACADEMY_BOOKING_URL") ? "ready" : "missing",
      detail: has(env, "ACADEMY_BOOKING_URL") ? "Calendar link set" : "No calendar link",
      action: "Set ACADEMY_BOOKING_URL to your GHL or Calendly booking link.",
      blocking: false,
    },
    {
      key: "audience",
      group: "operations",
      label: "Audience on the platform",
      state: counts.profiles > 0 ? "ready" : "missing",
      detail: `${counts.profiles} accounts, ${counts.orders} live orders, ${counts.activeGrants} active purchase lines, ${counts.waitlist} on the old waitlist`,
      action:
        "Send the launch blast from GHL/Mailchimp to registrants, purchasers and the waitlist with the join link.",
      blocking: false,
    },
  ];
  return items;
}
export function readinessSummary(items: ReadinessItem[]) {
  const blockers = items.filter((i) => i.blocking && i.state !== "ready");
  return {
    go: blockers.length === 0,
    blockers: blockers.map((i) => i.key),
    total: items.length,
    ready: items.filter((i) => i.state === "ready").length,
  };
}
