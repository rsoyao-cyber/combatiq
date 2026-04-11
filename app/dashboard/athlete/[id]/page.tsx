import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getWellbeingTrends,
  getExerciseProgressions,
  getInjuryFlags,
} from "@/lib/analytics";
import { getMondayOfWeek } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot } from "@/lib/training-week-types";
import { GoalEditor } from "./GoalEditor";
import { WellbeingCharts } from "./WellbeingCharts";
import { PerformanceCharts } from "./PerformanceCharts";
import { ReportPanel } from "./ReportPanel";
import { WeekSchedulePanel } from "./WeekSchedulePanel";

// ─── helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-zinc-800 mb-4">{title}</h2>
      {children}
    </section>
  );
}

const RAG_PILL: Record<string, string> = {
  red:   "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ─── page ──────────────────────────────────────────────────────────────────────

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentWeekStart = getMondayOfWeek(new Date());
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const cutoff28 = twentyEightDaysAgo.toISOString().split("T")[0];

  // Fetch everything in parallel
  const [
    athleteResult,
    goalResult,
    checkInsResult,
    trendsResult,
    exerciseProgressionsResult,
    injuryResult,
    sessionsResult,
    weekSnapshotResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("athlete")
      .select("id, name, sport, weight_class, competition_level, training_age_years")
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
        "checkin_date, sleep_quality, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality",
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
  ]);

  if (!athleteResult.data) notFound();

  const athlete = athleteResult.data;
  const goal = goalResult.data?.goal_text ?? "";
  const checkIns = checkInsResult.data ?? [];
  const exerciseProgressions = exerciseProgressionsResult;

  const injuries = injuryResult;
  const sessions = sessionsResult.data ?? [];
  const weekSnapshot = (weekSnapshotResult.data ?? null) as TrainingWeekSnapshot | null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-10">

      {/* ── back link + actions ── */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          ← Squad
        </Link>
        <Link
          href={`/dashboard/import?athleteId=${id}&athleteName=${encodeURIComponent(athlete.name)}`}
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-700 transition-colors"
        >
          Import PDF
        </Link>
      </div>

      {/* ── 1. Profile header ── */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{athlete.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-zinc-500">{athlete.sport}</span>
              <span className="text-zinc-300">·</span>
              <span className="text-sm text-zinc-500">{athlete.weight_class}</span>
              <span className="text-zinc-300">·</span>
              <span className="text-sm text-zinc-500">{athlete.competition_level}</span>
              <span className="text-zinc-300">·</span>
              <span className="text-sm text-zinc-500">{athlete.training_age_years}y training age</span>
            </div>
          </div>

          {/* RAG pill */}
          {trendsResult.domains.length > 0 && (() => {
            const avgLast7 =
              trendsResult.domains.reduce((s, d) => s + d.last7Avg, 0) /
              trendsResult.domains.length;
            const status = avgLast7 < 3 ? "red" : avgLast7 < 4 ? "amber" : "green";
            return (
              <span
                className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm font-semibold ${RAG_PILL[status]}`}
              >
                <span className={`w-2 h-2 rounded-full ${status === "red" ? "bg-red-500" : status === "amber" ? "bg-amber-400" : "bg-emerald-500"}`} />
                {status.toUpperCase()}
              </span>
            );
          })()}
        </div>

        <GoalEditor athleteId={id} initialGoal={goal} monthYear={monthYear} />
      </section>

      {/* ── 2. Wellbeing trends ── */}
      <Section title="Wellbeing trends — last 28 days">
        {checkIns.length === 0 ? (
          <p className="text-sm text-zinc-400">No check-in data in the last 28 days.</p>
        ) : (
          <WellbeingCharts trends={trendsResult.domains} checkIns={checkIns} />
        )}
      </Section>

      {/* ── 3. Training performance ── */}
      <Section title="Training performance">
        <PerformanceCharts progressions={exerciseProgressions} />
      </Section>

      {/* ── 4. Weekly training schedule ── */}
      <Section title="Weekly training schedule">
        <WeekSchedulePanel
          athleteId={id}
          initialSnapshot={weekSnapshot}
          initialWeekStart={currentWeekStart}
        />
      </Section>

      {/* ── 5. Injury log ── */}
      <Section title="Injury log — last 14 days">
        {injuries.length === 0 ? (
          <p className="text-sm text-zinc-400">No injuries reported in the last 14 days.</p>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Area</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pain (0–5)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Most recent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Days ongoing</th>
                </tr>
              </thead>
              <tbody>
                {injuries.map((inj, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-800">{inj.area}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          inj.mostRecentPainRating >= 4
                            ? "text-red-600"
                            : inj.mostRecentPainRating >= 2
                            ? "text-amber-600"
                            : "text-zinc-600"
                        }`}
                      >
                        {inj.mostRecentPainRating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{inj.mostRecentDate}</td>
                    <td className="px-4 py-3 text-zinc-600">{inj.daysOngoing}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── 5. Report generation ── */}
      <Section title="Reports">
        <ReportPanel athleteId={id} />
      </Section>

      {/* ── 6. Session history ── */}
      <Section title="Session history">
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-400">No training sessions recorded.</p>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Workout</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">RPE</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const template = Array.isArray(s.workout_template)
                    ? s.workout_template[0]
                    : s.workout_template;
                  return (
                    <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-3 text-zinc-800 font-medium tabular-nums">{s.session_date}</td>
                      <td className="px-4 py-3 text-zinc-600">{template?.name ?? "Ad hoc"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            s.completed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {s.completed ? "Completed" : "Incomplete"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {s.session_rpe != null ? (
                          <span className="font-semibold">{s.session_rpe}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </div>
  );
}
