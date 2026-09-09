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
