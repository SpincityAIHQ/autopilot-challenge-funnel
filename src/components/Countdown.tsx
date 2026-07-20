import { useEffect, useState } from "react";
import { computeCountdown } from "@/lib/countdown";

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

  const c = computeCountdown(now);
  if (c.started) {
    return (
      <p
        role="status"
        className="font-heading text-lg text-[color:var(--emerald-signal)]"
      >
        The live challenge has started.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-4 gap-2 sm:gap-3"
      aria-label={`Countdown: ${c.days} days, ${c.hours} hours, ${c.minutes} minutes, ${c.seconds} seconds`}
    >
      <TimeCell value={String(c.days).padStart(2, "0")} label="days" />
      <TimeCell value={String(c.hours).padStart(2, "0")} label="hrs" />
      <TimeCell value={String(c.minutes).padStart(2, "0")} label="min" />
      <TimeCell value={String(c.seconds).padStart(2, "0")} label="sec" />
    </div>
  );
}

function TimeCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface-raised px-2 py-3 text-center">
      <div className="font-display text-2xl sm:text-3xl text-foreground tabular-nums">
        {value}
      </div>
      <div className="label-mono mt-1">{label}</div>
    </div>
  );
}
