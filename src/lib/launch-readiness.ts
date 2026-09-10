import { LESSONS, type LessonMeta } from "./academy";
import { explicitProgrammeEnd } from "./academy-access-terms.server";
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
  /** Result of shopifyAdminClient.webhookConfiguration() on the server: shop, mode and secrets agree. */
  shopifyConfigured: boolean;
  /** academyGhlTransportReady(): the selected GHL transport (webhook URL or private API) is usable. */
  ghlTransportReady: boolean;
  /** ghlPaymentConfiguration() succeeded: GHL checkout with Stripe can be read back. */
  ghlPaymentsConfigured: boolean;
  /** Tiers with an approved rolling term; they use the purchase-code path, not email tickets. */
  timedTiers: string[];
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
  // Either a Dev Dashboard app (client credentials) or a legacy custom app token.
  const clientMode = has(env, "SHOPIFY_CLIENT_ID") || has(env, "SHOPIFY_CLIENT_SECRET");
  const shopifyKeys = clientMode
    ? ["ACADEMY_SHOPIFY_SHOP", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"]
    : ["ACADEMY_SHOPIFY_SHOP", "SHOPIFY_ADMIN_ACCESS_TOKEN", "ACADEMY_SHOPIFY_WEBHOOK_SECRET"];
  const missingShopify = shopifyKeys.filter((k) => !has(env, k));
  const programmeEnd = explicitProgrammeEnd(env.ACADEMY_ACCELERATOR_ENDS_AT);
  const checkoutProvider = env.ACADEMY_CHECKOUT_PROVIDER?.trim() || "shopify";
  const ghlTransport = env.ACADEMY_GHL_TRANSPORT?.trim() || "webhook";
  const openTiers = ["ga", "vip", "vault"].filter((t) => !input.timedTiers.includes(t));
  const emailTicketsOn = on(env, "ACADEMY_EMAIL_TICKETS_ENABLED");
  const twoConfirmations = emailTicketsOn && on(env, "ACADEMY_ACCESS_EMAIL_ENABLED");
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
        input.shopifyConfigured && on(env, "ACADEMY_SHOPIFY_ENABLED")
          ? "ready"
          : input.shopifyConfigured || missingShopify.length < shopifyKeys.length
            ? "partial"
            : "missing",
      detail: input.shopifyConfigured
        ? on(env, "ACADEMY_SHOPIFY_ENABLED")
          ? `Credentials verified (${clientMode ? "client credentials" : "legacy token"}) and webhooks enabled`
          : "Credentials verified; ACADEMY_SHOPIFY_ENABLED is not true"
        : missingShopify.length
          ? `Missing: ${missingShopify.join(", ")}`
          : "Credentials present but they do not agree (shop domain, auth mode or webhook secret)",
      action:
        "In the Shopify Dev Dashboard create an app with client_credentials and read_orders, install it on the store, and add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (legacy custom-app token works too: SHOPIFY_ADMIN_ACCESS_TOKEN + ACADEMY_SHOPIFY_WEBHOOK_SECRET). Subscribe orders/paid, orders/updated, orders/cancelled and refunds/create to /api/public/webhooks/shopify; then set ACADEMY_SHOPIFY_ENABLED=true.",
      blocking: checkoutProvider !== "ghl",
    },
    {
      key: "ghl-payments",
      group: "purchases",
      label: "GHL checkout with Stripe",
      state:
        checkoutProvider === "ghl"
          ? input.ghlPaymentsConfigured
            ? "ready"
            : "missing"
          : input.ghlPaymentsConfigured
            ? "partial"
            : "off",
      detail:
        checkoutProvider === "ghl"
          ? input.ghlPaymentsConfigured
            ? "Checkout provider is GHL; payment readback configured"
            : "Checkout provider is GHL but the payment readback is not configured, so no new ticket can be verified"
          : input.ghlPaymentsConfigured
            ? "Configured but ACADEMY_CHECKOUT_PROVIDER still points at Shopify"
            : "Off: Shopify is the checkout provider",
      action:
        "Per docs/ghl-payments.md: private integration token and location, connected Stripe acct_ id, a 32+ character payment webhook secret, ACADEMY_GHL_TICKET_PRICES_JSON, checkout links and hosts; then ACADEMY_GHL_PAYMENTS_ENABLED=true and ACADEMY_CHECKOUT_PROVIDER=ghl after one real $22 purchase verifies end to end.",
      blocking: checkoutProvider === "ghl",
    },
    {
      key: "email-tickets",
      group: "purchases",
      label: "Tickets by purchase email (no code)",
      state: emailTicketsOn ? (programmeEnd && !twoConfirmations ? "ready" : "partial") : "off",
      detail: emailTicketsOn
        ? twoConfirmations
          ? "Both the purchase confirmation and the access-code email are on: purchasers would get two emails"
          : programmeEnd
            ? `New paid orders become tickets the purchaser activates at /redeem. Open-ended tiers: ${openTiers.length ? openTiers.join(", ") : "none"}${input.timedTiers.length ? `; timed by purchase code: ${input.timedTiers.join(", ")}` : ""}`
            : has(env, "ACADEMY_ACCELERATOR_ENDS_AT")
              ? "ACADEMY_ACCELERATOR_ENDS_AT is not an explicit ISO timestamp with timezone; Accelerator lines are skipped"
              : "On for Summit tiers; Accelerator lines skipped until ACADEMY_ACCELERATOR_ENDS_AT is set"
        : "Off: purchases would wait for access codes and ACADEMY_ACCESS_TERMS_JSON",
      action: twoConfirmations
        ? "Keep one confirmation path: leave ACADEMY_ACCESS_EMAIL_ENABLED off while ACADEMY_EMAIL_TICKETS_ENABLED is on."
        : "Set ACADEMY_EMAIL_TICKETS_ENABLED=true and ACADEMY_ACCELERATOR_ENDS_AT to the programme end with a timezone (e.g. 2026-12-31T23:59:59-05:00). Decide per tier whether access is open-ended (ticket) or a rolling term (add the tier to ACADEMY_ACCESS_TERMS_JSON and it switches to the purchase-code path).",
      blocking: true,
    },
    {
      key: "email-proof",
      group: "purchases",
      label: "Purchase-email verification (activation gate)",
      state: on(env, "ACADEMY_EMAIL_TICKET_LINKS_ENABLED")
        ? has(env, "RATE_LIMIT_HMAC_SECRET")
          ? "ready"
          : "partial"
        : "missing",
      detail: on(env, "ACADEMY_EMAIL_TICKET_LINKS_ENABLED")
        ? has(env, "RATE_LIMIT_HMAC_SECRET")
          ? "Verification links on; the Auth email templates cannot be checked from here, so prove one in your own inbox"
          : "Verification links on but RATE_LIMIT_HMAC_SECRET is missing, so the callback refuses"
        : "Off: nobody can activate a ticket, historical or new, until purchase emails can be verified",
      action:
        "In Supabase Auth: turn on Confirm email (no auto-confirm), set the Site URL and allow the /join redirect, and change the Confirm signup and Magic Link templates to the token_hash link in docs/email-ticket-activation.md. Then set ACADEMY_EMAIL_TICKET_LINKS_ENABLED=true and verify one fresh signup and one returning account yourself.",
      blocking: true,
    },
    {
      key: "historical-tickets",
      group: "purchases",
      label: "Imported Summit purchasers",
      state: counts.importedTickets > 0 ? "ready" : "missing",
      detail: `${counts.importedTickets} tickets imported, ${counts.importedClaimed} claimed by a signed-in account`,
      action:
        "Email every imported purchaser: create your account with the purchase email, verify it, then choose Activate my purchased lessons at /redeem.",
      blocking: false,
    },
    {
      key: "ghl",
      group: "messaging",
      label: "GHL sender (welcome, purchase, coaching)",
      state:
        on(env, "ACADEMY_GHL_ENABLED") && input.ghlTransportReady
          ? "ready"
          : input.ghlTransportReady
            ? "partial"
            : "missing",
      detail: input.ghlTransportReady
        ? on(env, "ACADEMY_GHL_ENABLED")
          ? `Enabled, transport: ${ghlTransport === "api" ? "direct GHL API" : "inbound workflow webhook"}`
          : "Transport configured; ACADEMY_GHL_ENABLED is not true"
        : ghlTransport === "api"
          ? "Transport is api but ACADEMY_GHL_PRIVATE_TOKEN or ACADEMY_GHL_LOCATION_ID is missing"
          : "No valid services.leadconnectorhq.com hook URL in ACADEMY_GHL_WEBHOOK_URL",
      action:
        ghlTransport === "api"
          ? "Per docs/ghl-direct-messages.md: private integration token and location, verified ACADEMY_GHL_EMAIL_FROM and an E.164 ACADEMY_GHL_SMS_FROM, apply scripts/enable-ghl-api-message-receipts.sql, then send a test to your own inbox and phone."
          : "In GHL: verify the email action on the inbound workflow, add an SMS action gated on send_sms=true, branch on event_name (webinar_registered, purchase_confirmed, learning_*), and send a test to your own inbox.",
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
