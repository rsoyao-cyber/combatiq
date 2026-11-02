import Link from "next/link";
import { getSquadOverview, type AttentionReason, type SquadAthlete } from "@/lib/squad";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SquadTable, type SquadFilter } from "./SquadTable";
import { checkinLabel } from "@/lib/format";
import { AddAthleteButton } from "./AddAthleteButton";
import { cn } from "@/lib/utils";

export const revalidate = 60; // revalidate every 60s

const REASON_CHIP: Record<AttentionReason["kind"], string> = {
  low_wellbeing: "bg-status-attention-bg text-status-attention",
  ongoing_pain: "bg-status-attention-bg text-status-attention",
  no_checkins: "bg-status-monitor-bg text-status-monitor",
};

function AttentionCard({ athlete }: { athlete: SquadAthlete }) {
  const [top, ...others] = [...athlete.reasons].sort((a, b) => b.severity - a.severity);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", REASON_CHIP[top.kind])}>{top.label}</span>
        {others.map((r) => (
          <span key={r.kind} className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", REASON_CHIP[r.kind])}>{r.label}</span>
        ))}
      </div>
      <span className="text-[15px] font-semibold text-foreground">{athlete.name}</span>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {[top, ...others].map((r) => r.detail).join(" ")}
        {top.kind !== "no_checkins" && ` Last check-in: ${checkinLabel(athlete.daysSinceCheckin).toLowerCase()}.`}
      </p>
      <Link href={`/dashboard/athlete/${athlete.id}`} className="mt-auto text-[13px] font-semibold text-primary hover:underline underline-offset-4">
        Open athlete →
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { today, athletes, kpis } = await getSquadOverview();

  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });

  const attention = athletes
    .filter((a) => a.reasons.length > 0)
    .sort((a, b) =>
      Math.max(...b.reasons.map((r) => r.severity)) - Math.max(...a.reasons.map((r) => r.severity)) ||
      (a.daysSinceCheckin ?? Infinity) - (b.daysSinceCheckin ?? Infinity),
    );
  const shown = attention.slice(0, 6);

  const initialFilter: SquadFilter =
    filter === "attention" || filter === "not_today" ? filter : "all";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-muted-foreground">{dateLabel}</p>
          <h1 className="font-display text-[40px] leading-none font-bold uppercase text-foreground">Squad today</h1>
        </div>
        <AddAthleteButton />
      </div>

      {athletes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No athletes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add an athlete or import a Trainerize PDF to get started.</p>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Checked in today" value={kpis.checkedInToday} unit={`/ ${kpis.total}`}>
              <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(kpis.checkedInToday / kpis.total) * 100}%` }} />
              </div>
            </KpiCard>
            <KpiCard
              label="Need attention"
              value={kpis.attentionCount}
              valueClassName={kpis.attentionCount > 0 ? "text-status-attention" : undefined}
              note={kpis.attentionSummary || "Nothing flagged"}
            />
            <KpiCard
              label="Ongoing pain"
              value={kpis.painCount}
              note={kpis.longestPain ? `Longest: ${kpis.longestPain.area}, ${kpis.longestPain.days} days (${kpis.longestPain.name})` : "No pain reported this week"}
            />
            <KpiCard
              label="Squad wellbeing · 7 days"
              value={kpis.squadWellbeing7d != null ? kpis.squadWellbeing7d.toFixed(1) : "—"}
              unit={kpis.squadWellbeing7d != null ? "/ 5" : undefined}
              note={
                kpis.squadWellbeingDelta != null
                  ? `${kpis.squadWellbeingDelta >= 0 ? "↑" : "↓"} ${Math.abs(kpis.squadWellbeingDelta).toFixed(1)} vs previous 7 days`
                  : "No check-ins this week"
              }
              noteClassName={
                kpis.squadWellbeingDelta == null ? undefined
                : kpis.squadWellbeingDelta >= 0 ? "text-status-ready font-semibold" : "text-status-attention font-semibold"
              }
            />
          </div>

          {/* Needs attention */}
          <section aria-labelledby="attention-heading" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="attention-heading" className="text-[15px] font-bold text-foreground">Needs attention</h2>
              {attention.length > shown.length && (
                <Link href="/dashboard?filter=attention#athletes" className="text-[13px] font-semibold text-primary hover:underline underline-offset-4">
                  +{attention.length - shown.length} more in the table
                </Link>
              )}
            </div>
            {shown.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                Nothing flagged — everyone has checked in recently, wellbeing is steady and no ongoing pain.
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                {shown.map((a) => <AttentionCard key={a.id} athlete={a} />)}
              </div>
            )}
          </section>

          <SquadTable key={initialFilter} athletes={athletes} initialFilter={initialFilter} />
        </>
      )}
    </div>
  );
}
