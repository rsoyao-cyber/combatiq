import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getWellbeingTrends, getExerciseProgressions, getInjuryFlags } from "@/lib/analytics";
import type { TrainingWeekSnapshot, WeekScheduleJson, SlotIntensity } from "@/lib/training-week-types";
import { getMondayOfWeek, offsetWeekStart } from "@/lib/training-week-types";
import { GenerateReportSchema } from "@/lib/schemas";
import { rateLimits, getClientIp, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── stat computation (no model arithmetic) ──────────────────────────────────

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round2(n: number | null) {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

function getExerciseTrend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const first = avg(values.slice(0, Math.min(3, values.length)));
  const last = avg(values.slice(-Math.min(3, values.length)));
  const delta = last - first;
  if (delta > 0.01) return "up";
  if (delta < -0.01) return "down";
  return "flat";
}

// ─── route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { success } = await rateLimits.generateReport.limit(getClientIp(request));
  if (!success) return tooManyRequests();

  const body = await request.json();
  const result = GenerateReportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 }
    );
  }

  const { athleteId, reportType } = result.data;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff30 = thirtyDaysAgo.toISOString().split("T")[0];

  // ── 1. Athlete profile ──────────────────────────────────────────────────────
  const { data: athlete, error: athErr } = await supabaseAdmin
    .from("athlete")
    .select("*")
    .eq("id", athleteId)
    .single();

  if (athErr || !athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
  }

  // ── 2. Last 30 days of check-ins ────────────────────────────────────────────
  const { data: checkIns } = await supabaseAdmin
    .from("daily_check_in")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("checkin_date", cutoff30)
    .order("checkin_date", { ascending: true });

  // ── 3. Last 3 training sessions with sets ───────────────────────────────────
  const { data: recentSessions } = await supabaseAdmin
    .from("training_session")
    .select("id, session_date, session_rpe, completed, workout_template(name), exercise_set(*)")
    .eq("athlete_id", athleteId)
    .order("session_date", { ascending: false })
    .limit(3);

  // ── 4. Most recent test session ─────────────────────────────────────────────
  const { data: testSession } = await supabaseAdmin
    .from("test_session")
    .select("session_date, results_json")
    .eq("athlete_id", athleteId)
    .order("session_date", { ascending: false })
    .limit(1)
    .single();

  // ── 5. Training week snapshots (last 5 weeks to cover 30-day window) ────────
  const weekStarts: string[] = [];
  for (let i = 4; i >= 0; i--) {
    weekStarts.push(offsetWeekStart(getMondayOfWeek(new Date()), -i));
  }
  const { data: weekSnapshots } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("*")
    .eq("athlete_id", athleteId)
    .in("week_start_date", weekStarts)
    .order("week_start_date", { ascending: true });

  // ── 5a. Analytics ───────────────────────────────────────────────────────────
  const [trends, exerciseProgressions, injuries] = await Promise.all([
    getWellbeingTrends(athleteId, 30),
    getExerciseProgressions(athleteId),
    getInjuryFlags(athleteId),
  ]);

  // ── 5a. Pre-compute stats ────────────────────────────────────────────────────
  const rows = checkIns ?? [];

  const domainStats = trends.domains.map((d) => ({
    domain: d.domain,
    avg30: round2(d.average),
    avg_last7: round2(d.last7Avg),
    avg_prior7: round2(d.prior7Avg),
    trend: d.trend,
  }));

  // Exercise summaries across all logged exercises
  const exerciseSummaries = exerciseProgressions.map((exercise) => {
    const values = exercise.data.map((point) => point.value);
    return {
      exercise: exercise.exerciseName,
      metric_type: exercise.metricType,
      unit: exercise.unit,
      data_points: values.length,
      first_session_avg: round2(avg(values.slice(0, Math.min(3, values.length)))),
      last_session_avg: round2(avg(values.slice(-Math.min(3, values.length)))),
      delta: round2(
        avg(values.slice(-Math.min(3, values.length))) -
        avg(values.slice(0, Math.min(3, values.length))),
      ),
      peak: round2(Math.max(...values)),
      trend: getExerciseTrend(values),
      latest_session_date: exercise.data[exercise.data.length - 1]?.sessionDate ?? null,
    };
  });

  const powerExercises = exerciseSummaries.filter((e) => e.metric_type === "power");
  const strengthExercises = exerciseSummaries.filter((e) => e.metric_type === "weight");

  // Injury summary
  const injurySummary = injuries.map((inj) => ({
    area: inj.area,
    days_ongoing: inj.daysOngoing,
    most_recent_pain_rating: inj.mostRecentPainRating,
  }));

  // Session RPE average
  const rpeValues = rows.map((r) => r.session_rpe).filter((v): v is number => v !== null);
  const avgRpe = rpeValues.length ? round2(avg(rpeValues)) : null;

  // Nutrition compliance
  const nutritionRows = rows.filter((r) => r.hitting_nutrition_targets !== null);
  const nutritionCompliance = nutritionRows.length
    ? round2(nutritionRows.filter((r) => r.hitting_nutrition_targets).length / nutritionRows.length * 100)
    : null;

  // Sparring load average
  const sparringRows = rows.map((r) => r.sparring_load_rounds).filter((v): v is number => v !== null);
  const avgSparringRounds = sparringRows.length ? round2(avg(sparringRows)) : null;

  // ── 5b. Training week schedule stats ────────────────────────────────────────
  //
  // Summarise slot intensity counts and adherence across the report window so
  // the model can discuss training load distribution without inventing sessions.
  function slotCounts(json: WeekScheduleJson): Record<SlotIntensity, number> {
    const counts: Record<SlotIntensity, number> = { rest: 0, med: 0, high: 0 };
    for (const day of json.days) {
      for (const slot of [day.morning, day.afternoon, day.evening]) {
        const isEmpty = !slot.label || slot.label === "—";
        if (!isEmpty) counts[slot.intensity]++;
      }
    }
    return counts;
  }

  function maxConsecutiveHighDays(json: WeekScheduleJson): number {
    // A day is "high" if any of its non-empty slots has intensity "high"
    let max = 0;
    let run = 0;
    for (const day of json.days) {
      const isHighDay = [day.morning, day.afternoon, day.evening].some(
        (s) => s.intensity === "high" && s.label && s.label !== "—",
      );
      if (isHighDay) { run++; max = Math.max(max, run); } else { run = 0; }
    }
    return max;
  }

  const typedSnapshots = (weekSnapshots ?? []) as TrainingWeekSnapshot[];

  const weekScheduleStats = {
    weeks_in_report_window: weekStarts.length,
    weeks_with_primary_plan: typedSnapshots.filter((s) => s.primary_json).length,
    weeks_with_alternative_submitted: typedSnapshots.filter((s) => s.alternative_json).length,
    weeks: typedSnapshots.map((snap) => {
      const primaryCounts = snap.primary_json ? slotCounts(snap.primary_json) : null;
      const altCounts = snap.alternative_json ? slotCounts(snap.alternative_json as WeekScheduleJson) : null;
      return {
        week_start: snap.week_start_date,
        adherence: snap.adherence ?? null,
        week_notes: snap.week_notes ?? null,
        primary_slot_counts: primaryCounts,
        alternative_slot_counts: altCounts,
        // Flag for consecutive high-intensity days — useful for recovery load monitoring
        primary_max_consecutive_high_days: snap.primary_json
          ? maxConsecutiveHighDays(snap.primary_json)
          : null,
        alternative_max_consecutive_high_days: snap.alternative_json
          ? maxConsecutiveHighDays(snap.alternative_json as WeekScheduleJson)
          : null,
      };
    }),
    // Aggregate totals across all weeks that have a primary plan
    primary_totals: typedSnapshots.reduce(
      (acc, snap) => {
        if (!snap.primary_json) return acc;
        const c = slotCounts(snap.primary_json);
        return { high: acc.high + c.high, med: acc.med + c.med, rest: acc.rest + c.rest };
      },
      { high: 0, med: 0, rest: 0 },
    ),
    alternative_totals: typedSnapshots.reduce(
      (acc, snap) => {
        if (!snap.alternative_json) return acc;
        const c = slotCounts(snap.alternative_json as WeekScheduleJson);
        return { high: acc.high + c.high, med: acc.med + c.med, rest: acc.rest + c.rest };
      },
      { high: 0, med: 0, rest: 0 },
    ),
  };

  // ── 6. Build prompt ─────────────────────────────────────────────────────────
  const stats = {
    athlete: {
      name: athlete.name,
      sport: athlete.sport,
      weight_class: athlete.weight_class,
      competition_level: athlete.competition_level,
      training_age_years: athlete.training_age_years,
    },
    report_period_days: 30,
    checkin_count: rows.length,
    wellbeing_domain_stats: domainStats,
    avg_session_rpe: avgRpe,
    nutrition_compliance_pct: nutritionCompliance,
    avg_sparring_rounds_per_session: avgSparringRounds,
    exercise_coverage: {
      total_tracked_exercises: exerciseSummaries.length,
      power_exercise_count: powerExercises.length,
      strength_exercise_count: strengthExercises.length,
    },
    exercise_summaries: exerciseSummaries,
    active_injuries: injurySummary,
    latest_test_results: testSession?.results_json ?? null,
    training_week_schedule: weekScheduleStats,
    recent_sessions: (recentSessions ?? []).map((s) => ({
      date: s.session_date,
      workout: (Array.isArray(s.workout_template) ? s.workout_template[0] : s.workout_template)?.name ?? "Ad hoc",
      rpe: s.session_rpe,
      set_count: Array.isArray(s.exercise_set) ? s.exercise_set.length : 0,
    })),
  };

  const monthlyPrompt = `You are a sports performance coach writing a monthly review report directly to your athlete.

All statistics have been pre-calculated and are provided below as JSON. Do NOT recalculate any numbers — use them exactly as given.

Wellbeing scale: 0 = very poor, 5 = excellent. RAG: < 3 = red, 3 = amber, >= 4 = green.

Athlete stats:
${JSON.stringify(stats, null, 2)}

Write a monthly performance report in first person, as the coach speaking directly to the athlete (e.g. "I've been tracking your progress...", "I can see your sleep has improved...", "I want you to focus on..."). Return ONLY valid JSON with no preamble and no markdown:

{
  "summary": "2-3 sentence executive summary of the month, written as the coach to the athlete",
  "performance_narrative": {
    "power": "one paragraph on AssaultBike power progression, coach speaking to athlete",
    "strength": "one paragraph on strength training progress, coach speaking to athlete",
    "conditioning": "one paragraph on training load, RPE, and sparring, coach speaking to athlete"
  },
  "wellbeing_summary": "one paragraph covering all wellbeing domains and any notable trends, coach speaking to athlete",
  "strengths": ["string", "string", "string"],
  "development_areas": ["string", "string", "string"],
  "next_steps": ["string", "string", "string", "string", "string"]
}

Rules:
- Write in first person as the coach speaking directly to the athlete throughout. Use "I", "you", "your", "we".
- Never fabricate statistics. Only reference numbers from the stats JSON.
- If data is missing for a section, acknowledge it honestly.
- Use all available exercise_summaries data when describing performance; do not focus on only one exercise unless it is the only one present.
- training_week_schedule contains the planned (primary) and actual (alternative) weekly slot counts and adherence. Use these to comment on training load distribution (high/med/rest balance) and plan adherence. Do NOT invent sessions that are not in the data. If weeks_with_primary_plan is 0, state that no weekly schedule data was recorded.
- Tone: direct, honest, evidence-based. Coach talking to athlete — not a third-party analyst report.
- strengths and development_areas must each be exactly 3 items.
- next_steps must be exactly 5 actionable items, phrased as instructions to the athlete.`;

  const prefightPrompt = `You are a sports performance coach writing a pre-fight readiness report directly to your athlete.

All statistics have been pre-calculated and are provided below as JSON. Do NOT recalculate any numbers — use them exactly as given.

Wellbeing scale: 0 = very poor, 5 = excellent.

Athlete stats:
${JSON.stringify(stats, null, 2)}

Write a pre-fight readiness report in first person, as the coach speaking directly to the athlete (e.g. "I've watched you build through this camp...", "I'm confident you're ready...", "Your numbers tell me..."). This report will be shared with the athlete — it must be positively framed throughout. No deficit language, no development areas, no weaknesses. Return ONLY valid JSON with no preamble and no markdown:

{
  "readiness_statement": "one confident paragraph as the coach speaking to the athlete, summarising their readiness for competition, drawing on wellbeing trends, training load, and recent performance",
  "preparation_highlights": [
    "specific positive data point phrased as coach to athlete",
    "specific positive data point phrased as coach to athlete",
    "specific positive data point phrased as coach to athlete",
    "specific positive data point phrased as coach to athlete"
  ],
  "physical_benchmarks": [
    { "metric": "name of the metric", "value": "the number with unit", "interpretation": "brief positive interpretation as the coach speaking to the athlete about what this means for fight readiness" }
  ],
  "camp_summary": "one closing paragraph as the coach — a confident, personal statement about the camp and the athlete's readiness"
}

Rules:
- Write in first person as the coach speaking directly to the athlete throughout. Use "I", "you", "your", "we".
- Every sentence must be positively framed. Never mention weakness, areas to improve, or deficit.
- Never mention injury details by name. If injuries are present in the data, omit them entirely.
- Never fabricate statistics. Only reference numbers from the stats JSON.
- training_week_schedule contains the planned (primary) and actual (alternative) weekly slot counts. If alternative data is present, you may reference high/med/rest slot totals as evidence of consistent training load. If alternative data is absent, do NOT speculate about what sessions occurred — omit the topic or note that the athlete's logged schedule was not available.
- physical_benchmarks must include every relevant number available from exercise_summaries and wellbeing averages — include as many entries as the data supports, minimum 2.
- preparation_highlights must be exactly 4 items, each referencing a specific data point.
- Tone: confident, personal, affirming. Coach talking directly to the athlete before a fight.`;

  const systemPrompt = reportType === "monthly" ? monthlyPrompt : prefightPrompt;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: systemPrompt }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1) {
    return NextResponse.json({ error: "Model returned malformed JSON", raw: rawText }, { status: 400 });
  }

  try {
    const report = JSON.parse(rawText.slice(start, end + 1));
    const generatedAt = new Date().toISOString();

    // Save to report_share and return the token for the shareable URL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: shareRow, error: shareErr } = await supabaseAdmin
      .from("report_share")
      .insert({
        athlete_id: athleteId,
        report_type: reportType,
        report_json: report,
        expires_at: expiresAt.toISOString(),
      })
      .select("token")
      .single();

    if (shareErr) {
      console.error("Failed to save report share:", shareErr);
    }

    return NextResponse.json({
      report,
      reportType,
      athleteId,
      generatedAt,
      shareToken: shareRow?.token ?? null,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        estimated_cost_usd:
          (message.usage.input_tokens / 1_000_000) * 3 +
          (message.usage.output_tokens / 1_000_000) * 15,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse report JSON", raw: rawText }, { status: 400 });
  }
}
