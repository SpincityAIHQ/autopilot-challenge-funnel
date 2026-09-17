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
        <p className="academy-eyebrow">Accelerator classroom · September–December 2026</p>
        <h1>Your classes.</h1>
        <p className="academy-lead" style={{ maxWidth: 560 }}>
          Every class is recorded and tracked, so you can pick up exactly where you stopped.
        </p>
        <div className="academy-actions" style={{ marginTop: 16 }}>
          <a className="academy-text-button" href="/redeem">
            Activate your access →
          </a>
          <a className="academy-text-button" href={SUPPORT_TEXT_HREF}>
            Text {SUPPORT_TEXT_NUMBER} about the Accelerator →
          </a>
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
