import { useEffect, useState } from "react";
import { computeCountdown } from "@/lib/countdown";
import {
  SUMMIT_DAY_1_ISO,
  SUMMIT_DAY_1_END_ISO,
  SUMMIT_DAY_2_ISO,
  SUMMIT_DAY_2_END_ISO,
  VIP_LAB_START_ISO,
  VIP_LAB_END_ISO,
} from "@/lib/challenge-config";

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render neutral placeholder on server / first client paint to avoid mismatch.
  if (now === null) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden>
        {["--", "--", "--", "--"].map((v, i) => (
          <TimeCell key={i} value={v} label={["days", "hrs", "min", "sec"][i]} />
        ))}
      </div>
    );
  }

  const countdown = computeCountdown(now);
  const day1Start = new Date(SUMMIT_DAY_1_ISO).getTime();
  const day1End = new Date(SUMMIT_DAY_1_END_ISO).getTime();
  const day2Start = new Date(SUMMIT_DAY_2_ISO).getTime();
  const day2End = new Date(SUMMIT_DAY_2_END_ISO).getTime();
  const vipStart = new Date(VIP_LAB_START_ISO).getTime();
  const vipEnd = new Date(VIP_LAB_END_ISO).getTime();

  if (countdown.started) {
    if (now >= day1Start && now < day1End) {
      return <LiveStatus>Day 1 is live now — check your NuAmenti access email.</LiveStatus>;
    }
    if (now >= day1End && now < day2Start) {
      return (
        <LiveStatus>
          Day 1 is complete. Day 2 begins Sunday at 1:00 PM Eastern.
        </LiveStatus>
      );
    }
    if (now >= day2Start && now < day2End) {
      return <LiveStatus>Day 2 is live now — check your NuAmenti access email.</LiveStatus>;
    }
    if (now >= day2End && now < vipStart) {
      return (
        <LiveStatus>
          The main Summit is complete. The VIP Build Lab begins at 4:15 PM Eastern.
        </LiveStatus>
      );
    }
    if (now >= vipStart && now < vipEnd) {
      return (
        <LiveStatus>
          The VIP Build Lab is live now — verified VIP buyers should use their access link.
        </LiveStatus>
      );
    }
    return (
      <LiveStatus>
        The Summit has wrapped. Watch your inbox for your resources and next steps.
      </LiveStatus>
    );
  }

  return (
    <div
      className="grid grid-cols-4 gap-2 sm:gap-3"
      aria-label={`Countdown: ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`}
    >
      <TimeCell value={String(countdown.days).padStart(2, "0")} label="days" />
      <TimeCell value={String(countdown.hours).padStart(2, "0")} label="hrs" />
      <TimeCell value={String(countdown.minutes).padStart(2, "0")} label="min" />
      <TimeCell value={String(countdown.seconds).padStart(2, "0")} label="sec" />
    </div>
  );
}

function LiveStatus({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="font-heading text-lg text-[color:var(--emerald-signal)]"
    >
      {children}
    </p>
  );
}

function TimeCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface-raised px-2 py-3 text-center">
      <div className="font-display text-2xl text-foreground tabular-nums sm:text-3xl">
        {value}
      </div>
      <div className="label-mono mt-1">{label}</div>
    </div>
  );
}
