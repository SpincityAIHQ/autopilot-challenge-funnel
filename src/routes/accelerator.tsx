import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { ACCELERATOR_DAYS, ACCELERATOR_OFFER } from "@/lib/academy";
import { useCatalogue } from "@/lib/academy-client";
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
            <a className="academy-button" href={ACCELERATOR_OFFER.url}>
              Review programme on Shopify
            </a>
            <a className="academy-text-button" href="mailto:Info@NuAmenti.com">
              Ask about joining the current cohort
            </a>
          </div>
          <div className="academy-card">
            <p className="academy-eyebrow">AI Spin, face to face</p>
            <h2>Meet Spin’s live AI avatar</h2>
            <p>
              Continue from text chat into spoken help from Spin’s AI avatar. It knows your ticket,
              your saved work and where you stopped in each replay.
            </p>
            <p className="academy-muted">
              AI Spin is an AI representation of Spin. A live avatar session is not a personal call
              with Spin. Session limits are shown before starting.
            </p>
            <a className="academy-text-button" href="/ai-spin">
              Open AI Spin →
            </a>
            <hr className="academy-rule" style={{ margin: "22px 0" }} />
            <p className="academy-eyebrow">Already enrolled?</p>
            <p>
              After Shopify payment, redeem your Accelerator access code in your student account.
            </p>
            <div className="academy-actions">
              <a
                className="academy-button academy-button-secondary academy-button-small"
                href="/redeem"
              >
                Redeem an Accelerator code
              </a>
              <a className="academy-text-button" href="/book">
                Book a 1-on-1 →
              </a>
            </div>
          </div>
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
