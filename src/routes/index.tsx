import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { SUMMIT_TITLE, SUMMIT_DESCRIPTION, CANONICAL_HOME_URL } from "@/lib/site-meta";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: SUMMIT_TITLE }, { name: "description", content: SUMMIT_DESCRIPTION }],
    links: [{ rel: "canonical", href: CANONICAL_HOME_URL }],
  }),
  component: Home,
});
function Home() {
  return (
    <AcademyFrame>
      <section className="academy-hero">
        <div>
          <p className="academy-eyebrow">FREE WEBINAR · AUTONOMOUS BUSINESS CREATION</p>
          <h1>
            Your expertise.
            <br />
            Your business.
            <br />
            <em>Your AI team.</em>
          </h1>
          <p className="academy-lead">
            Find the work that keeps coming back to you. Leave with a clear plan for the first job
            your AI team should handle.
          </p>
          <a
            className="academy-button"
            href="/join"
            onClick={(e) => {
              e.preventDefault();
              const p = new URLSearchParams(window.location.search);
              const safe = new URLSearchParams();
              for (const key of [
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_content",
                "utm_term",
                "ref",
              ]) {
                const v = p.get(key);
                if (v) safe.set(key, v.slice(0, 128));
              }
              window.location.assign(`/join${safe.size ? `?${safe}` : ""}`);
            }}
          >
            Join the free webinar
          </a>
          <p className="academy-muted">
            Start free. Learn at your pace. Build around a real business.
          </p>
        </div>
        <div className="academy-hero-media">
          <FunnelVideoSlot
            url={import.meta.env.VITE_ACADEMY_VSL_URL || null}
            label="An invitation from Spin"
            envKey="VITE_ACADEMY_VSL_URL"
            autoplay={false}
          />
          <div className="academy-flight-card">
            <p className="academy-eyebrow">YOUR FIRST FLIGHT PLAN</p>
            <h2>
              One problem.
              <br />
              One useful workflow.
            </h2>
            <ol>
              <li>
                <span>01</span>Diagnose the bottleneck
              </li>
              <li>
                <span>02</span>Give the agent a bounded job
              </li>
              <li>
                <span>03</span>Prove the result
              </li>
            </ol>
            <a href="/class">Explore the free lesson →</a>
          </div>
        </div>
      </section>
      <section className="academy-section">
        <div className="academy-section-heading">
          <p className="academy-eyebrow">LEARN IT. APPLY IT. KEEP IMPROVING.</p>
          <h2>A classroom built around your business.</h2>
        </div>
        <div className="academy-three">
          <article className="academy-card">
            <span className="academy-number">01 / LEARN</span>
            <h3>Understand the work</h3>
            <p>
              Study the lesson, revisit the ideas and identify the decisions that still need your
              judgment.
            </p>
          </article>
          <article className="academy-card">
            <span className="academy-number">02 / PRACTISE</span>
            <h3>Make it concrete</h3>
            <p>
              Use knowledge checks and an activity book to turn a concept into a workflow for your
              own business.
            </p>
          </article>
          <article className="academy-card">
            <span className="academy-number">03 / BUILD</span>
            <h3>Follow your next step</h3>
            <p>
              Keep your notes and progress together. Move into the Summit and Accelerator as your
              implementation grows.
            </p>
          </article>
        </div>
      </section>
      <section className="academy-section academy-callout">
        <div>
          <p className="academy-eyebrow">ALREADY READY TO GO DEEPER?</p>
          <h2>The AI AutoPilot Summit, on demand.</h2>
          <p>
            Explore the main-stage sessions, VIP rooms and Emerald intensive recorded August 29–31,
            2026.
          </p>
        </div>
        <a className="academy-button academy-button-secondary" href="/summit">
          Explore Summit access
        </a>
      </section>
    </AcademyFrame>
  );
}
