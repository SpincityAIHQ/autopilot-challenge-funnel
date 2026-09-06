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
        </div>
      </section>
    </AcademyFrame>
  ),
});
