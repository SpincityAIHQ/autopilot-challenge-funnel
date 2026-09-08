import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame, GuideAvatar } from "@/components/AcademyFrame";
import { GUIDES } from "@/lib/academy";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { TrainingWaitlistForm } from "@/components/TrainingWaitlistForm";
import { useAcademySession, useCatalogue } from "@/lib/academy-client";
import { SUMMIT_TITLE, SUMMIT_DESCRIPTION, CANONICAL_HOME_URL } from "@/lib/site-meta";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: SUMMIT_TITLE }, { name: "description", content: SUMMIT_DESCRIPTION }],
    links: [{ rel: "canonical", href: CANONICAL_HOME_URL }],
  }),
  component: Home,
});
function Home() {
  const session = useAcademySession();
  const catalogue = useCatalogue();
  const trainingReady = catalogue?.connected.includes("free-webinar") === true;
  const trainingHref = session.email ? "/class" : "/join";
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
            information in the most cutting-edge way.{" "}
            {trainingReady
              ? "The free training is ready when you are."
              : "The free training is being prepared now. Join the list and we will send the access notice when it opens."}
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
        <div className="academy-hero-media">
          <FunnelVideoSlot
            url={import.meta.env.VITE_ACADEMY_VSL_URL || null}
            label="An invitation from Spin"
            envKey="VITE_ACADEMY_VSL_URL"
            autoplay={false}
            alwaysVisible
            placeholderNote="Spin's platform welcome is being recorded."
            placeholderCta={
              trainingReady ? { label: "Start the free training now →", href: trainingHref } : null
            }
          />
          {trainingReady ? (
            <div className="academy-card academy-waitlist">
              <p className="academy-eyebrow">Free training · open now</p>
              <h2>Build the first job for your AI team.</h2>
              <p>
                Create your free account, bring one real business bottleneck and start the lesson.
              </p>
              <a className="academy-button" href={trainingHref}>
                Start the free training
              </a>
            </div>
          ) : (
            <TrainingWaitlistForm />
          )}
        </div>
      </section>
      <section className="academy-section">
        <div className="academy-card academy-card-featured academy-holo">
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
        <div className="academy-callout academy-card academy-card-gold" style={{ marginTop: 40 }}>
          <div>
            <p className="academy-eyebrow">Already with us?</p>
            <h2>Summit and Accelerator students, sign in.</h2>
            <p>
              Sign in with the email you used at checkout, then redeem the private access code sent
              for your purchase.
            </p>
          </div>
          <a className="academy-button academy-button-secondary" href="/join">
            Sign in
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
