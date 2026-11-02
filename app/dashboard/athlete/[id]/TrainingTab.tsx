import type { ExerciseProgression, SessionLoadPoint } from "@/lib/analytics";
import type { TrainingWeekSnapshot } from "@/lib/training-week-types";
import type { CheckInRow } from "@/lib/squad";
import { rpeBand, summariseDay } from "@/lib/load";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/dashboard/Panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionLoadChart } from "./SessionLoadChart";
import { WeekSchedulePanel } from "./WeekSchedulePanel";
import { PerformanceCharts } from "./PerformanceCharts";
import type { LoggedSession } from "./OverviewTab";

export type TrainerizeSession = {
  id: string;
  session_date: string;
  session_rpe: number | null;
  completed: boolean | null;
  workout_template: { name: string } | { name: string }[] | null;
};

export function TrainingTab({
  athleteId,
  sessionLoads,
  weekSnapshot,
  weekStart,
  checkIns,
  loggedSessions,
  trainerizeSessions,
  progressions,
  programme,
}: {
  athleteId: string;
  sessionLoads: SessionLoadPoint[];
  weekSnapshot: TrainingWeekSnapshot | null;
  weekStart: string;
  checkIns: CheckInRow[];
  loggedSessions: LoggedSession[];
  trainerizeSessions: TrainerizeSession[];
  progressions: ExerciseProgression[];
  programme: { name: string; weeks: number } | null;
}) {
  const recentDays = [...checkIns].reverse().slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <Panel title="Weekly training load · 8 weeks">
          <SessionLoadChart loads={sessionLoads} />
        </Panel>
        <Panel title="Weekly schedule">
          <WeekSchedulePanel athleteId={athleteId} initialSnapshot={weekSnapshot} initialWeekStart={weekStart} />
        </Panel>
      </div>

      <Panel title="Recent activity · last 7 check-ins">
        {recentDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins in the last 5 weeks.</p>
        ) : (
          <div className="relative overflow-x-auto -mx-5">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>RPE</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead className="pr-5">Mood</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDays.map((c) => {
                  const daySessions = loggedSessions.filter((s) => s.session_date === c.checkin_date);
                  const day = summariseDay(daySessions);
                  return (
                    <TableRow key={c.checkin_date}>
                      <TableCell className="pl-5 font-medium whitespace-nowrap">{shortDate(c.checkin_date)}</TableCell>
                      <TableCell>
                        {day.types.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {day.types.map((t) => (
                              <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{t}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{day.count > 0 ? "Training" : "Rest day"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {day.count > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {daySessions.map((s) => (
                              <span key={s.position} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", rpeBand(s.rpe).className)}>{s.rpe}</span>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {day.count > 0 ? `${day.totalMins} min` : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{day.count > 0 ? `${day.totalLoad} AU` : "—"}</TableCell>
                      <TableCell className="pr-5 text-sm tabular-nums">{c.mood != null ? `${c.mood}/5` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Panel title="Strength & power progressions">
        <PerformanceCharts progressions={progressions} />
      </Panel>

      <Panel
        title="Trainerize sessions"
        action={programme && <span className="text-[13px] text-muted-foreground">{programme.name} · week {programme.weeks}</span>}
      >
        {trainerizeSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Trainerize sessions imported yet.</p>
        ) : (
          <div className="relative overflow-x-auto -mx-5">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Workout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5">RPE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainerizeSessions.map((s) => {
                  const template = Array.isArray(s.workout_template) ? s.workout_template[0] : s.workout_template;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="pl-5 font-medium whitespace-nowrap">{shortDate(s.session_date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{template?.name ?? "Ad hoc"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          s.completed ? "bg-status-ready-bg text-status-ready" : "bg-muted text-muted-foreground",
                        )}>
                          {s.completed ? "Completed" : "Incomplete"}
                        </span>
                      </TableCell>
                      <TableCell className="pr-5 tabular-nums">{s.session_rpe ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
