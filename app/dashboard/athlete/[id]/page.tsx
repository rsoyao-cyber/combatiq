import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getWellbeingTrends,
  getExerciseProgressions,
  getInjuryFlags,
  getWeightTrends,
} from "@/lib/analytics";
import { getMondayOfWeek } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot } from "@/lib/training-week-types";
import { GoalEditor } from "./GoalEditor";
import { WellbeingCharts } from "./WellbeingCharts";
import { PerformanceCharts } from "./PerformanceCharts";
import { ReportPanel } from "./ReportPanel";
import { WeekSchedulePanel } from "./WeekSchedulePanel";
import { WeightChart } from "./WeightChart";
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
import { ArrowLeft, FileUp } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const monthYear = new Date().toISOString().slice(0, 7);
  const currentWeekStart = getMondayOfWeek(new Date());
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const cutoff28 = twentyEightDaysAgo.toISOString().split("T")[0];

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
      .select("checkin_date, sleep_quality, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality")
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
  ]);

  if (!athleteResult.data) notFound();

  const athlete = athleteResult.data;
  const goal = goalResult.data?.goal_text ?? "";
  const checkIns = checkInsResult.data ?? [];
  const exerciseProgressions = exerciseProgressionsResult;
  const injuries = injuryResult;
  const sessions = sessionsResult.data ?? [];
  const weekSnapshot = (weekSnapshotResult.data ?? null) as TrainingWeekSnapshot | null;

  const avgLast7 =
    trendsResult.domains.length > 0
      ? trendsResult.domains.reduce((s, d) => s + d.last7Avg, 0) / trendsResult.domains.length
      : null;
  const ragStatus = avgLast7 == null ? null : avgLast7 < 3 ? "red" : avgLast7 < 4 ? "amber" : "green";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-muted-foreground")}>
          <ArrowLeft className="w-4 h-4" /> Squad
        </Link>
        <Link href={`/dashboard/import?athleteId=${id}&athleteName=${encodeURIComponent(athlete.name)}`} className={cn(buttonVariants(), "gap-2")}>
          <FileUp className="w-4 h-4" /> Import PDF
        </Link>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{athlete.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-muted-foreground">{athlete.sport}</span>
                {athlete.sex && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-sm text-muted-foreground capitalize">{athlete.sex}</span>
                  </>
                )}
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm text-muted-foreground">{athlete.weight_class}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm text-muted-foreground">{athlete.competition_level}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm text-muted-foreground">{athlete.training_age_years}y training age</span>
              </div>
            </div>
            {ragStatus && (
              <Badge variant="outline" className={`gap-1.5 font-semibold ${RAG_BADGE[ragStatus]}`}>
                <span className={`w-2 h-2 rounded-full ${RAG_DOT[ragStatus]}`} />
                {ragStatus.toUpperCase()}
              </Badge>
            )}
          </div>
          <GoalEditor athleteId={id} initialGoal={goal} monthYear={monthYear} />
        </CardContent>
      </Card>

      {/* Weight tracking */}
      <Section title="Weight tracking">
        <WeightChart actuals={weightTrendsResult.actuals} targets={weightTrendsResult.targets} />
      </Section>

      {/* Weekly training schedule */}
      <Section title="Weekly training schedule">
        <WeekSchedulePanel
          athleteId={id}
          initialSnapshot={weekSnapshot}
          initialWeekStart={currentWeekStart}
        />
      </Section>

      {/* Wellbeing trends */}
      <Section title="Wellbeing trends — last 28 days">
        {checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-in data in the last 28 days.</p>
        ) : (
          <WellbeingCharts trends={trendsResult.domains} checkIns={checkIns} />
        )}
      </Section>

      {/* Training performance */}
      <Section title="Training performance">
        <PerformanceCharts progressions={exerciseProgressions} />
      </Section>

      {/* Injury log */}
      <Section title="Injury log — last 14 days">
        {injuries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No injuries reported in the last 14 days.</p>
        ) : (
          <Card>
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

      {/* Reports */}
      <Section title="Reports">
        <ReportPanel athleteId={id} />
      </Section>

      {/* Session history */}
      <Section title="Session history">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No training sessions recorded.</p>
        ) : (
          <Card>
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
                  const template = Array.isArray(s.workout_template) ? s.workout_template[0] : s.workout_template;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium tabular-nums">{s.session_date}</TableCell>
                      <TableCell className="text-muted-foreground">{template?.name ?? "Ad hoc"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.completed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground"
                        }>
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
    </div>
  );
}
