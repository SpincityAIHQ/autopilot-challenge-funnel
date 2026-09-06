import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
export const Route = createFileRoute("/accelerator")({
  head: () => ({ meta: [{ title: "Autopilot Accelerator | AI AutoPilot" }] }),
  component: () => (
    <AcademyFrame>
      <section className="academy-section academy-accelerator">
        <p className="academy-eyebrow">GUIDED IMPLEMENTATION</p>
        <h1>Take your workflow into operation.</h1>
        <p className="academy-lead">
          The Autopilot Accelerator brings your business into group build rooms, practical
          activities and ongoing learning support.
        </p>
        <div className="academy-card">
          <h2>AI Spin, face to face</h2>
          <p>
            Continue from text chat into live help from Spin’s AI avatar. Accelerator access unlocks
            the avatar experience when connected. Your lesson and saved work guide the conversation.
          </p>
          <p className="academy-muted">
            AI Spin is an AI representation of Spin. A live avatar session is not a personal call
            with Spin. Available session limits are shown before starting.
          </p>
          <a className="academy-text-button" href="/ai-spin">
            Open AI Spin
          </a>
        </div>
        <div className="academy-card">
          <h2>Current programme</h2>
          <p>September–December 2026 · Group implementation · $4,000 USD</p>
          <p>
            Review current cohort availability, start arrangements, access and programme terms
            before enrolling.
          </p>
          <a className="academy-button" href="https://spincityhq.com/products/q4-ai-accelerator">
            Review programme on Shopify
          </a>
          <a className="academy-text-button" href="mailto:Info@NuAmenti.com">
            Ask about joining the current cohort
          </a>
          <p>After Shopify payment, redeem your Accelerator access code in your student account.</p>
          <a className="academy-text-button" href="/redeem">
            Redeem an Accelerator code
          </a>
        </div>
      </section>
    </AcademyFrame>
  ),
});
