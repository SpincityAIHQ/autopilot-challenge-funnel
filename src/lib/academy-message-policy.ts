/** Sending permissions are selected from authored event names, never a user payload. */
export function academyMessagePolicy(name: string) {
  const transactional = ["webinar_registered", "webinar_registered_sms", "access_activated", "access_activated_sms", "purchase_access_sms"].includes(name);
  const crmOnly = ["customer_returned", "customer_preferences_updated", "purchase_updated"].includes(name);
  const sms = transactional && name.endsWith("_sms");
  return {
    transactional, crmOnly, sms,
    purpose: crmOnly ? "customer_sync" : transactional ? "transactional" : "optional_learning",
    marketingRequired: !transactional && !crmOnly,
    daytimeRequired: sms || (!transactional && !crmOnly),
  };
}

/** Every event name the queue can hold. Used for pre-claim eligibility. */
export const ACADEMY_OUTBOX_EVENTS = [
  "webinar_registered", "webinar_registered_sms", "webinar_not_started",
  "learning_dropoff", "learning_practice", "learning_feedback", "learning_approved", "learning_stalled",
  "access_activated", "access_activated_sms", "purchase_access_sms",
  "customer_returned", "customer_preferences_updated", "purchase_updated",
] as const;

/**
 * Event names a worker run can actually deliver right now. Filtering BEFORE the
 * claim means unavailable SMS/CRM rows and unauthored native templates consume
 * no attempts and no claim slots, so a due email is never starved behind them.
 */
export function academyClaimableEvents(input: {
  emailVia: "native" | "ghl" | null;
  smsReady: boolean;
  crmReady: boolean;
  nativeSupportsEvent: (name: string) => boolean;
}): string[] {
  return ACADEMY_OUTBOX_EVENTS.filter((name) => {
    const policy = academyMessagePolicy(name);
    if (policy.crmOnly) return input.crmReady;
    if (policy.sms) return input.smsReady;
    if (!input.emailVia) return false;
    return input.emailVia === "ghl" || input.nativeSupportsEvent(name);
  });
}
