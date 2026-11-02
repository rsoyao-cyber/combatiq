import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { AthleteSnapshot, CheckInRow } from "@/lib/squad";
import type { DomainTrend, SessionLoadPoint } from "@/lib/analytics";
import type { TrainingWeekSnapshot, WeekScheduleJson, SlotIntensity } from "@/lib/training-week-types";
import { rpeBand, summariseDay } from "@/lib/load";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { LoadVsAverage } from "@/components/dashboard/LoadVsAverage";
import { Panel } from "@/components/dashboard/Panel";
import { GoalEditor } from "./GoalEditor";
import { SessionLoadChart } from "./SessionLoadChart";

export type LoggedSession = {
  session_date: string;
  position: number;
  session_types: string[];
  duration_mins: number;
  rpe: number;
  load_au: number;
  sparring_rounds: number | null;
};

const DOMAIN_LABEL: Record<string, string> = {
  sleep_quality: "Sleep",
  physical_fatigue: "Energy",
  mental_focus: "Focus",
  motivation: "Motivation",
  mood: "Mood",
  stress: "Stress (5 = calm)",
  diet_quality: "Diet",
};

const INTENSITY_CHIP: Record<SlotIntensity, string> = {
  high: "bg-status-attention-bg text-status-attention",
  med: "bg-status-monitor-bg text-status-monitor",
  rest: "bg-status-ready-bg text-status-ready",
};

function shiftDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function domainColour(avg: number | null): string {
  if (avg == null) return "text-muted-foreground";
  if (avg < 3) return "text-status-attention";
  if (avg < 4) return "text-status-monitor";
  return "text-status-ready";
}

export function OverviewTab({
  athleteId,
  snapshot,
  goal,
  monthYear,
  sessions,
  weekStart,
  weekSnapshot,
  sessionLoads,
  trends,
  checkIns,
  today,
}: {
  athleteId: string;
  snapshot: AthleteSnapshot;
  goal: string;
  monthYear: string;
  sessions: LoggedSession[];        // last 35 days, oldest first
  weekStart: string;                // Monday of this week
  weekSnapshot: TrainingWeekSnapshot | null;
  sessionLoads: SessionLoadPoint[];
  trends: DomainTrend[];
  checkIns: CheckInRow[];           // last 35 days, oldest first
  today: string;
}) {
  const lastSession = sessions.at(-1) ?? null;
  const lastBand = lastSession ? rpeBand(lastSession.rpe) : null;
  const wellbeingDelta =
    snapshot.wellbeing7d != null && snapshot.wellbeingPrev7d != null
      ? snapshot.wellbeing7d - snapshot.wellbeingPrev7d
      : null;

  // This week: planned slots vs logged sessions, Monday → Sunday
  const plan = (weekSnapshot?.primary_json ?? null) as WeekScheduleJson | null;
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(weekStart, i);
    const day = plan?.days[i];
    const slots = day ? [day.morning, day.afternoon, day.evening].filter((s) => s.label && s.label !== "—") : [];
    const intensity: SlotIntensity | null = slots.length === 0 ? (day ? "rest" : null)
      : slots.some((s) => s.intensity === "high") ? "high"
      : slots.some((s) => s.intensity === "med") ? "med" : "rest";
    const logged = summariseDay(sessions.filter((s) => s.session_date === date));
    return {
      date,
      planned: slots.length ? slots.map((s) => s.label).join(" + ") : day ? "Rest" : "No plan",
      intensity,
      actual: date > today ? null
        : logged.count === 0 ? "Nothing logged"
        : `${logged.count} session${logged.count > 1 ? "s" : ""} · ${logged.totalLoad} AU`,
      isToday: date === today,
    };
  });

  // 14-day series per wellbeing domain for the mini cards
  const days14 = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
  const byDate = new Map(checkIns.map((c) => [c.checkin_date, c]));
  const recentSessions = [...sessions].reverse().slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      {snapshot.reasons.length > 0 && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-status-attention/30 bg-status-attention-bg px-4 py-3">
          <AlertTriangle className="size-[18px] mt-0.5 shrink-0 text-status-attention" aria-hidden="true" />
          <div className="flex flex-col gap-1 text-sm">
            {snapshot.reasons.map((r) => (
              <p key={r.kind} className="text-foreground">
                <span className="font-semibold">{r.label}.</span> <span className="text-muted-foreground">{r.detail}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Wellbeing · 7-day avg"
          value={snapshot.wellbeing7d != null ? snapshot.wellbeing7d.toFixed(1) : "—"}
          unit={snapshot.wellbeing7d != null ? "/ 5" : undefined}
          note={
            wellbeingDelta != null
              ? `${wellbeingDelta >= 0 ? "↑" : "↓"} ${Math.abs(wellbeingDelta).toFixed(1)} vs previous 7 days`
              : snapshot.wellbeing7d == null ? "No check-ins this week" : "No earlier week to compare"
          }
        >
          <Sparkline values={snapshot.wellbeingSeries} width={120} height={28} label="Wellbeing over the last 14 days" />
        </KpiCard>
        <KpiCard
          label="Load this week"
          value={snapshot.weekLoad.toLocaleString("en-GB")}
          unit="AU"
          note={snapshot.avgWeekLoad != null ? `4-week avg ${snapshot.avgWeekLoad.toLocaleString("en-GB")} AU` : "No sessions in the previous 4 weeks"}
        >
          <LoadVsAverage weekLoad={snapshot.weekLoad} avgWeekLoad={snapshot.avgWeekLoad} compact />
        </KpiCard>
        <KpiCard
          label="Weight"
          value={snapshot.weight ?? "—"}
          unit={snapshot.weight != null ? "kg" : undefined}
          note={
            snapshot.weight == null ? "No weigh-in in the last 14 days"
            : snapshot.weightChangePct != null ? `${snapshot.weightChangePct > 0 ? "+" : ""}${snapshot.weightChangePct}% vs a week earlier`
            : "No earlier weigh-in to compare"
          }
        />
        <KpiCard
          label="Last session"
          value={lastSession ? `RPE ${lastSession.rpe}` : "—"}
          note={
            lastSession
              ? `${lastSession.session_types.join(", ") || "Training"} · ${lastSession.duration_mins} min · ${lastSession.load_au} AU · ${shortDate(lastSession.session_date)}`
              : "No sessions logged in 5 weeks"
          }
        >
          {lastBand && (
            <span className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-semibold", lastBand.className)}>{lastBand.label}</span>
          )}
        </KpiCard>
      </div>

      <Panel title={`Goal for ${new Date(`${monthYear}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}`}>
        <GoalEditor athleteId={athleteId} initialGoal={goal} monthYear={monthYear} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
        <Panel title="Weekly training load · 8 weeks" action={<Link href="?tab=training" scroll={false} className="text-[13px] font-semibold text-primary hover:underline underline-offset-4">Training detail →</Link>}>
          <SessionLoadChart loads={sessionLoads} />
        </Panel>
        <Panel title="Wellbeing · 14 days" action={<Link href="?tab=wellbeing" scroll={false} className="text-[13px] font-semibold text-primary hover:underline underline-offset-4">All charts →</Link>}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {trends.map((t) => {
              const series = days14.map((d) => byDate.get(d)?.[t.domain] ?? null);
              return (
                <div key={t.domain} className="rounded-xl border border-border/70 bg-muted/40 p-3 flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold">{DOMAIN_LABEL[t.domain] ?? t.domain}</span>
                    <span className={cn("text-[13px] font-bold tabular-nums", domainColour(t.last7Avg))}>
                      {t.last7Avg != null ? t.last7Avg.toFixed(1) : "—"}
                    </span>
                  </div>
                  <Sparkline values={series} width={140} height={26} label={`${DOMAIN_LABEL[t.domain] ?? t.domain} over 14 days`} />
                </div>
              );
            })}
          </div>
        </Panel>

        </div>

        <div className="flex flex-col gap-5 min-w-0">
        <Panel
          title="This week · plan vs actual"
          action={<Link href="?tab=training" scroll={false} className="text-[13px] font-semibold text-primary hover:underline underline-offset-4">Edit plan</Link>}
        >
          <ul className="flex flex-col">
            {week.map((d) => (
              <li key={d.date} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2.5 py-2 border-t border-border/70 first:border-t-0">
                <span className={cn("text-[13px] font-semibold", d.isToday ? "text-primary" : "text-foreground")}>
                  {shortDate(d.date).split(" ")[0]} {d.date.slice(8).replace(/^0/, "")}
                </span>
                <span className="flex flex-col leading-snug min-w-0">
                  <span className="text-[13px] font-medium truncate">{d.planned}</span>
                  {d.actual && <span className="text-xs text-muted-foreground">{d.actual}</span>}
                </span>
                {d.intensity && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", INTENSITY_CHIP[d.intensity])}>
                    {d.intensity === "med" ? "Med" : d.intensity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent sessions">
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions logged in the last 5 weeks.</p>
          ) : (
            <ul className="flex flex-col">
              {recentSessions.map((s) => {
                const band = rpeBand(s.rpe);
                return (
                  <li key={`${s.session_date}-${s.position}`} className="flex items-center gap-3 py-2 border-t border-border/70 first:border-t-0">
                    <span className={cn("size-8 rounded-[10px] flex items-center justify-center text-sm font-bold tabular-nums", band.className)} aria-label={`RPE ${s.rpe}, ${band.label}`}>
                      {s.rpe}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col leading-snug">
                      <span className="text-[13px] font-semibold truncate">{s.session_types.join(", ") || "Training"}</span>
                      <span className="text-xs text-muted-foreground">
                        {shortDate(s.session_date)} · {s.duration_mins} min{s.sparring_rounds ? ` · ${s.sparring_rounds} rounds` : ""}
                      </span>
                    </span>
                    <span className="text-[13px] tabular-nums text-muted-foreground">{s.load_au} AU</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        </div>
      </div>
    </div>
  );
}
