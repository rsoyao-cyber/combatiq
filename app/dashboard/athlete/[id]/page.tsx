import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getWellbeingTrends,
  getExerciseProgressions,
  getInjuryFlags,
  getWeightTrends,
  getSessionLoads,
} from "@/lib/analytics";
import { getMondayOfWeek } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot } from "@/lib/training-week-types";
import { GoalEditor } from "./GoalEditor";
import { WellbeingCharts } from "./WellbeingCharts";
import { PerformanceCharts } from "./PerformanceCharts";
import { ReportPanel } from "./ReportPanel";
import { ReportGenerateButtons } from "./ReportGenerateButtons";
import { WeekSchedulePanel } from "./WeekSchedulePanel";
import { WeightChart } from "./WeightChart";
import { SessionLoadChart } from "./SessionLoadChart";
import { CyclePhasePanel } from "./CyclePhasePanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, FileUp } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  unit,
  trend,
  trendUp,
  badge,
  badgeVariant,
}: {
  title: string;
  value: string | number | null;
  unit?: string;
  trend?: string | null;
  trendUp?: boolean;
  badge?: string;
  badgeVariant?: "green" | "amber" | "red";
}) {
  const badgeClasses = {
    green:  "bg-emerald-100 text-emerald-700",
    amber:  "bg-amber-100   text-amber-700",
    red:    "bg-red-100     text-red-700",
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
            {title}
          </p>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
        </div>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-3xl font-bold text-foreground tabular-nums leading-none">
            {value ?? <span className="text-xl text-muted-foreground">—</span>}
          </p>
          {unit && value != null && (
            <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>
          )}
        </div>
        {(trend || badge) && (
          <div className="mt-3 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                  trendUp
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700",
                )}
              >
                {trendUp ? "↑" : "↓"} {trend}
              </span>
            )}
            {badge && badgeVariant && (
              <span
                className={cn(
                  "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                  badgeClasses[badgeVariant],
                )}
              >
                {badge}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── RAG badge maps ──────────────────────────────────────────────────────────

const RAG_BADGE: Record<string, string> = {
  red:   "bg-red-50   text-red-700   border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const RAG_DOT: Record<string, string> = {
  red:   "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const monthYear        = new Date().toISOString().slice(0, 7);
  const currentWeekStart = getMondayOfWeek(new Date());

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const cutoff28 = twentyEightDaysAgo.toISOString().split("T")[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff30 = thirtyDaysAgo.toISOString().split("T")[0];

  // Last 4 Mondays (including current week)
  const last4Mondays = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    return getMondayOfWeek(d);
  });

  const [
    athleteResult,
    goalResult,
    checkInsResult,
    trendsResult,
    exerciseProgressionsResult,
    injuryResult,
    sessionsResult,
    weekSnapshotResult,
    weightTrendsResult,
    sessionLoadsResult,
    lastCycleResult,
    latestProgramResult,
    checkInCount30dResult,
    weekSchedule4wResult,
    reportHistoryResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("athlete")
      .select("id, name, sex, sport, weight_class, competition_level, training_age_years")
      .eq("id", id)
      .single(),

    supabaseAdmin
      .from("monthly_goal")
      .select("goal_text")
      .eq("athlete_id", id)
      .eq("month_year", monthYear)
      .single(),

    supabaseAdmin
      .from("daily_check_in")
      .select(
        "checkin_date, sleep_quality, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality, session_rpe, session_duration_mins",
      )
      .eq("athlete_id", id)
      .gte("checkin_date", cutoff28)
      .order("checkin_date", { ascending: true }),

    getWellbeingTrends(id, 28),
    getExerciseProgressions(id),
    getInjuryFlags(id),

    supabaseAdmin
      .from("training_session")
      .select("id, session_date, session_rpe, completed, workout_template(name)")
      .eq("athlete_id", id)
      .order("session_date", { ascending: false })
      .limit(40),

    supabaseAdmin
      .from("training_week_snapshot")
      .select("*")
      .eq("athlete_id", id)
      .eq("week_start_date", currentWeekStart)
      .maybeSingle(),

    getWeightTrends(id, 8),
    getSessionLoads(id, 8),

    supabaseAdmin
      .from("menstrual_cycle")
      .select("cycle_start_date, cycle_length_days")
      .eq("athlete_id", id)
      .order("cycle_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabaseAdmin
      .from("workout_program")
      .select("start_date, name")
      .eq("athlete_id", id)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Check-in count — last 30 days
    supabaseAdmin
      .from("daily_check_in")
      .select("*", { count: "exact", head: true })
      .eq("athlete_id", id)
      .gte("checkin_date", cutoff30),

    // Week snapshots — last 4 weeks
    supabaseAdmin
      .from("training_week_snapshot")
      .select("week_start_date", { count: "exact", head: true })
      .eq("athlete_id", id)
      .in("week_start_date", last4Mondays),

    // Report history — last 10
    supabaseAdmin
      .from("report_share")
      .select("id, token, report_type, created_at, expires_at, viewed_at")
      .eq("athlete_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!athleteResult.data) notFound();

  const athlete    = athleteResult.data;
  const goal       = goalResult.data?.goal_text ?? "";
  const checkIns   = checkInsResult.data ?? [];
  const injuries   = injuryResult;
  const sessions   = sessionsResult.data ?? [];
  const weekSnapshot = (weekSnapshotResult.data ?? null) as TrainingWeekSnapshot | null;

  const checkInCount30d    = checkInCount30dResult.count ?? 0;
  const weekScheduleCount4w = weekSchedule4wResult.count ?? 0;
  const lastSessionDate    = sessions[0]?.session_date ?? null;
  const reportHistory      = reportHistoryResult.data ?? [];

  // ── RAG ─────────────────────────────────────────────────────────────────────
  const domainsWithData = trendsResult.domains.filter((d) => d.last7Avg != null);
  const avgLast7 =
    domainsWithData.length > 0
      ? domainsWithData.reduce((s, d) => s + (d.last7Avg ?? 0), 0) / domainsWithData.length
      : null;
  const ragStatus = avgLast7 == null ? null : avgLast7 < 3 ? "red" : avgLast7 < 4 ? "amber" : "green";

  // ── Stat strip ───────────────────────────────────────────────────────────────
  const latestWeight = weightTrendsResult.actuals.at(-1) ?? null;
  const sevenDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();
  const weekAgoWeight = [...weightTrendsResult.actuals]
    .reverse()
    .find((a) => a.date <= sevenDaysAgoStr) ?? null;
  const weightChange =
    latestWeight && weekAgoWeight && weekAgoWeight !== latestWeight
      ? latestWeight.weight_kg - weekAgoWeight.weight_kg
      : null;

  const descendingCheckIns = [...checkIns].reverse();
  const lastWithLoad = descendingCheckIns.find(
    (c) => c.session_rpe != null && c.session_duration_mins != null,
  );
  const lastLoad = lastWithLoad
    ? Math.round((lastWithLoad.session_rpe as number) * 2 * (lastWithLoad.session_duration_mins as number))
    : null;
  const lastRpe = descendingCheckIns.find((c) => c.session_rpe != null)?.session_rpe ?? null;
  const rpeVariant =
    lastRpe == null ? undefined
    : lastRpe < 3 ? ("green" as const)
    : lastRpe <= 4 ? ("amber" as const)
    : ("red" as const);

  const programStart = latestProgramResult.data?.start_date ?? null;
  const weeksInProgram = programStart
    ? Math.max(1, Math.floor((Date.now() - new Date(programStart).getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : null;

  // ── Recent activity (last 7 check-ins, descending) ───────────────────────────
  const recentActivity = [...checkIns].reverse().slice(0, 7);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto flex flex-col gap-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-muted-foreground -ml-2 mb-2",
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Squad
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{athlete.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <span>{athlete.sport}</span>
            {athlete.sex && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="capitalize">{athlete.sex}</span>
              </>
            )}
            {athlete.weight_class && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{athlete.weight_class}</span>
              </>
            )}
            {athlete.competition_level && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{athlete.competition_level}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ragStatus && (
            <Badge variant="outline" className={`gap-1.5 font-semibold ${RAG_BADGE[ragStatus]}`}>
              <span className={`w-2 h-2 rounded-full ${RAG_DOT[ragStatus]}`} />
              {ragStatus.toUpperCase()}
            </Badge>
          )}
          <ReportGenerateButtons athleteId={id} />
          <Link
            href={`/dashboard/import?athleteId=${id}&athleteName=${encodeURIComponent(athlete.name)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <FileUp className="w-3.5 h-3.5" /> Import PDF
          </Link>
        </div>
      </div>

      {/* ── Stat strip ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current weight"
          value={latestWeight ? latestWeight.weight_kg : null}
          unit="kg"
          trend={
            weightChange != null
              ? `${Math.abs(weightChange).toFixed(1)} kg vs last week`
              : null
          }
          trendUp={weightChange != null ? weightChange <= 0 : undefined}
        />
        <StatCard
          title="Last session load"
          value={lastLoad}
          unit="AU"
        />
        <StatCard
          title="Last session RPE"
          value={lastRpe}
          badge={
            lastRpe != null
              ? lastRpe < 3 ? "Easy" : lastRpe <= 4 ? "Moderate" : "Hard"
              : undefined
          }
          badgeVariant={rpeVariant}
        />
        <StatCard
          title="Weeks in program"
          value={weeksInProgram}
          unit={weeksInProgram != null ? (weeksInProgram === 1 ? "week" : "weeks") : undefined}
        />
      </div>

      {/* ── Goal editor ───────────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="pt-5">
          <GoalEditor athleteId={id} initialGoal={goal} monthYear={monthYear} />
        </CardContent>
      </Card>

      {/* ── Two-column grid: charts left | schedule right ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-6">

          <Section title="Weight tracking">
            <WeightChart actuals={weightTrendsResult.actuals} targets={weightTrendsResult.targets} />
          </Section>

          <Section title="Training load — last 8 weeks">
            <SessionLoadChart loads={sessionLoadsResult} />
          </Section>

          {athlete.sex === "female" && (
            <Section title="Menstrual cycle">
              <CyclePhasePanel
                lastCycleStart={lastCycleResult.data?.cycle_start_date ?? null}
                cycleLength={lastCycleResult.data?.cycle_length_days ?? 28}
              />
            </Section>
          )}

          <Section title="Wellbeing trends — last 28 days">
            {checkIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-in data in the last 28 days.</p>
            ) : (
              <WellbeingCharts trends={trendsResult.domains} checkIns={checkIns} />
            )}
          </Section>

          <Section title="Training performance">
            <PerformanceCharts progressions={exerciseProgressionsResult} />
          </Section>

          <Section title="Injury log — last 14 days">
            {injuries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No injuries reported in the last 14 days.</p>
            ) : (
              <Card className="shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>Pain (0–5)</TableHead>
                      <TableHead>Most recent</TableHead>
                      <TableHead>Days ongoing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {injuries.map((inj, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{inj.area}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${
                            inj.mostRecentPainRating >= 4 ? "text-red-600"
                            : inj.mostRecentPainRating >= 2 ? "text-amber-600"
                            : "text-foreground"
                          }`}>
                            {inj.mostRecentPainRating}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{inj.mostRecentDate}</TableCell>
                        <TableCell className="text-muted-foreground">{inj.daysOngoing}d</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Section>
        </div>

        {/* Right column: sticky schedule panel */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Section title="Weekly schedule">
            <WeekSchedulePanel
              athleteId={id}
              initialSnapshot={weekSnapshot}
              initialWeekStart={currentWeekStart}
            />
          </Section>
        </div>
      </div>

      {/* ── Recent activity ──────────────────────────────────────────────────── */}
      <Section title="Recent activity — last 7 days">
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-in data in the last 7 days.</p>
        ) : (
          <Card className="shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session type</TableHead>
                  <TableHead>RPE</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Load (AU)</TableHead>
                  <TableHead>Mood</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((c, i) => {
                  const rpe = c.session_rpe as number | null;
                  const dur = c.session_duration_mins as number | null;
                  const load = rpe != null && dur != null ? Math.round(rpe * 2 * dur) : null;
                  const sessionType = rpe != null ? "Training" : "Rest day";
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium tabular-nums text-sm">
                        {c.checkin_date}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sessionType}</TableCell>
                      <TableCell>
                        {rpe != null ? (
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            rpe < 3 ? "bg-emerald-100 text-emerald-700"
                            : rpe <= 4 ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700",
                          )}>
                            {rpe}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dur != null ? `${dur} min` : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {load != null ? load : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {c.mood != null ? (
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            c.mood >= 4 ? "bg-emerald-100 text-emerald-700"
                            : c.mood >= 3 ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700",
                          )}>
                            {c.mood}/5
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </Section>

      {/* ── Session history ───────────────────────────────────────────────────── */}
      <Section title="Session history">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No training sessions recorded.</p>
        ) : (
          <Card className="shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Workout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>RPE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const template = Array.isArray(s.workout_template)
                    ? s.workout_template[0]
                    : s.workout_template;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium tabular-nums text-sm">{s.session_date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{template?.name ?? "Ad hoc"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.completed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {s.completed ? "Completed" : "Incomplete"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.session_rpe != null
                          ? <span className="font-semibold">{s.session_rpe}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </Section>

      {/* ── Reports ───────────────────────────────────────────────────────────── */}
      <Section title="Reports">
        <ReportPanel
          athleteId={id}
          checkInCount30d={checkInCount30d}
          weekScheduleCount4w={weekScheduleCount4w}
          lastSessionDate={lastSessionDate}
          reportHistory={reportHistory}
        />
      </Section>
    </div>
  );
}
