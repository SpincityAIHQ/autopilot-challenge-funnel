import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame, GuideAvatar } from "@/components/AcademyFrame";
import { GUIDES } from "@/lib/academy";
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
          <p className="academy-eyebrow">The AI AutoPilot education experience · by SpinCity</p>
          <h1>
            Your expertise.
            <br />
            Your business.
            <br />
            <em>Your AI team.</em>
          </h1>
          <p className="academy-lead">
            An advanced learning environment built by Spin so his students get the best AI business
            information in the most cutting-edge way. Enjoy both the ingenuity and the wisdom. If
            you are new to AI business automation, start with the free training.
          </p>
          <div className="academy-hero-actions">
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
              Join the free training
            </a>
            <a className="academy-text-button" href="/class">
              Preview the free lesson →
            </a>
          </div>
          <p className="academy-muted">
            Start free. Learn at your pace. Build around a real business.
          </p>
          <div className="academy-path" aria-label="Your path">
            <a href="/class" data-state="active">
              <small>01 · Start</small>
              <strong>Free training</strong>
            </a>
            <a href="/summit">
              <small>02 · Go deeper</small>
              <strong>Summit</strong>
            </a>
            <a href="/accelerator">
              <small>03 · Implement</small>
              <strong>Accelerator</strong>
            </a>
            <a href="/thoth">
              <small>Always on</small>
              <strong>Thoth</strong>
            </a>
          </div>
        </div>
        <div className="academy-hero-media">
          <FunnelVideoSlot
            url={import.meta.env.VITE_ACADEMY_VSL_URL || null}
            label="An invitation from Spin"
            envKey="VITE_ACADEMY_VSL_URL"
            autoplay={false}
          />
          <div className="academy-card academy-flight-card">
            <p className="academy-eyebrow">Your first flight plan</p>
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
            <a className="academy-text-button" href="/class">
              Explore the free lesson →
            </a>
          </div>
        </div>
      </section>
      <section className="academy-section">
        <div
          className="academy-card academy-card-featured academy-holo"
          style={{ marginBottom: 40 }}
        >
          <div className="academy-spin-hero">
            <GuideAvatar guide={GUIDES.thoth} size={96} />
            <div>
              <p className="academy-eyebrow">Meet Thoth · your tutor</p>
              <h2>The moment you create your account, Thoth watches with you.</h2>
              <p>
                Thoth learns you: where you are with learning, where you are with earning, what you
                watched, what you skipped and where you stopped. Then it tweaks your path to fit,
                down to the minute of the video you are asking about. Its job is to make sure you
                succeed here.
              </p>
            </div>
          </div>
        </div>
        <div className="academy-section-heading">
          <p className="academy-eyebrow">Learn it. Apply it. Keep improving.</p>
          <h2>Under every video, three buttons.</h2>
          <p>
            AI Notes with every timed word. An Activity Sheet for your real business. Ask Thoth, who
            knows where you stopped and what comes next for your ticket. Inside the Accelerator,
            Spin’s own AI takes over.
          </p>
        </div>
        <div className="academy-three">
          <article className="academy-card">
            <span className="academy-number">01 / AI Notes</span>
            <h3>Every word, timed</h3>
            <p>
              Search the whole recording, tap any line, and the video jumps there. Key moments show
              what you watched and what you missed.
            </p>
          </article>
          <article className="academy-card">
            <span className="academy-number">02 / Activity Sheet</span>
            <h3>Make it real</h3>
            <p>
              Turn the idea into a job card for your own business, check your decisions, and submit
              it for instructor review. Keep your answers and feed them straight into your own AI so
              it learns how your business runs.
            </p>
          </article>
          <article className="academy-card">
            <span className="academy-number">03 / Ask Thoth</span>
            <h3>Thoth guides you</h3>
            <p>
              Ask about the exact minute you are on. Thoth answers in Spin’s own words, holds you to
              your next step, and shows what your next ticket unlocks.
            </p>
          </article>
        </div>
      </section>
      <section className="academy-section">
        <div className="academy-callout academy-card academy-card-gold">
          <div>
            <p className="academy-eyebrow">Already ready to go deeper?</p>
            <h2>The AI AutoPilot Summit, on demand.</h2>
            <p>
              Explore the main-stage sessions, VIP rooms and Emerald intensive recorded August
              29–31, 2026.
            </p>
          </div>
          <a className="academy-button academy-button-secondary" href="/summit">
            Explore Summit access
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
