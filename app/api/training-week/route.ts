import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/lib/database.types";
import type { WeekScheduleJson, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import { emptyWeekSchedule } from "@/lib/training-week-types";

const MAX_LABEL_LENGTH = 200;
const MAX_SESSION_TYPES_LENGTH = 500;
const MAX_INTENSITY_DISPLAY_LENGTH = 30;
const MAX_WEEK_NOTES_LENGTH = 1000;

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const VALID_INTENSITIES: SlotIntensity[] = ["rest", "med", "high"];
const VALID_ADHERENCE = ["stuck_to_plan", "changed"];

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidSlot(slot: unknown): slot is WeekSlot {
  if (!slot || typeof slot !== "object") return false;
  const s = slot as Record<string, unknown>;
  return (
    typeof s.label === "string" &&
    s.label.length <= MAX_LABEL_LENGTH &&
    VALID_INTENSITIES.includes(s.intensity as SlotIntensity)
  );
}

function isValidWeekSchedule(json: unknown): json is WeekScheduleJson {
  if (!json || typeof json !== "object") return false;
  const j = json as Record<string, unknown>;
  if (!Array.isArray(j.days) || j.days.length !== 7) return false;
  return j.days.every((day: unknown) => {
    if (!day || typeof day !== "object") return false;
    const d = day as Record<string, unknown>;
    return (
      VALID_DAYS.includes(d.day as string) &&
      isValidSlot(d.morning) &&
      isValidSlot(d.afternoon) &&
      isValidSlot(d.evening) &&
      typeof d.intensity_display === "string" &&
      d.intensity_display.length <= MAX_INTENSITY_DISPLAY_LENGTH &&
      (d.total_sessions_override === null ||
        (typeof d.total_sessions_override === "number" &&
          Number.isInteger(d.total_sessions_override) &&
          d.total_sessions_override >= 0 &&
          d.total_sessions_override <= 20)) &&
      typeof d.session_types === "string" &&
      (d.session_types as string).length <= MAX_SESSION_TYPES_LENGTH
    );
  });
}

/** Returns true if `dateStr` (YYYY-MM-DD) is a Monday (ISO DOW = 1). */
function isMonday(dateStr: string): boolean {
  // Parse as local midnight to match the CHECK constraint behaviour
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getDay() === 1; // JS: 1 = Monday
}

// ─── GET /api/training-week?athleteId=X&weekStart=YYYY-MM-DD ─────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId");
  const weekStart = searchParams.get("weekStart");

  if (!athleteId || !weekStart) {
    return NextResponse.json({ error: "athleteId and weekStart are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("week_start_date", weekStart)
    .single();

  if (error) {
    // PGRST116 = no rows found — not an error for us
    if (error.code === "PGRST116") return NextResponse.json({ data: null });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── PUT /api/training-week — upsert primary or alternative ──────────────────
//
// Body: {
//   athleteId: string,
//   weekStart: string,           // YYYY-MM-DD Monday
//   type: "primary" | "alternative",
//   primary_json?: WeekScheduleJson,      // required when type = "primary"
//   alternative_json?: WeekScheduleJson | null, // required when type = "alternative"
//   adherence?: "stuck_to_plan" | "changed" | null,
//   week_notes?: string | null,
// }

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    athleteId?: string;
    weekStart?: string;
    type?: string;
    primary_json?: unknown;
    alternative_json?: unknown;
    adherence?: string | null;
    week_notes?: string | null;
  };

  const { athleteId, weekStart, type, adherence, week_notes } = body;

  // ── Basic presence checks ──────────────────────────────────────────────────
  if (!athleteId || !weekStart || !type) {
    return NextResponse.json(
      { error: "athleteId, weekStart, and type are required" },
      { status: 400 },
    );
  }

  if (type !== "primary" && type !== "alternative") {
    return NextResponse.json({ error: 'type must be "primary" or "alternative"' }, { status: 400 });
  }

  if (!isMonday(weekStart)) {
    return NextResponse.json({ error: "weekStart must be a Monday (YYYY-MM-DD)" }, { status: 422 });
  }

  // ── Type-specific validation ───────────────────────────────────────────────
  if (type === "primary") {
    if (!isValidWeekSchedule(body.primary_json)) {
      return NextResponse.json({ error: "Invalid or missing primary_json" }, { status: 422 });
    }
  }

  if (type === "alternative") {
    if (body.alternative_json !== null && !isValidWeekSchedule(body.alternative_json)) {
      return NextResponse.json({ error: "Invalid alternative_json" }, { status: 422 });
    }
    if (adherence !== undefined && adherence !== null && !VALID_ADHERENCE.includes(adherence)) {
      return NextResponse.json({ error: "Invalid adherence value" }, { status: 422 });
    }
    if (week_notes !== undefined && week_notes !== null && week_notes.length > MAX_WEEK_NOTES_LENGTH) {
      return NextResponse.json({ error: "week_notes exceeds 1000 characters" }, { status: 422 });
    }
  }

  // ── Fetch existing row ─────────────────────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("id, primary_json")
    .eq("athlete_id", athleteId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing) {
    // ── INSERT ──────────────────────────────────────────────────────────────
    // When an athlete submits an alternative but no primary exists yet,
    // we create the row with an empty primary schedule.
    const insertPayload = {
      athlete_id: athleteId,
      week_start_date: weekStart,
      primary_json: type === "primary"
        ? (body.primary_json as WeekScheduleJson)
        : emptyWeekSchedule(),
      alternative_json: type === "alternative"
        ? (body.alternative_json as WeekScheduleJson | null)
        : null,
      adherence: type === "alternative" ? (adherence ?? null) : null,
      week_notes: type === "alternative" ? (week_notes ?? null) : null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseAdmin
      .from("training_week_snapshot")
      .insert(insertPayload)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // ── UPDATE — only touch the fields relevant to this type ──────────────────
  const updatePayload: Database["public"]["Tables"]["training_week_snapshot"]["Update"] = { updated_at: now };

  if (type === "primary") {
    updatePayload.primary_json = body.primary_json as WeekScheduleJson;
  } else {
    updatePayload.alternative_json = (body.alternative_json ?? null) as WeekScheduleJson | null;
    if (adherence !== undefined) updatePayload.adherence = adherence;
    if (week_notes !== undefined) updatePayload.week_notes = week_notes;
  }

  const { data, error } = await supabaseAdmin
    .from("training_week_snapshot")
    .update(updatePayload)
    .eq("athlete_id", athleteId)
    .eq("week_start_date", weekStart)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
