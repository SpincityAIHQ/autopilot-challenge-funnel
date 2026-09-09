import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { ACCELERATOR_DAYS, ACCELERATOR_OFFER } from "@/lib/academy";
import { useCatalogue } from "@/lib/academy-client";
import { WEEK_ONE } from "@/lib/accelerator-week-one";
export const Route = createFileRoute("/accelerator")({
  head: () => ({ meta: [{ title: "Autopilot Accelerator | AI AutoPilot" }] }),
  component: Accelerator,
});
function Accelerator() {
  const catalogue = useCatalogue();
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
            <p className="academy-price">
              ${ACCELERATOR_OFFER.price.toLocaleString()}
              <small>USD</small>
            </p>
            <a
              className="academy-button"
              href={ACCELERATOR_OFFER.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Purchase your Accelerator seat
            </a>
            <a className="academy-text-button" href="/redeem">
              Already purchased? Redeem your code →
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
          <p className="academy-eyebrow">Week one · build along</p>
          <h2>Day 1 through Day 7.</h2>
          <p>
            Seven days, seven rooms. Day 1 opens the launch, then each day adds the next piece of
            your operating system. Open a day to watch it and work through the steps.
          </p>
        </div>
        <div className="academy-week-one">
          {WEEK_ONE.map((d) => {
            const connected = catalogue ? catalogue.connected.includes(d.lessonId) : false;
            return (
              <article className="academy-card academy-week-day" key={d.lessonId}>
                <span className="academy-number">Day {String(d.day).padStart(2, "0")}</span>
                <h3>{d.title}</h3>
                <p className="academy-muted">
                  {connected ? "Video connected." : "Video slot open — recording coming."}
                </p>
                {d.tasks.length ? (
                  <ul>
                    {d.tasks.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="academy-muted">Spin is posting this day's build steps.</p>
                )}
                {connected ? (
                  <a className="academy-button" href={`/lesson/${d.lessonId}`}>
                    Open the build room
                  </a>
                ) : (
                  <span className="academy-button academy-button-secondary" aria-disabled="true">
                    Recording coming
                  </span>
                )}
              </article>
            );
          })}
        </div>
        <div className="academy-section-heading" style={{ marginTop: 48 }}>
          <p className="academy-eyebrow">Build rooms</p>
          <h2>Every day, recorded and tracked.</h2>
          <p>
            Each day has its own slot. Days light up as recordings are connected. Your watch map
            follows you through all of them.
          </p>
        </div>
        <div className="academy-days">
          {ACCELERATOR_DAYS.map((d) => {
            const connected = catalogue ? catalogue.connected.includes(d.id) : false;
            return (
              <div className="academy-day" key={d.id} data-state={connected ? "ready" : "soon"}>
                <small>{d.stage.replace("Accelerator · ", "")}</small>
                <strong>{d.title.replace("Build room · ", "")}</strong>
                <span>{connected ? "Replay connected" : "Coming soon"}</span>
              </div>
            );
          })}
        </div>
        <p className="academy-muted">
          Replays are available to enrolled students inside My learning after redemption.
        </p>
      </section>
    </AcademyFrame>
  );
}
