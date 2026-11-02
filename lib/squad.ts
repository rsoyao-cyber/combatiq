import { supabaseAdmin } from "./supabase-admin";
import { WELLBEING_DOMAINS, domainRag, nullableAvg } from "./analytics";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SquadStatus = "attention" | "monitor" | "ready" | "no_data";

export type AttentionReason = {
  kind: "no_checkins" | "low_wellbeing" | "ongoing_pain";
  label: string;
  detail: string;
  severity: number; // higher = more urgent; used to order the attention cards
};

export type AthleteSnapshot = {
  status: SquadStatus;
  lastCheckinDate: string | null;
  daysSinceCheckin: number | null;
  wellbeing7d: number | null;
  wellbeingSeries: (number | null)[]; // last 14 days, oldest first
  weekLoad: number;                   // this week (Mon–today), AU
  avgWeekLoad: number | null;         // average of the previous 4 weeks, AU
  weight: number | null;
  weightChangePct: number | null;     // vs the last weigh-in ≥7 days earlier
  pain: { area: string; days: number; rating: number } | null;
  reasons: AttentionReason[];
  wellbeingPrev7d: number | null;     // the 7 days before, for the trend
};

export type SquadAthlete = {
  id: string;
  name: string;
  sport: string;
  weightClass: string;
} & AthleteSnapshot;

export type SquadOverview = {
  today: string;
  athletes: SquadAthlete[];
  kpis: {
    total: number;
    checkedInToday: number;
    attentionCount: number;
    attentionSummary: string;
    painCount: number;
    longestPain: { name: string; area: string; days: number } | null;
    squadWellbeing7d: number | null;
    squadWellbeingDelta: number | null;
  };
};

export type CheckInRow = {
  athlete_id: string;
  checkin_date: string;
  weight_kg: number | null;
  injury_area: string | null;
  injury_pain_rating: number | null;
} & Record<(typeof WELLBEING_DOMAINS)[number], number | null>;

// ─── Date helpers (ISO YYYY-MM-DD, UTC — matches how check-ins are stored) ──

function shiftDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function mondayOf(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0 = Sun
  return shiftDay(isoDate, day === 0 ? -6 : 1 - day);
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Mean of the wellbeing domains a check-in answered (null if none). */
export function rowWellbeing(row: CheckInRow): number | null {
  return nullableAvg(WELLBEING_DOMAINS.map((d) => row[d]));
}

/**
 * Status from the last 7 days, using the same per-domain thresholds as the
 * athlete page (worst domain decides). No check-ins → "no_data", not red.
 */
export function wellbeingStatus(rows: CheckInRow[]): {
  status: SquadStatus;
  worst: { domain: string; average: number } | null;
} {
  if (rows.length === 0) return { status: "no_data", worst: null };
  let worst: { domain: string; average: number } | null = null;
  for (const domain of WELLBEING_DOMAINS) {
    const average = nullableAvg(rows.map((r) => r[domain]));
    if (average != null && (worst == null || average < worst.average)) worst = { domain, average };
  }
  if (worst == null) return { status: "no_data", worst: null };
  const rag = domainRag(worst.average);
  return { status: rag === "red" ? "attention" : rag === "amber" ? "monitor" : "ready", worst };
}

/** Daily wellbeing means for the `days` days ending today, oldest first. */
export function dailyWellbeing(rows: CheckInRow[], today: string, days: number): (number | null)[] {
  const byDate = new Map(rows.map((r) => [r.checkin_date, rowWellbeing(r)]));
  return Array.from({ length: days }, (_, i) => byDate.get(shiftDay(today, i - (days - 1))) ?? null);
}

/** This week's load and the average of the previous 4 full weeks. */
export function weekLoadVsAverage(
  sessions: { session_date: string; load_au: number }[],
  today: string,
): { weekLoad: number; avgWeekLoad: number | null } {
  const thisMonday = mondayOf(today);
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const monday = mondayOf(s.session_date);
    totals.set(monday, (totals.get(monday) ?? 0) + s.load_au);
  }
  const prior = [1, 2, 3, 4].map((w) => totals.get(shiftDay(thisMonday, -7 * w)) ?? 0);
  const hasHistory = prior.some((t) => t > 0);
  return {
    weekLoad: totals.get(thisMonday) ?? 0,
    avgWeekLoad: hasHistory ? Math.round(prior.reduce((a, b) => a + b, 0) / 4) : null,
  };
}

/** Latest weight in the last 14 days and its % change vs a weigh-in ≥7 days earlier. */
export function weightChange(rows: CheckInRow[], today: string): { weight: number | null; pct: number | null } {
  const weighIns = rows
    .filter((r) => r.weight_kg != null && r.checkin_date >= shiftDay(today, -14))
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date));
  if (weighIns.length === 0) return { weight: null, pct: null };
  const latest = weighIns[0];
  const earlier = rows
    .filter((r) => r.weight_kg != null && r.checkin_date <= shiftDay(latest.checkin_date, -7))
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date))[0];
  const pct = earlier ? ((latest.weight_kg! - earlier.weight_kg!) / earlier.weight_kg!) * 100 : null;
  return { weight: latest.weight_kg, pct: pct != null ? Math.round(pct * 10) / 10 : null };
}

/**
 * Longest current run of the same pain area (a 1-day gap still counts, as in
 * getInjuryFlags), only if it was reported in the last 7 days.
 */
export function ongoingPain(rows: CheckInRow[], today: string): { area: string; days: number; rating: number } | null {
  const byArea = new Map<string, { area: string; date: string; rating: number }[]>();
  for (const r of rows) {
    if (!r.injury_area || !r.injury_pain_rating) continue;
    const key = r.injury_area.trim().toLowerCase();
    byArea.set(key, [...(byArea.get(key) ?? []), { area: r.injury_area.trim(), date: r.checkin_date, rating: r.injury_pain_rating }]);
  }
  let best: { area: string; days: number; rating: number } | null = null;
  for (const reports of byArea.values()) {
    const sorted = reports.sort((a, b) => b.date.localeCompare(a.date));
    if (sorted[0].date < shiftDay(today, -7)) continue;
    let days = 1;
    for (let i = 1; i < sorted.length && daysBetween(sorted[i].date, sorted[i - 1].date) <= 2; i++) days++;
    if (!best || days > best.days) best = { area: sorted[0].area, days, rating: sorted[0].rating };
  }
  return best;
}

const DOMAIN_LABEL: Record<string, string> = {
  sleep_quality: "sleep",
  physical_fatigue: "energy",
  mental_focus: "focus",
  motivation: "motivation",
  mood: "mood",
  stress: "stress",
  diet_quality: "diet",
};

// Flag wording per domain — stress is scored 5 = calm, so a low score means high stress.
const LOW_LABEL: Record<string, string> = {
  sleep_quality: "Poor sleep",
  physical_fatigue: "Low energy",
  mental_focus: "Low focus",
  motivation: "Low motivation",
  mood: "Low mood",
  stress: "High stress",
  diet_quality: "Poor diet",
};

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function attentionReasons(a: {
  daysSinceCheckin: number | null;
  status: SquadStatus;
  wellbeing7d: number | null;
  worst: { domain: string; average: number } | null;
  pain: { area: string; days: number; rating: number } | null;
}): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (a.status === "attention" && a.worst) {
    reasons.push({
      kind: "low_wellbeing",
      label: LOW_LABEL[a.worst.domain] ?? "Low wellbeing",
      detail: `${capitalise(DOMAIN_LABEL[a.worst.domain] ?? a.worst.domain)} rated ${a.worst.average.toFixed(1)} / 5 on average this week${a.worst.domain === "stress" ? " (5 = calm)" : ""}; overall wellbeing ${a.wellbeing7d?.toFixed(1) ?? "—"}.`,
      severity: 3,
    });
  }
  if (a.pain && a.pain.days >= 3) {
    reasons.push({
      kind: "ongoing_pain",
      label: "Ongoing pain",
      detail: `${a.pain.area}, ${a.pain.days} days. Latest pain ${a.pain.rating}/5.`,
      severity: 3,
    });
  }
  if (a.daysSinceCheckin == null || a.daysSinceCheckin >= 3) {
    reasons.push({
      kind: "no_checkins",
      label: "No recent check-ins",
      detail: a.daysSinceCheckin == null ? "Has never checked in." : `Last check-in ${a.daysSinceCheckin} days ago.`,
      severity: 1,
    });
  }
  return reasons;
}

// ─── One athlete ─────────────────────────────────────────────────────────────

/**
 * Status, KPIs and attention reasons for one athlete. `rows` and `sessions`
 * should cover at least the last 35 days. Used by the Squad page and the
 * athlete page so both always agree.
 */
export function athleteSnapshot(
  rows: CheckInRow[],
  sessions: { session_date: string; load_au: number }[],
  today: string,
  lastCheckinDate: string | null,
): AthleteSnapshot {
  const last7 = shiftDay(today, -7);
  const prior7 = shiftDay(today, -14);
  const recent = rows.filter((r) => r.checkin_date >= last7);
  const before = rows.filter((r) => r.checkin_date >= prior7 && r.checkin_date < last7);
  const daysSinceCheckin = lastCheckinDate ? daysBetween(lastCheckinDate, today) : null;
  const { status, worst } = wellbeingStatus(recent);
  const wellbeing7d = nullableAvg(recent.map(rowWellbeing));
  const pain = ongoingPain(rows, today);
  const { weekLoad, avgWeekLoad } = weekLoadVsAverage(sessions, today);
  const { weight, pct } = weightChange(rows, today);

  return {
    status,
    lastCheckinDate,
    daysSinceCheckin,
    wellbeing7d,
    wellbeingPrev7d: nullableAvg(before.map(rowWellbeing)),
    wellbeingSeries: dailyWellbeing(rows, today, 14),
    weekLoad,
    avgWeekLoad,
    weight,
    weightChangePct: pct,
    pain,
    reasons: attentionReasons({ daysSinceCheckin, status, wellbeing7d, worst, pain }),
  };
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function getSquadOverview(): Promise<SquadOverview> {
  const today = new Date().toISOString().slice(0, 10);
  const from = shiftDay(today, -35);

  const [athletesResult, checkInsResult, sessionsResult] = await Promise.all([
    supabaseAdmin.from("athlete").select("id, name, sport, weight_class").order("name"),
    supabaseAdmin
      .from("daily_check_in")
      .select(`athlete_id, checkin_date, weight_kg, injury_area, injury_pain_rating, ${WELLBEING_DOMAINS.join(", ")}`)
      .gte("checkin_date", from)
      .order("checkin_date", { ascending: true }),
    supabaseAdmin
      .from("check_in_session")
      .select("athlete_id, session_date, load_au")
      .gte("session_date", from),
  ]);

  if (athletesResult.error) throw new Error(`getSquadOverview: ${athletesResult.error.message}`);
  if (checkInsResult.error) throw new Error(`getSquadOverview: ${checkInsResult.error.message}`);
  if (sessionsResult.error) throw new Error(`getSquadOverview: ${sessionsResult.error.message}`);

  const athletes = athletesResult.data ?? [];
  const checkIns = (checkInsResult.data ?? []) as unknown as CheckInRow[];
  const sessions = sessionsResult.data ?? [];

  // Last check-in for athletes with nothing in the window
  const quietIds = athletes.filter((a) => !checkIns.some((c) => c.athlete_id === a.id)).map((a) => a.id);
  const lastOlder = new Map<string, string>();
  if (quietIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("daily_check_in")
      .select("athlete_id, checkin_date")
      .in("athlete_id", quietIds)
      .order("checkin_date", { ascending: false });
    if (error) throw new Error(`getSquadOverview: ${error.message}`);
    for (const r of data ?? []) if (!lastOlder.has(r.athlete_id)) lastOlder.set(r.athlete_id, r.checkin_date);
  }

  const last7 = shiftDay(today, -7);
  const prior7 = shiftDay(today, -14);

  const squad: SquadAthlete[] = athletes.map((athlete) => {
    const rows = checkIns.filter((c) => c.athlete_id === athlete.id);
    const lastCheckinDate = rows.at(-1)?.checkin_date ?? lastOlder.get(athlete.id) ?? null;
    const snapshot = athleteSnapshot(
      rows,
      sessions.filter((s) => s.athlete_id === athlete.id),
      today,
      lastCheckinDate,
    );
    return { id: athlete.id, name: athlete.name, sport: athlete.sport, weightClass: athlete.weight_class, ...snapshot };
  });

  // ── KPIs ──
  const flagged = squad.filter((a) => a.reasons.length > 0);
  const count = (kind: AttentionReason["kind"]) => flagged.filter((a) => a.reasons.some((r) => r.kind === kind)).length;
  const summary = [
    [count("low_wellbeing"), "wellbeing concern"],
    [count("ongoing_pain"), "ongoing pain"],
    [count("no_checkins"), "no recent check-ins"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(" · ");

  const withPain = squad.filter((a) => a.pain != null);
  const longest = withPain.sort((a, b) => b.pain!.days - a.pain!.days)[0];

  const squadNow = nullableAvg(checkIns.filter((c) => c.checkin_date >= last7).map(rowWellbeing));
  const squadBefore = nullableAvg(
    checkIns.filter((c) => c.checkin_date >= prior7 && c.checkin_date < last7).map(rowWellbeing),
  );

  return {
    today,
    athletes: squad,
    kpis: {
      total: squad.length,
      checkedInToday: squad.filter((a) => a.daysSinceCheckin === 0).length,
      attentionCount: flagged.length,
      attentionSummary: summary,
      painCount: withPain.length,
      longestPain: longest ? { name: longest.name, area: longest.pain!.area, days: longest.pain!.days } : null,
      squadWellbeing7d: squadNow,
      squadWellbeingDelta: squadNow != null && squadBefore != null ? squadNow - squadBefore : null,
    },
  };
}
