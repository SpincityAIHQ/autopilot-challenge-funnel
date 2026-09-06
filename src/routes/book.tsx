import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AcademyFrame, TicketBadge } from "@/components/AcademyFrame";
import type { Ticket } from "@/lib/academy";
import { academyApi, useAcademySession } from "@/lib/academy-client";
export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a 1-on-1 with SpinCity | AI AutoPilot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Book,
});
type Dashboard = {
  ticket: Ticket;
  booking: { eligible: boolean; configured: boolean; url: string | null; embed: boolean };
};
function Book() {
  const session = useAcademySession();
  return <BookSession key={session.email ?? "anonymous"} session={session} />;
}
function BookSession({ session }: { session: ReturnType<typeof useAcademySession> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session.email)
      academyApi<Dashboard>("dashboard")
        .then(setData)
        .catch((e) => setError(e.message));
  }, [session.email]);
  const booking = data?.booking;
  return (
    <AcademyFrame ticket={data?.ticket}>
      <section className="academy-section academy-accelerator">
        <div className="academy-class-head">
          <div>
            <p className="academy-eyebrow">Accelerator · Included with your ticket</p>
            <h1>Book a 1-on-1 with SpinCity.</h1>
          </div>
          <TicketBadge ticket={data?.ticket} />
        </div>
        <p className="academy-lead">
          Bring one real workflow and one real question. AI Spin handles the lessons; this time is
          for the decisions that need Spin personally.
        </p>
        <p role="status" className="academy-status">
          {error || session.error || (session.loading ? "Loading your account…" : "")}
        </p>
        {!session.loading && !session.email ? (
          <div className="academy-card">
            <p>Sign in with your student account to book.</p>
            <a className="academy-button" href="/join">
              Sign in
            </a>
          </div>
        ) : null}
        {data && !booking?.eligible ? (
          <div className="academy-card academy-card-gold">
            <p className="academy-eyebrow">Accelerator members only</p>
            <h2>1-on-1 time comes with the Autopilot Accelerator.</h2>
            <p>
              Your current ticket is {data.ticket.label}. The Accelerator adds every build-room
              replay, the live AI Spin avatar and booked time with SpinCity.
            </p>
            <div className="academy-actions">
              <a className="academy-button" href="/accelerator">
                Explore the Accelerator
              </a>
              <a className="academy-text-button" href="/redeem">
                Redeem an Accelerator code
              </a>
            </div>
          </div>
        ) : null}
        {booking?.eligible ? (
          booking.url ? (
            <div className="academy-card academy-card-featured">
              <p className="academy-eyebrow">Choose a time</p>
              <h2>Your booking calendar</h2>
              <p>
                Pick a slot that gives you time to prepare. Add your workflow and question to the
                booking notes so the session starts fast.
              </p>
              <a
                className="academy-button"
                href={booking.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the booking calendar
              </a>
              {booking.embed ? (
                <div className="academy-embed">
                  <iframe
                    src={booking.url}
                    title="Book a 1-on-1 with SpinCity"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="academy-card">
              <p className="academy-eyebrow">Almost ready</p>
              <h2>The booking calendar is being connected.</h2>
              <p>
                Email the team with your Accelerator order number and two times that work for you,
                and they will confirm your session.
              </p>
              <a
                className="academy-button academy-button-secondary"
                href="mailto:Info@NuAmenti.com"
              >
                Email Info@NuAmenti.com
              </a>
            </div>
          )
        ) : null}
        <div className="academy-card" style={{ marginTop: 20 }}>
          <p className="academy-eyebrow">Before your session</p>
          <h2>Come prepared. Leave with a decision.</h2>
          <ol className="academy-flight-card" style={{ padding: 0, marginTop: 8 }}>
            <li>
              <span>01</span>Finish the replay AI Spin pointed you to
            </li>
            <li>
              <span>02</span>Bring your job card from the implementation lab
            </li>
            <li>
              <span>03</span>Write the one decision you cannot make alone
            </li>
          </ol>
          <a className="academy-text-button" href="/ai-spin">
            Ask AI Spin what to prepare →
          </a>
        </div>
      </section>
    </AcademyFrame>
  );
}
