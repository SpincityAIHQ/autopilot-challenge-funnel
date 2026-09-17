import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { SUPPORT_TEXT_HREF, SUPPORT_TEXT_NUMBER } from "@/lib/academy";
import { useCatalogue } from "@/lib/academy-client";
import { WEEK_ONE } from "@/lib/accelerator-week-one";
const LAUNCH_DAY = WEEK_ONE[0];
export const Route = createFileRoute("/accelerator")({
  head: () => ({ meta: [{ title: "Autopilot Accelerator | AI AutoPilot" }] }),
  component: Accelerator,
});
function Accelerator() {
  const catalogue = useCatalogue();
  const launchConnected = catalogue
    ? catalogue.connected.includes(LAUNCH_DAY.lessonId)
    : false;
  return (
    <AcademyFrame>
      <section className="academy-section academy-accelerator">
        <p className="academy-eyebrow">Guided implementation · September–December 2026</p>
        <h1>Take your workflow into operation.</h1>
        <p className="academy-lead">
          The Autopilot Accelerator brings your business into group build rooms, practical
          activities and ongoing learning support. Every build room is recorded and tracked, so AI
          Spin can bring you back to the exact moment you need.
        </p>
        <div className="academy-two" style={{ marginTop: 28 }}>
          <div className="academy-card academy-card-featured">
            <p className="academy-eyebrow">What you get</p>
            <h2>The full operating stack</h2>
            <ol className="academy-flight-card" style={{ padding: 0, marginTop: 8 }}>
              <li>
                <span>01</span>Every build-room replay with a watch map
              </li>
              <li>
                <span>02</span>AI Spin text chat and the live AI Spin avatar
              </li>
              <li>
                <span>03</span>1-on-1 time with SpinCity, booked inside the platform
              </li>
              <li>
                <span>04</span>Instructor review of your implementation lab
              </li>
            </ol>
            <p className="academy-price">By invitation</p>
            <a className="academy-button" href={SUPPORT_TEXT_HREF}>
              Text {SUPPORT_TEXT_NUMBER} about the Accelerator
            </a>
            <p className="academy-muted">
              Tell Spin what you are building and whether you want the Accelerator or a 1-on-1
              consultation. No checkout, no card on this site.
            </p>
            <a className="academy-text-button" href="/redeem">
              Already a student? Activate your access →
            </a>
          </div>
          <div className="academy-card academy-card-gold">
            <p className="academy-eyebrow">AI Spin · Accelerator only</p>
            <h2>Meet Spin’s own AI, face to face</h2>
            <p>
              Thoth tutors the public floors. Inside the Accelerator, AI Spin takes over: Spin’s own
              AI in text and a live avatar. It knows your ticket, your job card and where you
              stopped in each build room. Booking a 1-on-1 with SpinCity sits right under the live
              avatar.
            </p>
            <p className="academy-muted">
              AI Spin is an AI representation of Spin. A live avatar session is not a personal call
              with Spin. Session limits are shown before starting.
            </p>
            <div className="academy-actions">
              <a className="academy-button academy-button-secondary" href="/ai-spin">
                Open AI Spin
              </a>
              <a className="academy-text-button" href="/redeem">
                Redeem an Accelerator code →
              </a>
            </div>
          </div>

        </div>
        <div className="academy-section-heading" style={{ marginTop: 48 }}>
          <p className="academy-eyebrow">Your classes</p>
          <h2>Watch them in order.</h2>
          <p>
            Two classes are recorded so far. More build rooms are added here as Spin records them.
          </p>
        </div>
        <div className="academy-week-one">
          <article className="academy-card academy-week-day">
            <span className="academy-number">Class 01</span>
            <h3>{LAUNCH_DAY.title}</h3>
            <p className="academy-muted">
              {launchConnected ? "Video connected." : "Video slot open — recording coming."}
            </p>
            <ul>
              {LAUNCH_DAY.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {launchConnected ? (
              <a className="academy-button" href={`/lesson/${LAUNCH_DAY.lessonId}`}>
                Open the build room
              </a>
            ) : (
              <span className="academy-button academy-button-secondary" aria-disabled="true">
                Recording coming
              </span>
            )}
          </article>
          <article className="academy-card academy-week-day">
            <span className="academy-number">Class 02</span>
            <h3>CEO Calendar, AI Workflows &amp; Client Outreach</h3>
            <p className="academy-muted">Accelerator · September 14, 2026</p>
            <p>
              Turn your calendar into a working operating plan, specify one AI workflow, and
              research your first ten prospects.
            </p>
            <a className="academy-button" href="/lesson/accelerator-2026-09-14">
              Open the class
            </a>
          </article>
        </div>
        <p className="academy-muted">
          Replays are available to enrolled students inside My learning after redemption.
        </p>
      </section>
    </AcademyFrame>
  );
}
