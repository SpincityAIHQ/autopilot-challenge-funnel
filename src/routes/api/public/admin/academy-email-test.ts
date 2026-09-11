import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { hashToken } from "@/lib/access-tokens.server";
import { assertSameOrigin, consumeRateLimit } from "@/lib/rate-limit";
import { NATIVE_EMAIL_TEMPLATES, nativeEmailPurpose, nativeEmailReady, ownerEmailTestReady } from "@/lib/academy-email-transport";

/**
 * Owner-only native email harness.
 *
 * GET  -> renders one registered template as HTML for visual review (no send).
 * POST -> sends exactly one template to the signed-in owner's own address.
 *
 * It never reads, claims or releases the outbox queue, never accepts an
 * arbitrary recipient, and refuses entirely unless the native email gate is on.
 */

const SESSION_COOKIE = "summit_rs";

function noStore(contentType = "application/json"): Headers {
  return new Headers({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
    "content-type": contentType,
  });
}

async function ownerEmail(): Promise<string | null> {
  const owners = (process.env.SUMMIT_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return null;
  const sessionToken = getCookie(SESSION_COOKIE);
  if (!sessionToken || sessionToken.length < 32) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("session_active_scopes", {
    _session_hash: hashToken(sessionToken),
  });
  if (error) return null;
  const buyer: string | undefined = (Array.isArray(data) ? data[0] : null)?.buyer_email;
  if (!buyer || !owners.includes(buyer.toLowerCase())) return null;
  return buyer.toLowerCase();
}

async function guard(request: Request, bucket: string) {
  if (!assertSameOrigin(request)) return { error: new Response("Forbidden", { status: 403, headers: noStore("text/plain") }) };
  const secret = process.env.RATE_LIMIT_HMAC_SECRET ?? "";
  if (!secret) return { error: new Response("Service unavailable", { status: 503, headers: noStore("text/plain") }) };
  const rl = await consumeRateLimit(request, bucket, 10, 60, secret);
  if (!rl.ok) return { error: new Response("Too many requests", { status: 429, headers: noStore("text/plain") }) };
  const owner = await ownerEmail();
  if (!owner) return { error: new Response("Not found", { status: 404, headers: noStore("text/plain") }) };
  return { owner };
}

const templateNames = Object.values(NATIVE_EMAIL_TEMPLATES);
const eventFor = (template: string) =>
  Object.entries(NATIVE_EMAIL_TEMPLATES).find(([, t]) => t === template)?.[0] ?? "";

export const Route = createFileRoute("/api/public/admin/academy-email-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const g = await guard(request, "emailprev");
        if (g.error) return g.error;
        const template = new URL(request.url).searchParams.get("template") ?? "";
        if (!template)
          return new Response(JSON.stringify({ templates: templateNames, nativeReady: nativeEmailReady(), ownerTestReady: ownerEmailTestReady() }), { headers: noStore() });
        if (!templateNames.includes(template))
          return new Response("Not found", { status: 404, headers: noStore("text/plain") });
        const [{ TEMPLATES }, { render }, React] = await Promise.all([
          import("@/lib/email-templates/registry"),
          import("@react-email/render"),
          import("react"),
        ]);
        const entry = (TEMPLATES as Record<string, any>)[template];
        if (!entry) return new Response("Not found", { status: 404, headers: noStore("text/plain") });
        const html = await render(React.createElement(entry.component, entry.previewData ?? {}));
        return new Response(html, { headers: noStore("text/html; charset=utf-8") });
      },
      POST: async ({ request }) => {
        const g = await guard(request, "emailtest");
        if (g.error) return g.error;
        // Independent owner-test gate: inbox proof must NOT require the
        // production customer-dispatch gate to be enabled first.
        if (!ownerEmailTestReady())
          return new Response(JSON.stringify({ sent: false, reason: "owner_test_not_enabled" }), { status: 503, headers: noStore() });
        const verifiedOwner = (process.env.ACADEMY_OWNER_TEST_EMAIL ?? "sebastian@spincityhq.com").trim().toLowerCase();
        if (g.owner !== verifiedOwner)
          return new Response(JSON.stringify({ sent: false, reason: "not_verified_owner" }), { status: 403, headers: noStore() });
        const body = (await request.json().catch(() => null)) as { template?: string; runId?: string } | null;
        const template = body?.template ?? "";
        if (!templateNames.includes(template))
          return new Response(JSON.stringify({ sent: false, reason: "unsupported_template" }), { status: 400, headers: noStore() });
        const runId = /^[A-Za-z0-9_-]{4,64}$/.test(body?.runId ?? "")
          ? body!.runId!
          : new Date().toISOString().slice(0, 10);
        const { TEMPLATES } = await import("@/lib/email-templates/registry");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const entry = (TEMPLATES as Record<string, any>)[template];
        // Recipient is hard-fixed to the verified owner; no caller-supplied
        // address or template data is accepted, and no queue row is touched.
        const result = await sendTemplateEmail(template, verifiedOwner, {
          templateData: entry?.previewData ?? {},
          purpose: nativeEmailPurpose(eventFor(template)),
          idempotencyKey: `owner-test:${runId}:${verifiedOwner}:${template}`,
        });
        // Provider acceptance is not proof of inbox delivery.
        return new Response(
          JSON.stringify({ accepted: result.sent, reason: result.sent ? null : result.reason, evidence: "provider_acceptance_only" }),
          { headers: noStore() },
        );
      },

    },
  },
});
