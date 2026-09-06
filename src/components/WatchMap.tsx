import {
  chapterStatus,
  formatTime,
  mergeIntervals,
  watchSummary,
  type Chapter,
  type Interval,
} from "@/lib/academy";
/**
 * Segmented telemetry bar: watched spans in emerald over the full recording,
 * chapter ticks in gold, and a chapter list that names what was missed.
 * Chapters are optional; the bar alone still shows coverage and the drop-off.
 */
export function WatchMap({
  intervals,
  duration,
  position = 0,
  chapters = [],
  compact = false,
  onSeek,
}: {
  intervals: Interval[];
  duration: number;
  position?: number;
  chapters?: Chapter[];
  compact?: boolean;
  onSeek?: (seconds: number) => void;
}) {
  if (!duration) return null;
  const merged = mergeIntervals(intervals, duration);
  const summary = watchSummary({ intervals, duration, position });
  const rows = chapterStatus(chapters, intervals, duration);
  return (
    <div className={`academy-watchmap ${compact ? "academy-watchmap-compact" : ""}`}>
      <div className="academy-watchmap-head">
        <span className="academy-label">Watch map</span>
        <span className="academy-watchmap-stat">
          <strong>{summary.coverage}%</strong> watched
          {summary.dropOffAt !== null ? (
            <>
              {" "}
              · stopped at <strong>{formatTime(summary.dropOffAt)}</strong>
            </>
          ) : (
            " · complete"
          )}
        </span>
      </div>
      <div
        className="academy-watchmap-track"
        role="img"
        aria-label={`${summary.coverage} percent of the recording watched`}
      >
        {merged.map(([a, b]) => (
          <span
            key={`${a}-${b}`}
            className="academy-watchmap-span"
            style={{ left: `${(100 * a) / duration}%`, width: `${(100 * (b - a)) / duration}%` }}
          />
        ))}
        {chapters.map((c) => (
          <span
            key={c.start}
            className="academy-watchmap-tick"
            style={{ left: `${(100 * c.start) / duration}%` }}
            title={`${formatTime(c.start)} ${c.title}`}
          />
        ))}
        {summary.dropOffAt !== null ? (
          <span
            className="academy-watchmap-cursor"
            style={{ left: `${(100 * summary.dropOffAt) / duration}%` }}
          />
        ) : null}
      </div>
      {!compact && rows.length ? (
        <ol className="academy-chapters">
          {rows.map((c) => (
            <li key={c.start} data-status={c.status}>
              <button type="button" onClick={() => onSeek?.(c.start)} disabled={!onSeek}>
                <span className="academy-chapter-dot" aria-hidden="true" />
                <span className="academy-chapter-time">{formatTime(c.start)}</span>
                <span className="academy-chapter-title">{c.title}</span>
                <span className="academy-chapter-status">
                  {c.status === "watched"
                    ? "Watched"
                    : c.status === "partial"
                      ? `${c.watched}%`
                      : "Missed"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
