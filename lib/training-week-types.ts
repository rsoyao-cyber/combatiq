// ─── Domain types ────────────────────────────────────────────────────────────

/** Traffic-light intensity for an individual time-of-day slot or the whole day. */
export type SlotIntensity = "rest" | "med" | "high";

/** One time-of-day block (morning, afternoon, or evening). */
export interface WeekSlot {
  /** Human-readable description, e.g. "Strength & Power". Use "—" for empty. */
  label: string;
  intensity: SlotIntensity;
}

/**
 * One day's full schedule.
 *
 * INTENSITY column default rule (documented here so the UI and API both
 * agree on what "auto-compute" means):
 *   1. Collect all slots whose label is not "—" and not empty string.
 *   2. dominant = "high" if any collected slot has intensity "high",
 *                 "med"  if any has "med",
 *                 "rest" otherwise (including when no non-empty slots exist).
 *   3. intensity_display defaults to `"${DOMINANT} | ${DOMINANT}"`,
 *      e.g. "HIGH | HIGH". The coach may override to show an asymmetric
 *      pair (e.g. "HIGH | MED") for mornings-vs-evenings differences.
 *
 * TOTAL SESSIONS default rule:
 *   Count of slots where label is not "—" and not empty string.
 *   total_sessions_override = null means "use that count".
 */
export interface WeekDay {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  morning: WeekSlot;
  afternoon: WeekSlot;
  evening: WeekSlot;
  /** Editable INTENSITY column value, e.g. "HIGH | HIGH". */
  intensity_display: string;
  /** null = auto-count non-empty slots. */
  total_sessions_override: number | null;
  /** Free text for the SESSION TYPES column. */
  session_types: string;
}

/** The JSON shape stored in primary_json / alternative_json columns. */
export interface WeekScheduleJson {
  /** Always 7 entries, Monday through Sunday. */
  days: WeekDay[];
}

export type Adherence = "stuck_to_plan" | "changed" | null;

/** Full row from the training_week_snapshot table. */
export interface TrainingWeekSnapshot {
  id: string;
  athlete_id: string;
  /** ISO date string (YYYY-MM-DD) – always a Monday. */
  week_start_date: string;
  primary_json: WeekScheduleJson;
  alternative_json: WeekScheduleJson | null;
  adherence: Adherence;
  week_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const DAYS: WeekDay["day"][] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

const EMPTY_SLOT: WeekSlot = { label: "—", intensity: "rest" };

/** Returns a blank 7-day schedule with all slots set to rest/empty. */
export function emptyWeekSchedule(): WeekScheduleJson {
  return {
    days: DAYS.map((day) => ({
      day,
      morning: { ...EMPTY_SLOT },
      afternoon: { ...EMPTY_SLOT },
      evening: { ...EMPTY_SLOT },
      intensity_display: "REST | REST",
      total_sessions_override: null,
      session_types: "",
    })),
  };
}

function isEmptySlot(slot: WeekSlot): boolean {
  return !slot.label || slot.label === "—";
}

/**
 * Derives the default INTENSITY display string from a day's three slots.
 * See the rule documented on WeekDay.intensity_display.
 */
export function computeIntensityDisplay(day: Pick<WeekDay, "morning" | "afternoon" | "evening">): string {
  const nonEmpty = [day.morning, day.afternoon, day.evening].filter((s) => !isEmptySlot(s));
  if (!nonEmpty.length) return "REST | REST";

  const dominant = nonEmpty.some((s) => s.intensity === "high")
    ? "HIGH"
    : nonEmpty.some((s) => s.intensity === "med")
    ? "MED"
    : "REST";

  return `${dominant} | ${dominant}`;
}

/** Counts slots that have non-empty labels (used for TOTAL SESSIONS auto-count). */
export function countNonEmptySessions(day: Pick<WeekDay, "morning" | "afternoon" | "evening">): number {
  return [day.morning, day.afternoon, day.evening].filter((s) => !isEmptySlot(s)).length;
}

/**
 * Returns the Monday of the week containing `date`, formatted as YYYY-MM-DD.
 * Uses local time throughout to avoid UTC date-shift issues.
 */
export function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay(); // 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - daysToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Adds `offsetWeeks` weeks to a YYYY-MM-DD week-start string. */
export function offsetWeekStart(weekStart: string, offsetWeeks: number): string {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + offsetWeeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formats a week-start date as a human-readable range, e.g. "7 Apr – 13 Apr 2025". */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
}
