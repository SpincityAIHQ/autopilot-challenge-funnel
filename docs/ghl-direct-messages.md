# GHL direct messages for SPINXP

SPINXP selects when a message is useful, checks current consent and access, and prepares the welcome, purchase confirmation, or lesson-specific coaching text. GHL remains the contact system and email/SMS sender. Direct API mode sends each claimed channel event independently, avoiding the workflow restriction that one contact cannot re-enter a running workflow.

This is an optional server transport. It is not enabled by merging this code.

## Configuration

Apply `scripts/enable-ghl-api-message-receipts.sql` before enabling the transport. The additive script preserves the two outboxes, their service-role-only access, existing RLS and history. It adds a nullable `provider_receipt` to each outbox.

| Server setting | Meaning |
| --- | --- |
| `ACADEMY_GHL_TRANSPORT=api` | Select direct contact/message API requests. No automatic fallback to a workflow. |
| `ACADEMY_GHL_TRANSPORT=webhook` | Keep the existing inbound workflow. The default remains this legacy mode. |
| `ACADEMY_GHL_PRIVATE_TOKEN` | Private integration token belonging to the configured GHL sub-account; shared with payment verification. |
| `ACADEMY_GHL_LOCATION_ID` | The matching sub-account ID. |
| `ACADEMY_GHL_EMAIL_FROM` | An explicitly configured, verified sender email in this sub-account. |
| `ACADEMY_GHL_SMS_FROM` | A provisioned sending number in E.164 format. A business-profile phone is not a sending number. |
| `ACADEMY_GHL_CONTACT_FIELD_MAP_JSON` | Optional mapping of allowlisted state keys to existing TEXT custom-field IDs in this sub-account. |

Keep `ACADEMY_GHL_ENABLED=false` until live tests are ready. The separate purchase-code queue still requires `ACADEMY_ACCESS_EMAIL_ENABLED=true` and the existing access-code configuration. Learning follow-up still requires its existing learning/Thoth flags; this transport does not turn those on. No sender is inferred from a user profile. Missing email or SMS sender configuration prevents that channel's send.

The private token needs `contacts.readonly`, `contacts.write` and `conversations/message.write`. Add `conversations/message.readonly` if a later receipt reconciliation implementation reads message status. Payment scopes are documented with the GHL commerce adapter. GHL's current [scope reference](https://marketplace.gohighlevel.com/docs/Authorization/Scopes/) lists these separately.

## Identity, suppression and CRM state

The app calls [Upsert Contact](https://marketplace.gohighlevel.com/docs/ghl/contacts/upsert-contact/) with normalized email and location. It excludes phone from this initial call because GHL's location duplicate priority can otherwise select a different contact. The returned email, location and contact ID must match before a present phone is updated by ID. An absent phone is not cleared. It then reads the contact again before each channel send and checks its identity and provider DND.

Global DND and active channel DND suppress a send. Missing global DND or an unrecognized channel status prevents sending until the suppression state can be verified. The adapter never writes `dnd=false`, clears channel suppression, or overrides STOP/unsubscribe. Channel key casing follows the current [DND schema](https://marketplace.gohighlevel.com/docs/webhook/ContactDndUpdate/index.html); lower-case variants are also read conservatively.

Contacts receive event-history tags through [Add Tags](https://marketplace.gohighlevel.com/docs/ghl/contacts/add-tags/), preserving unrelated tags. These record observed events and verified purchases; they are not current entitlement authority. Refunds and programme expiry must always be checked in the app's payment/access state.

Optional custom-field keys are `marketing_consent`, `sms_consent`, `purchase_verified`, `customer_lifecycle`, and `access_tiers`. Map them only to existing TEXT fields by their real IDs. Booleans are `true`/`false` strings; tiers are a JSON array string. Missing values do not erase a previous snapshot, while an explicitly empty access array clears that snapshot. These fields aid segmentation; SPINXP still checks live app consent and access before sending. No workbook answers, quizzes, raw coaching context or access codes are saved to contact fields or tags.

## Dispatch and evidence

The [Send a new message API](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/) receives one channel per request: `type=Email` with `emailFrom`, `emailTo`, `subject` and `message`, or `type=SMS` with `fromNumber`, `toNumber` and `message`. The required request status is `pending`; the app never asserts `delivered`. Message copy remains local to that request and cannot be overwritten by a simultaneous event's contact fields.

Immediately before submission, both queues recheck the relevant app state after GHL contact preparation. A returning learner, changed consent, expired access, redeemed code or newly revoked purchase can cancel a stale message. Existing 48-hour inactivity rules, learner-local daytime checks, optional follow-up limits and Thoth drafting remain in the app.

An API success only becomes `accepted` when the response includes a valid `messageId` and `conversationId`. The sanitized receipt stores those IDs, optional `emailMessageId`, contact ID, channel, HTTP status and evidence category. It does not store a token, webhook URL, email address, message body or the provider's complete response. `accepted` means provider acceptance, not inbox delivery; CRM-only events record `contact_synced` and send no message.

There is no documented idempotency-key contract for this message endpoint. The existing database claims are the duplicate protection: one row is claimed once; accepted, unknown and interrupted rows are not blindly resent. A timeout, non-success response, invalid JSON or missing provider IDs after message submission stays `unknown`. API mode does not retry that POST and does not fall back to the webhook. Staff must reconcile the GHL conversation before authorizing any manual resend. A process interruption after a provider send can still leave an unknown outcome without saved message IDs.

## Required live proof

Before activation, verify the sender and private integration in the actual sub-account, apply the receipt SQL, then send only to the verified owner's test inbox/phone. Confirm the returned IDs against GHL conversations and actual receipt. Prove independent email/SMS, signup welcome, paid activation, returning-customer sync, consent/DND suppression and an intentionally interrupted response. Disable the old inbound send workflow for the new API route; do not feed both transports the same events.

Local verification uses intercepted HTTP and isolated fixture data. It does not prove provider credentials, inbox delivery, SMS provisioning or payment processing. Studio continues to distinguish configuration from completed delivery tests.
