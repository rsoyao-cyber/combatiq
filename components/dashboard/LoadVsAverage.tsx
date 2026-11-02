// This week's training load as a bar, with a tick at the athlete's own
// 4-week average. Neutral colour: this shows load, it doesn't judge it.
export function LoadVsAverage({ weekLoad, avgWeekLoad }: { weekLoad: number; avgWeekLoad: number | null }) {
  if (avgWeekLoad == null && weekLoad === 0) {
    return <span className="text-sm text-muted-foreground">No sessions logged</span>;
  }

  const scale = Math.max(weekLoad, (avgWeekLoad ?? 0) * 1.5, 1);
  const pct = avgWeekLoad ? Math.round(((weekLoad - avgWeekLoad) / avgWeekLoad) * 100) : null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-2 w-28 shrink-0 rounded-full bg-muted" aria-hidden="true">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${(weekLoad / scale) * 100}%` }} />
        {avgWeekLoad != null && (
          <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground" style={{ left: `${(avgWeekLoad / scale) * 100}%` }} />
        )}
      </div>
      <span className="text-[13px] tabular-nums whitespace-nowrap">
        {weekLoad.toLocaleString("en-GB")} AU
        {pct != null && (
          <span className="text-muted-foreground"> · {pct > 0 ? "+" : ""}{pct}% vs avg</span>
        )}
      </span>
    </div>
  );
}
