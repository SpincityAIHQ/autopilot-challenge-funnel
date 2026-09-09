import { schedulerAuthorized } from "./academy-scheduler.server";
import { academyDb } from "./academy.server";
import { reconcileShopifyOrder } from "./academy-commerce.server";
import { LESSONS, formatTime, tierAllows, watchSummary, type Interval } from "./academy";
import { redeemedGrants } from "./academy-access.server";
import type { User } from "@supabase/supabase-js";
import { learningDeliveryEligible, learningResumeSeconds, type DeliveryProgress } from "./academy-learning-delivery";
import { composeLearningMessage, composeWelcomeMessage, composeWebinarReminder, composeAccessActivatedMessage, composeAccessCodeMessage, type AcademyMessage } from "./academy-messages";
import { academyMessagePolicy } from "./academy-message-policy";
import { learningMessageWindow } from "./academy-message-window";
import { draftAcademyMessage, type MessageDraftBrief } from "./academy-message-draft.server";
import { lessonContent, scoreAnswers, slotMedia } from "./academy-content.server";
export { learningDeliveryEligible, type DeliveryProgress } from "./academy-learning-delivery";
export async function processAcademyIntegrations(request: Request) {
  if (!(await schedulerAuthorized(request, () => academyDb()))) return new Response("Unauthorized", { status: 401 });
  const db = academyDb();
  let orders = 0,
    accepted = 0,
    unknown = 0;
  const receipts = await db
    .from("academy_commerce_receipts")
    .select("event_id,order_id")
    .eq("status", "pending")
    .order("received_at")
    .limit(20);
  if (receipts.error) throw new Error("DATABASE_UNAVAILABLE");
  for (const orderId of new Set((receipts.data ?? []).map((x) => x.order_id))) {
    try {
      await reconcileShopifyOrder(orderId);
      const ids = receipts.data!.filter((x) => x.order_id === orderId).map((x) => x.event_id);
      const saved = await db
        .from("academy_commerce_receipts")
        .update({ status: "reconciled", processed_at: new Date().toISOString() })
        .in("event_id", ids);
      if (saved.error) throw saved.error;
      orders++;
    } catch {
      /* Durable receipt remains pending. Owner sees it in the integration queue. */
    }
  }
  const { deliverAccessCodes } = await import("./academy-delivery.server");
  const accessDelivery = await deliverAccessCodes();
  if (process.env.ACADEMY_LEARNING_NUDGES_ENABLED === "true") {
    const queued = await db.rpc("academy_queue_learning_nudges");
    if (queued.error) throw new Error("LEARNING_QUEUE_UNAVAILABLE");
  }
  const endpoint = process.env.ACADEMY_GHL_WEBHOOK_URL;
  let allowed = false;
  try {
    const url = new URL(endpoint ?? "");
    allowed =
      url.protocol === "https:" &&
      url.hostname === "services.leadconnectorhq.com" &&
      url.pathname.startsWith("/hooks/");
  } catch {
    /* Not configured. */
  }
  if (process.env.ACADEMY_GHL_ENABLED !== "true" || !allowed)
    return Response.json(
      { orders, accepted, accessDelivery, ghl: "not_enabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  const claimed = await db.rpc("academy_claim_outbox", { p_limit: 10 });
  if (claimed.error) throw new Error("QUEUE_UNAVAILABLE");
  for (const row of claimed.data ?? []) {
    let status = "unknown";
    let deferUntil: string | null = null;
    let holdReason: string | null = null;
    let attempted = false;
    const policy = academyMessagePolicy(row.name);
    try {
      const profile = await db
        .from("academy_profiles")
        .select("email,timezone,marketing_consent,phone,sms_consent")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (profile.error) throw profile.error;
      const localWindow = learningMessageWindow(profile.data?.timezone);
      if (!profile.data?.email || (policy.marketingRequired && !profile.data.marketing_consent) || (policy.sms && (!profile.data.sms_consent || !profile.data.phone))) status = "cancelled";
      else if (policy.daytimeRequired && !localWindow.allowed) {
        status = "pending"; deferUntil = localWindow.deferUntil; holdReason = localWindow.reason;
      } else {
        const [purchases, progress, importedPurchase] = await Promise.all([
          db.from("academy_grants").select("tier").eq("email", profile.data.email).eq("active", true),
          db.from("academy_progress").select("intervals").eq("user_id", row.user_id).eq("lesson_id", "free-webinar").maybeSingle(),
          !row.name.startsWith("learning_")
            ? db.rpc("academy_has_imported_ticket", { p_user: row.user_id })
            : Promise.resolve({ data: false, error: null }),
        ]);
        if (purchases.error || progress.error || importedPurchase.error)
          throw new Error("ELIGIBILITY_UNAVAILABLE");
        const hasVerifiedPurchase = (purchases.data ?? []).length > 0 || importedPurchase.data === true;
        let learningPayload: Record<string, unknown> = {
          purpose: policy.purpose,
          customer_lifecycle: hasVerifiedPurchase ? "returning_customer" : row.name === "customer_returned" ? "returning_learner" : "new_learner",
          purchase_verified: hasVerifiedPurchase,
        };
        let composed: AcademyMessage | null = null;
        let eligible = true;
        let draftBrief: MessageDraftBrief | null = null;
        let evidenceSnapshot: { lessonId: string; updatedAt: string; lastLearningAt: string; mediaVersion: string | null; contentVersion: string | null } | null = null;
        if (row.name.startsWith("learning_")) {
          const lessonId = String(row.payload?.lessonId ?? "");
          const p = await db.from("academy_progress")
            .select("lesson_id,workbook_status,workbook,reviewer_feedback,quiz_score,quiz_total,updated_at,content_version,media_version,intervals,duration,position")
            .eq("user_id", row.user_id).eq("lesson_id", lessonId).maybeSingle();
          if (p.error) throw p.error;
          const lastActivity = await db.from("academy_progress").select("updated_at")
            .eq("user_id", row.user_id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (lastActivity.error) throw lastActivity.error;
          const presence = await db.from("academy_learning_activity").select("last_active_at").eq("user_id", row.user_id).maybeSingle();
          if (presence.error) throw presence.error;
          const latestProgressAt = lastActivity.data?.updated_at ?? p.data?.updated_at ?? "";
          const lastLearningAt = Date.parse(presence.data?.last_active_at ?? "") > Date.parse(latestProgressAt)
            ? presence.data!.last_active_at : latestProgressAt;
          const deliveryProgress = p.data ? { ...p.data, last_learning_activity_at: lastLearningAt } : null;
          const lesson = LESSONS.find((l) => l.id === lessonId);
          const content = lessonContent(lessonId);
          const grants = await redeemedGrants({ id: row.user_id, email: profile.data.email } as User);
          const assistant = grants.includes("accelerator") ? "AI Spin" : "Thoth";
          // Match both queued evidence and currently served content/media. A resumed or
          // replaced recording must not receive an old drop-off reminder.
          const versionMatches = row.name === "learning_dropoff"
            ? Boolean(p.data?.media_version && p.data.media_version === row.payload?.mediaVersion &&
                p.data.media_version === content?.media?.version &&
                Date.parse(p.data.updated_at) === Date.parse(String(row.payload?.progressUpdatedAt ?? "")) &&
                Date.parse(lastLearningAt) === Date.parse(String(row.payload?.lastLearningAt ?? row.payload?.lastLearningActivityAt ?? "")))
            : Boolean(p.data?.content_version && p.data.content_version === row.payload?.contentVersion &&
                p.data.content_version === content?.version);
          eligible = process.env.ACADEMY_LEARNING_NUDGES_ENABLED === "true" &&
            Boolean(lesson && tierAllows(grants, lesson.tier)) && versionMatches &&
            learningDeliveryEligible(row.name, deliveryProgress as DeliveryProgress | null);
          if (eligible && p.data && lesson && content) {
            const watch = p.data.duration ? watchSummary({
              intervals: (p.data.intervals ?? []) as Interval[],
              duration: p.data.duration, position: p.data.position ?? 0,
            }) : null;
            const resume = learningResumeSeconds(p.data as DeliveryProgress);
            let weakPoints: string[] = [];
            if (row.name === "learning_practice") {
              const attempt = await db.from("academy_attempts")
                .select("answers,score,total,content_version")
                .eq("user_id", row.user_id).eq("lesson_id", lessonId)
                .eq("content_version", content.version)
                .order("created_at", { ascending: false }).limit(1).maybeSingle();
              if (attempt.error) throw attempt.error;
              if (attempt.data && attempt.data.score === p.data.quiz_score &&
                  attempt.data.total === p.data.quiz_total && Array.isArray(attempt.data.answers)) {
                const scored = scoreAnswers(lessonId, attempt.data.answers as number[]);
                if (scored.score === attempt.data.score && scored.total === attempt.data.total)
                  weakPoints = scored.feedback.filter((f) => !f.correct).map((f) => f.text);
              }
            }
            // Only authored field labels/hints leave the app; learner workbook text does not.
            const workbook = p.data.workbook as Record<string, unknown> | null;
            const missingActivity = content.workbook.find((f) =>
              typeof workbook?.[f.id] !== "string" || (workbook[f.id] as string).trim().length < 20);
            composed = composeLearningMessage({
              eventName: row.name, assistant, lesson,
              watchedPercent: watch?.coverage ?? 0, resumeSeconds: resume,
              quizScore: p.data.quiz_score, quizTotal: p.data.quiz_total, weakPoints,
              reviewerFeedback: p.data.reviewer_feedback, missingActivity,
              interventionReason: String(row.payload?.interventionReason ?? row.name),
              milestoneLabel: typeof row.payload?.milestoneLabel === "string" ? row.payload.milestoneLabel : null,
            });
            evidenceSnapshot = {
              lessonId, updatedAt: p.data.updated_at, lastLearningAt,
              mediaVersion: p.data.media_version, contentVersion: p.data.content_version,
            };
            draftBrief = { assistant, interventionReason: String(row.payload?.interventionReason ?? row.name), lessonTitle: lesson.title };
            learningPayload = {
              engine: "SPINXP", policy_version: "spinxp-2026-09-09.1", intent: "learning_support", suppress_sales: true,
              intervention_reason: draftBrief.interventionReason,
              milestone_id: row.payload?.milestoneId ?? null,
              milestone_label: row.payload?.milestoneLabel ?? null,
              last_learning_activity_at: lastLearningAt,
              next_action: composed ? { label: composed.action_label, url: composed.action_url } : null,
              assistant, lesson_id: lessonId, lesson_title: lesson.title, lesson_stage: lesson.stage,
              quiz_score: p.data.quiz_score, quiz_total: p.data.quiz_total,
              workbook_status: p.data.workbook_status, watched_percent: watch?.coverage ?? 0,
              stopped_at: resume === null ? null : formatTime(resume), resume_seconds: resume,
              lesson_url: composed?.action_url, evidence_updated_at: p.data.updated_at,
            };
            // A backlog must not become a burst of messages when a paused scheduler resumes.
            // An unknown attempt is included because the provider may already have sent it.
            const threshold = new Date(Date.now() - 86400000).toISOString();
            const recent = await db.from("academy_outbox").select("completed_at,locked_at")
              .eq("user_id", row.user_id).like("name", "learning_%")
              .in("status", ["accepted", "delivered", "unknown"])
              .or(`completed_at.gte.${threshold},and(completed_at.is.null,locked_at.gte.${threshold})`)
              .order("completed_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
            if (recent.error) throw recent.error;
            if (recent.data) {
              const recentAt = Date.parse(recent.data.completed_at ?? recent.data.locked_at);
              if (Number.isFinite(recentAt)) deferUntil = new Date(recentAt + 86400000).toISOString();
            }
          }
        } else if (["webinar_registered", "webinar_registered_sms", "customer_returned", "customer_preferences_updated"].includes(row.name)) {
          const grants = await redeemedGrants({ id: row.user_id, email: profile.data.email } as User);
          composed = composeWelcomeMessage(grants.length > 0, grants.includes("accelerator") ? "AI Spin" : "Thoth", Boolean(slotMedia("free-webinar")));
          learningPayload = { ...learningPayload, access_tiers: grants, suppress_sales: true, intent: policy.crmOnly ? "customer_sync" : "account_confirmation" };
        } else if (["access_activated", "access_activated_sms", "purchase_access_sms"].includes(row.name)) {
          const code = await db.from("academy_access_codes")
            .select("id,generation,order_id,line_id,email,tier,redeemed_by,access_until,redeemed_at,expires_at,code_hash")
            .eq("id", String(row.payload?.codeId ?? "")).maybeSingle();
          if (code.error) throw code.error;
          const c = code.data;
          eligible = Boolean(c && c.email === profile.data.email && c.generation === row.payload?.generation);
          if (eligible && c) {
            await reconcileShopifyOrder(c.order_id);
            const [grant, order, freshCode] = await Promise.all([
              db.from("academy_grants").select("active,email,tier").eq("order_id", c.order_id).eq("line_id", c.line_id).maybeSingle(),
              db.from("academy_orders").select("needs_review,financial_status").eq("order_id", c.order_id).maybeSingle(),
              db.from("academy_access_codes").select("generation,code_hash,email,redeemed_by,redeemed_at,access_until,expires_at").eq("id", c.id).maybeSingle(),
            ]);
            if (grant.error || order.error || freshCode.error) throw new Error("PURCHASE_CHECK_UNAVAILABLE");
            eligible = Boolean(freshCode.data && freshCode.data.generation === c.generation && freshCode.data.code_hash === c.code_hash && freshCode.data.email === c.email && grant.data?.active && grant.data.email === c.email && grant.data.tier === c.tier && order.data && !order.data.needs_review);
            if (eligible && row.name === "purchase_access_sms") {
              eligible = !freshCode.data?.redeemed_at && Date.parse(freshCode.data?.expires_at ?? "") > Date.now();
              if (eligible) {
                const { accessCode, codeHash } = await import("./academy-access.server");
                const value = accessCode(c.id, c.generation, process.env.ACADEMY_ACCESS_CODE_SECRET ?? "");
                eligible = codeHash(value) === c.code_hash;
                if (eligible) composed = composeAccessCodeMessage(c.tier, value, c.expires_at);
              }
            } else if (eligible) {
              eligible = freshCode.data?.redeemed_by === row.user_id && Date.parse(freshCode.data?.access_until ?? "") > Date.now();
              if (eligible) composed = composeAccessActivatedMessage(c.tier, freshCode.data!.access_until);
            }
            learningPayload = { ...learningPayload, purchase_verified: eligible, intent: row.name === "purchase_access_sms" ? "purchase_access_code" : "access_confirmation", suppress_sales: true, order_id: c.order_id, line_id: c.line_id, tier: c.tier, financial_status: order.data?.financial_status };
          }
        } else if (row.name === "purchase_updated") {
          const order = await db.from("academy_orders").select("email,financial_status,needs_review,shopify_updated_at").eq("order_id", String(row.payload?.orderId ?? "")).maybeSingle();
          if (order.error) throw order.error;
          eligible = Boolean(order.data && order.data.email === profile.data.email);
          composed = eligible ? composeWelcomeMessage(false, "Thoth", Boolean(slotMedia("free-webinar"))) : null;
          learningPayload = { ...learningPayload, intent: "purchase_sync", suppress_sales: true, purchase_verified: order.data?.financial_status === "PAID" && !order.data.needs_review, order_id: row.payload?.orderId, financial_status: order.data?.financial_status, needs_review: order.data?.needs_review, order_updated_at: order.data?.shopify_updated_at };

        } else if (row.name === "webinar_not_started") {
          eligible = Boolean(slotMedia("free-webinar")) &&
            (progress.data?.intervals ?? []).length === 0 &&
            (purchases.data ?? []).length === 0 && importedPurchase.data !== true;
          composed = eligible ? composeWebinarReminder() : null;
        } else eligible = false;
        if (!eligible || !composed) status = "cancelled";
        else if (deferUntil) status = "pending";
        else {
          const messageDraft = draftBrief
            ? await draftAcademyMessage(composed, draftBrief, async () => {
                const quota = await db.rpc("academy_tutor_budget", {
                  p_user: row.user_id,
                  p_global_limit: Math.min(Number(process.env.ACADEMY_TUTOR_DAILY_LIMIT) || 100, 1000),
                });
                return !quota.error && quota.data === true;
              })
            : { ...composed, message_origin: "authored_template" as const, generation_state: "authored_welcome" };
          // A model call can take time. Recheck consent, identity, entitlement and saved
          // learning state after drafting and immediately before the outbound request.
          const freshProfile = await db.from("academy_profiles")
            .select("email,marketing_consent,sms_consent,phone,timezone")
            .eq("user_id", row.user_id).maybeSingle();
          if (freshProfile.error) throw freshProfile.error;
          let freshEligible = Boolean(freshProfile.data && freshProfile.data.email === profile.data.email && (!policy.marketingRequired || freshProfile.data.marketing_consent) && (!policy.sms || (freshProfile.data.sms_consent && freshProfile.data.phone)));
          if (evidenceSnapshot && freshEligible) {
            const [freshProgress, freshActivity, freshPresence, freshGrants] = await Promise.all([
              db.from("academy_progress").select("updated_at,media_version,content_version")
                .eq("user_id", row.user_id).eq("lesson_id", evidenceSnapshot.lessonId).maybeSingle(),
              db.from("academy_progress").select("updated_at").eq("user_id", row.user_id)
                .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
              db.from("academy_learning_activity").select("last_active_at").eq("user_id", row.user_id).maybeSingle(),
              redeemedGrants({ id: row.user_id, email: profile.data.email } as User),
            ]);
            if (freshProgress.error || freshActivity.error || freshPresence.error) throw new Error("ELIGIBILITY_UNAVAILABLE");
            const freshLatestAt = Math.max(Date.parse(freshActivity.data?.updated_at ?? "") || 0, Date.parse(freshPresence.data?.last_active_at ?? "") || 0);
            const lesson = LESSONS.find((l) => l.id === evidenceSnapshot!.lessonId);
            freshEligible = Boolean(lesson && tierAllows(freshGrants, lesson.tier) && freshProgress.data &&
              Date.parse(freshProgress.data.updated_at) === Date.parse(evidenceSnapshot.updatedAt) &&
              freshProgress.data.media_version === evidenceSnapshot.mediaVersion &&
              freshProgress.data.content_version === evidenceSnapshot.contentVersion &&
              (row.name !== "learning_dropoff" || freshLatestAt === Date.parse(evidenceSnapshot.lastLearningAt)));
          }
          const freshWindow = learningMessageWindow(freshProfile.data?.timezone);
          if (!freshEligible || !freshProfile.data) {
            status = "cancelled";
          } else if (policy.daytimeRequired && !freshWindow.allowed) {
            status = "pending"; deferUntil = freshWindow.deferUntil; holdReason = freshWindow.reason;
          } else {
          // Preserve exactly what was prepared, including fallback provenance, before
          // submitting it. Unknown outcomes retain the same draft for reconciliation.
          const audit = await db.from("academy_outbox").update({
            payload: { ...row.payload, delivery: { ...learningPayload, ...messageDraft, prepared_at: new Date().toISOString(), channel: policy.crmOnly ? "none" : policy.sms ? "sms" : "email", sms_permitted: Boolean(freshProfile.data.sms_consent) } },
          }).eq("id", row.id).eq("status", "processing").select("id").maybeSingle();
          if (audit.error || !audit.data) throw new Error("MESSAGE_AUDIT_NOT_SAVED");
          attempted = true;
          const response = await fetch(endpoint!, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Academy-Event-Id": row.id, "Idempotency-Key": row.id },
            body: JSON.stringify({
              event_id: row.id, event_name: row.name, user_id: row.user_id,
              email: freshProfile.data.email,
              channel: policy.crmOnly ? "none" : policy.sms ? "sms" : "email",
              send_email: !policy.crmOnly && !policy.sms, send_sms: policy.sms, send_voice: false, voice_call_allowed: false,
              purpose: policy.purpose,
              phone: freshProfile.data.sms_consent ? freshProfile.data.phone : null,
              sms_consent: Boolean(freshProfile.data.sms_consent), timezone: freshProfile.data.timezone,
              marketing_consent: Boolean(freshProfile.data.marketing_consent), consent_version: "academy-marketing-2026-09-06",
              occurred_at: row.created_at, source: "ai-autopilot-academy",
              ...learningPayload, ...(policy.crmOnly ? {} : messageDraft),
            }),
            signal: AbortSignal.timeout(8000),
          });
          // HTTP acceptance proves the inbound workflow received the request. It does
          // not establish that its email/SMS action ran or reached the learner.
          status = response.ok ? "accepted" : "unknown";
          }
        }
      }
    } catch {
      // Only an attempted outbound request has an ambiguous delivery outcome.
      // Recover transient database/preparation failures without inventing acceptance.
      if (!attempted && row.attempts < 3) {
        status = "pending";
        deferUntil = new Date(Date.now() + 5 * 60000).toISOString();
        holdReason = "preparation_unavailable";
      }
    }
    const saved = await db.from("academy_outbox").update({
      status, completed_at: status === "pending" ? null : new Date().toISOString(),
      ...(status === "pending" && deferUntil ? {
        ...(holdReason ? { payload: { ...row.payload, policy_hold: { reason: holdReason, checked_at: new Date().toISOString(), due_at: deferUntil } } } : {}),
        due_at: deferUntil, locked_at: null, attempts: holdReason === "preparation_unavailable" ? row.attempts : Math.max(0, row.attempts - 1),
      } : {}),
    }).eq("id", row.id).eq("status", "processing");
    if (saved.error) throw new Error("QUEUE_RECEIPT_NOT_SAVED");
    if (status === "accepted") accepted++;
    if (status === "unknown") unknown++;
  }
  return Response.json(
    { orders, accepted, unknown, accessDelivery, deliveryEvidence: "webhook_acceptance_only" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

