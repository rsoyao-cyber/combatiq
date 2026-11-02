// This week's training load as a bar, with a tick at the athlete's own
// 4-week average. Neutral colour: this shows load, it doesn't judge it.
// `compact` drops the AU figure (for cards that already show it).
export function LoadVsAverage({
  weekLoad,
  avgWeekLoad,
  compact = false,
}: {
  weekLoad: number;
  avgWeekLoad: number | null;
  compact?: boolean;
}) {
  if (avgWeekLoad == null && weekLoad === 0) {
    return <span className="text-sm text-muted-foreground">No sessions logged</span>;
  }

  const scale = Math.max(weekLoad, (avgWeekLoad ?? 0) * 1.5, 1);
  const pct = avgWeekLoad ? Math.round(((weekLoad - avgWeekLoad) / avgWeekLoad) * 100) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
      <div className="relative h-2 w-28 max-w-full shrink rounded-full bg-muted" aria-hidden="true">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${(weekLoad / scale) * 100}%` }} />
        {avgWeekLoad != null && (
          <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ left: `${(avgWeekLoad / scale) * 100}%` }} />
        )}
      </div>
      {(!compact || pct != null) && (
        <span className="text-[13px] tabular-nums whitespace-nowrap">
          {!compact && `${weekLoad.toLocaleString("en-GB")} AU`}
          {pct != null && (
            <span className="text-muted-foreground">{compact ? "" : " · "}{pct > 0 ? "+" : ""}{pct}% vs avg</span>
          )}
        </span>
      )}
    </div>
  );
}
