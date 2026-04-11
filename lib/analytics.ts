import { supabaseAdmin } from "./supabase-admin";

// ─── domain list ────────────────────────────────────────────────────────────

const WELLBEING_DOMAINS = [
  "sleep_quality",
  "physical_fatigue",
  "mental_focus",
  "motivation",
  "mood",
  "stress",
  "diet_quality",
] as const;

type Domain = (typeof WELLBEING_DOMAINS)[number];

// ─── return types ────────────────────────────────────────────────────────────

export type TrendDirection = "up" | "down" | "flat";

export type DomainTrend = {
  domain: Domain;
  average: number;          // rolling average over the full requested window
  last7Avg: number;         // average for the most recent 7 days
  prior7Avg: number;        // average for the 7 days before that
  trend: TrendDirection;
  dataPoints: number;       // number of check-ins in the window
};

export type WellbeingTrendsResult = {
  athleteId: string;
  windowDays: number;
  from: string;             // ISO date
  to: string;               // ISO date
  domains: DomainTrend[];
};

export type RagStatus = "red" | "amber" | "green";

export type RagStatusResult = {
  athleteId: string;
  status: RagStatus;
  domainStatuses: { domain: Domain; average: number; status: RagStatus }[];
  basedOnDays: number;      // how many check-ins contributed
};

export type PowerDataPoint = {
  sessionDate: string;
  powerWatts: number;
  sessionId: string;
};

export type StrengthDataPoint = {
  sessionDate: string;
  maxWeightKg: number;
  sessionId: string;
};

export type ExerciseMetricType = "power" | "weight";

export type ExerciseProgressionPoint = {
  sessionDate: string;
  value: number;
  sessionId: string;
};

export type ExerciseProgression = {
  exerciseName: string;
  metricType: ExerciseMetricType;
  unit: "W" | "kg";
  data: ExerciseProgressionPoint[];
};

export type InjuryFlag = {
  area: string;
  mostRecentDate: string;
  mostRecentPainRating: number;
  daysOngoing: number;      // consecutive days the area appears going back from most recent
  occurrences: { date: string; painRating: number }[];
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function isoDateDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function trendDirection(last7: number, prior7: number): TrendDirection {
  const delta = last7 - prior7;
  if (delta > 0.3) return "up";
  if (delta < -0.3) return "down";
  return "flat";
}

function domainRag(average: number): RagStatus {
  if (average < 3) return "red";
  if (average < 4) return "amber";
  return "green";
}

// ─── 1. getWellbeingTrends ───────────────────────────────────────────────────

export async function getWellbeingTrends(
  athleteId: string,
  days: number,
): Promise<WellbeingTrendsResult> {
  const from = isoDateDaysAgo(days);
  const to = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("daily_check_in")
    .select(
      "checkin_date, sleep_quality, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality",
    )
    .eq("athlete_id", athleteId)
    .gte("checkin_date", from)
    .lte("checkin_date", to)
    .order("checkin_date", { ascending: true });

  if (error) throw new Error(`getWellbeingTrends: ${error.message}`);

  const rows = data ?? [];

  // Split rows into last-7 and prior-7 windows for trend calculation
  const last7Cutoff = isoDateDaysAgo(7);
  const prior7Cutoff = isoDateDaysAgo(14);

  const last7Rows = rows.filter((r) => r.checkin_date >= last7Cutoff);
  const prior7Rows = rows.filter(
    (r) => r.checkin_date >= prior7Cutoff && r.checkin_date < last7Cutoff,
  );

  const domains: DomainTrend[] = WELLBEING_DOMAINS.map((domain) => {
    const allValues = rows.map((r) => r[domain] as number);
    const last7Values = last7Rows.map((r) => r[domain] as number);
    const prior7Values = prior7Rows.map((r) => r[domain] as number);

    const last7Avg = avg(last7Values);
    const prior7Avg = avg(prior7Values);

    return {
      domain,
      average: avg(allValues),
      last7Avg,
      prior7Avg,
      trend: prior7Values.length > 0 ? trendDirection(last7Avg, prior7Avg) : "flat",
      dataPoints: allValues.length,
    };
  });

  return { athleteId, windowDays: days, from, to, domains };
}

// ─── 2. getRagStatus ────────────────────────────────────────────────────────

export async function getRagStatus(athleteId: string): Promise<RagStatusResult> {
  const cutoff = isoDateDaysAgo(7);

  const { data, error } = await supabaseAdmin
    .from("daily_check_in")
    .select(
      "sleep_quality, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality",
    )
    .eq("athlete_id", athleteId)
    .gte("checkin_date", cutoff)
    .order("checkin_date", { ascending: true });

  if (error) throw new Error(`getRagStatus: ${error.message}`);

  const rows = data ?? [];

  const domainStatuses = WELLBEING_DOMAINS.map((domain) => {
    const values = rows.map((r) => r[domain] as number);
    const average = avg(values);
    return { domain, average, status: domainRag(average) };
  });

  // Overall status: worst individual domain drives the result
  let status: RagStatus = "green";
  for (const d of domainStatuses) {
    if (d.status === "red") { status = "red"; break; }
    if (d.status === "amber") status = "amber";
  }

  return {
    athleteId,
    status,
    domainStatuses,
    basedOnDays: rows.length,
  };
}

// ─── 3. getPowerProgression ──────────────────────────────────────────────────

export async function getPowerProgression(
  athleteId: string,
  exerciseName: string,
): Promise<PowerDataPoint[]> {
  // Join training_session → exercise_set via session_id
  const { data, error } = await supabaseAdmin
    .from("exercise_set")
    .select("power_watts, session_id, training_session!inner(session_date, athlete_id)")
    .eq("training_session.athlete_id", athleteId)
    .ilike("exercise_name", exerciseName)
    .not("power_watts", "is", null)
    .order("training_session(session_date)", { ascending: true });

  if (error) throw new Error(`getPowerProgression: ${error.message}`);

  return (data ?? []).map((row) => {
    const session = Array.isArray(row.training_session)
      ? row.training_session[0]
      : row.training_session;
    return {
      sessionDate: session.session_date,
      powerWatts: row.power_watts as number,
      sessionId: row.session_id,
    };
  });
}

// ─── 4. getStrengthProgression ───────────────────────────────────────────────

export async function getStrengthProgression(
  athleteId: string,
  exerciseName: string,
): Promise<StrengthDataPoint[]> {
  const { data, error } = await supabaseAdmin
    .from("exercise_set")
    .select("weight_kg, session_id, training_session!inner(session_date, athlete_id)")
    .eq("training_session.athlete_id", athleteId)
    .ilike("exercise_name", exerciseName)
    .not("weight_kg", "is", null)
    .order("training_session(session_date)", { ascending: true });

  if (error) throw new Error(`getStrengthProgression: ${error.message}`);

  // Group by session and take the max weight per session
  const sessionMap = new Map<string, { sessionDate: string; maxWeightKg: number }>();

  for (const row of data ?? []) {
    const session = Array.isArray(row.training_session)
      ? row.training_session[0]
      : row.training_session;
    const existing = sessionMap.get(row.session_id);
    const w = row.weight_kg as number;
    if (!existing || w > existing.maxWeightKg) {
      sessionMap.set(row.session_id, { sessionDate: session.session_date, maxWeightKg: w });
    }
  }

  return Array.from(sessionMap.entries())
    .map(([sessionId, val]) => ({ sessionId, ...val }))
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

// ─── 5. getExerciseProgressions ───────────────────────────────────────────────

export async function getExerciseProgressions(
  athleteId: string,
): Promise<ExerciseProgression[]> {
  const { data, error } = await supabaseAdmin
    .from("exercise_set")
    .select("exercise_name, weight_kg, power_watts, session_id, training_session!inner(session_date, athlete_id)")
    .eq("training_session.athlete_id", athleteId)
    .not("exercise_name", "is", null)
    .order("training_session(session_date)", { ascending: true });

  if (error) throw new Error(`getExerciseProgressions: ${error.message}`);

  const progressionMap = new Map<
    string,
    {
      exerciseName: string;
      metricType: ExerciseMetricType;
      unit: "W" | "kg";
      sessionMap: Map<string, ExerciseProgressionPoint>;
    }
  >();

  for (const row of data ?? []) {
    const rawName = (row.exercise_name as string | null)?.trim();
    if (!rawName) continue;

    const normalizedName = rawName.replace(/\s+/g, " ").toLowerCase();
    const session = Array.isArray(row.training_session)
      ? row.training_session[0]
      : row.training_session;

    const hasPower = row.power_watts != null;
    const hasWeight = row.weight_kg != null;
    if (!hasPower && !hasWeight) continue;

    const metricType: ExerciseMetricType = hasPower ? "power" : "weight";
    const unit = metricType === "power" ? "W" : "kg";
    const key = `${normalizedName}::${metricType}`;
    const value = metricType === "power"
      ? (row.power_watts as number)
      : (row.weight_kg as number);

    const existing = progressionMap.get(key) ?? {
      exerciseName: rawName.replace(/\s+/g, " "),
      metricType,
      unit,
      sessionMap: new Map<string, ExerciseProgressionPoint>(),
    };

    const existingPoint = existing.sessionMap.get(row.session_id);
    if (!existingPoint || value > existingPoint.value) {
      existing.sessionMap.set(row.session_id, {
        sessionDate: session.session_date,
        value,
        sessionId: row.session_id,
      });
    }

    progressionMap.set(key, existing);
  }

  return Array.from(progressionMap.values())
    .map((entry) => ({
      exerciseName: entry.exerciseName,
      metricType: entry.metricType,
      unit: entry.unit,
      data: Array.from(entry.sessionMap.values()).sort((a, b) =>
        a.sessionDate.localeCompare(b.sessionDate),
      ),
    }))
    .filter((entry) => entry.data.length > 0)
    .sort((a, b) => {
      if (b.data.length !== a.data.length) return b.data.length - a.data.length;
      return a.exerciseName.localeCompare(b.exerciseName);
    });
}

// ─── 6. getInjuryFlags ───────────────────────────────────────────────────────

export async function getInjuryFlags(athleteId: string): Promise<InjuryFlag[]> {
  const cutoff = isoDateDaysAgo(14);

  const { data, error } = await supabaseAdmin
    .from("daily_check_in")
    .select("checkin_date, injury_area, injury_pain_rating")
    .eq("athlete_id", athleteId)
    .gte("checkin_date", cutoff)
    .not("injury_area", "is", null)
    .gt("injury_pain_rating", 0)
    .order("checkin_date", { ascending: false });

  if (error) throw new Error(`getInjuryFlags: ${error.message}`);

  const rows = data ?? [];

  // Group by injury area
  const areaMap = new Map<
    string,
    { date: string; painRating: number }[]
  >();

  for (const row of rows) {
    const area = row.injury_area as string;
    if (!areaMap.has(area)) areaMap.set(area, []);
    areaMap.get(area)!.push({
      date: row.checkin_date,
      painRating: row.injury_pain_rating as number,
    });
  }

  const flags: InjuryFlag[] = [];

  for (const [area, occurrences] of areaMap.entries()) {
    // occurrences are already sorted descending by date
    const sorted = occurrences.sort((a, b) => b.date.localeCompare(a.date));
    const mostRecent = sorted[0];

    // Count consecutive days from the most recent occurrence going backwards
    let daysOngoing = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
      );
      // Allow 1-day gap (missed check-in) still counts as consecutive
      if (diffDays <= 2) {
        daysOngoing++;
      } else {
        break;
      }
    }

    flags.push({
      area,
      mostRecentDate: mostRecent.date,
      mostRecentPainRating: mostRecent.painRating,
      daysOngoing,
      occurrences: sorted,
    });
  }

  // Sort by most recent date descending, then by pain rating descending
  flags.sort((a, b) => {
    const dateDiff = b.mostRecentDate.localeCompare(a.mostRecentDate);
    if (dateDiff !== 0) return dateDiff;
    return b.mostRecentPainRating - a.mostRecentPainRating;
  });

  return flags;
}
