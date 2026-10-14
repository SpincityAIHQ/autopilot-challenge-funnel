import { createFileRoute } from "@tanstack/react-router";
import { AcademyFrame } from "@/components/AcademyFrame";
import { LESSONS, SUPPORT_TEXT_HREF, SUPPORT_TEXT_NUMBER } from "@/lib/academy";
import { useCatalogue } from "@/lib/academy-client";
import { WEEK_ONE } from "@/lib/accelerator-week-one";
import { AcceleratorNextStep } from "@/components/AcceleratorNextStep";
const LAUNCH_DAY = WEEK_ONE[0];
const REPLAY_CLASSES = [
  ["02", "accelerator-2026-09-14"],
  ["03", "accelerator-2026-09-21"],
  ["04", "accelerator-2026-09-22"],
  ["05", "accelerator-2026-09-28"],
  ["06", "accelerator-class-06"],
  ["07", "accelerator-class-07"],
  ["08", "accelerator-class-08"],
  ["09", "accelerator-class-09"],
] as const;
export const Route = createFileRoute("/accelerator")({
  head: () => ({ meta: [{ title: "Autopilot Accelerator | AI AutoPilot" }] }),
  component: Accelerator,
});
function Accelerator() {
  const catalogue = useCatalogue();
  const launchMeta = catalogue?.lessons.find((lesson) => lesson.id === LAUNCH_DAY.lessonId);
  const launchSource = launchMeta && launchMeta.title !== LESSONS.find((lesson) => lesson.id === LAUNCH_DAY.lessonId)?.title
    ? launchMeta : null;
  const launchConnected = catalogue
    ? catalogue.connected.includes(LAUNCH_DAY.lessonId)
    : false;
  return (
    <AcademyFrame>
      <section className="academy-section academy-accelerator">
        <p className="academy-eyebrow">Accelerator classroom · September–December 2026</p>
        <h1>Welcome to the Accelerator.</h1>
        <div className="academy-week-one">
          <article className="academy-card academy-week-day">
            <span className="academy-number">Class 01</span>
            <h3>{launchSource?.title ?? LAUNCH_DAY.title}</h3>
            {launchSource ? <p className="academy-muted">{launchSource.stage}</p> : null}
            {catalogue?.transcripts ? (
              <p className="academy-muted">
                {catalogue.transcripts.includes(LAUNCH_DAY.lessonId)
                  ? "Transcript connected"
                  : "Teaching notes · Spoken transcript pending"}
              </p>
            ) : null}
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
          {REPLAY_CLASSES.map(([number, id]) => {
            const lesson = (catalogue?.lessons ?? LESSONS).find((item) => item.id === id);
            if (!lesson) return null;
            return (
              <article className="academy-card academy-week-day" key={id}>
                <span className="academy-number">Class {number}</span>
                <h3>{lesson.title}</h3>
                <p className="academy-muted">{lesson.stage}</p>
                {catalogue?.transcripts ? (
                  <p className="academy-muted">
                    {catalogue.transcripts.includes(id)
                      ? "Transcript connected"
                      : "Spoken transcript pending"}
                  </p>
                ) : null}
                <p>{lesson.summary}</p>
                <a className="academy-button" href={`/lesson/${id}`}>
                  Open the class
                </a>
              </article>
            );
          })}
        </div>
        <AcceleratorNextStep />
        <div className="academy-actions" style={{ marginTop: 24 }}>
          <a className="academy-text-button" href="/redeem">
            Activate your access →
          </a>
          <a className="academy-text-button" href={SUPPORT_TEXT_HREF}>
            Text {SUPPORT_TEXT_NUMBER} about the Accelerator →
          </a>
        </div>
        <p className="academy-muted">
          Replays are available to enrolled students inside My learning after redemption.
        </p>
      </section>
    </AcademyFrame>
  );
}
