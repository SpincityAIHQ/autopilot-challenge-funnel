import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame, GuideAvatar } from "@/components/AcademyFrame";
import { GUIDES } from "@/lib/academy";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { academyJoinHref } from "@/lib/academy-navigation";
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
      <section className="academy-hero academy-hero-stacked">
        <div>
          <p className="academy-eyebrow">The AI AutoPilot education experience · by SpinCity</p>
          <h1>
            Your expertise.
            <br />
            Your business.
            <br />
            <em>Your AI team.</em>
          </h1>
        </div>
        <div className="academy-hero-media" id="how-it-works" style={{ scrollMarginTop: 100 }}>
          <p className="academy-eyebrow">How this technology works · by SPINXP.ai</p>
          <h2>Your AI AutoPilot Summit experience.</h2>
          <FunnelVideoSlot
            url={import.meta.env.VITE_ACADEMY_VSL_URL || null}
            label="How SPINXP.ai supports your AI AutoPilot learning experience"
            envKey="VITE_ACADEMY_VSL_URL"
            autoplay={false}
          />
          <p>
            One orientation for the whole platform: start the free training, learn how to use
            your classroom, then explore the Summit, Vault and Accelerator at your own pace.
          </p>
        </div>
        <div>
          <p className="academy-lead">
            Start with one business bottleneck and design the first job your AI team should handle.
            Your free classroom brings the training, AI notes, an activity sheet and Thoth, your
            tutor, into one place. Create your account and take your first step.
          </p>
          <div className="academy-hero-actions">
            <a className="academy-button" href={academyJoinHref("/class")}>
              Start my free training
            </a>
          </div>
          <p className="academy-muted">
            Free account · Save your progress · Explore the Summit when you are ready
          </p>
          <div className="academy-card academy-flight-card">
            <p className="academy-eyebrow">What you'll get in the free training</p>
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
          </div>
        </div>
      </section>

      <section className="academy-section">
        <div className="academy-card academy-card-featured academy-holo">
          <div className="academy-spin-hero">
            <GuideAvatar guide={GUIDES.thoth} size={96} />
            <div>
              <p className="academy-eyebrow">Meet Thoth · your tutor</p>
              <h2>Watch, apply and take your next step.</h2>
              <p>
                Bring one business bottleneck into the classroom. While you are signed in, your
                saved viewing progress, knowledge checks and activity responses give your AI
                guide context. Ask Thoth about the lesson, try an example in your own business,
                and use your dashboard to continue where you left off.
              </p>
            </div>
          </div>
        </div>
        <div className="academy-card" style={{ marginTop: 24 }}>
          <p className="academy-eyebrow">Your progress, your choices</p>
          <h2>Useful support starts with what you choose to share.</h2>
          <p>
            Learning reminders and promotional emails are optional. Turn them off in My account.
            Text messages require separate permission; reply STOP to opt out. Account and purchase
            confirmations are separate from optional follow-up.
          </p>
          <p>
            Keep passwords, customer details and confidential business information out of chats
            and activity responses. AI guidance can make mistakes; check advice before you apply it.
          </p>
          <div className="academy-actions">
            <a className="academy-text-button" href="/learn">My account and email preferences →</a>
            <a className="academy-text-button" href="/privacy">Read the privacy notice →</a>
          </div>
        </div>
        <div className="academy-callout academy-card academy-card-gold" style={{ marginTop: 40 }}>
          <div>
            <p className="academy-eyebrow">Already with us?</p>
            <h2>Summit and Accelerator students, sign in.</h2>
            <p>
              Use your checkout email to find your purchased lessons and access instructions in
              your dashboard.
            </p>
          </div>
          <a className="academy-button academy-button-secondary" href={academyJoinHref("/learn", true)}>
            Sign in
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
