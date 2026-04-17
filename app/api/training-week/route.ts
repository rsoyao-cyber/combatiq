import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/lib/database.types";
import type { WeekScheduleJson } from "@/lib/training-week-types";
import { emptyWeekSchedule } from "@/lib/training-week-types";
import { TrainingWeekPutSchema } from "@/lib/schemas";
import { rateLimits, getClientIp, tooManyRequests } from "@/lib/rate-limit";

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
  const { success } = await rateLimits.trainingWeekPut.limit(getClientIp(request));
  if (!success) return tooManyRequests();

  const body = await request.json();
  const result = TrainingWeekPutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 400 }
    );
  }

  const { athleteId, weekStart, type, adherence, week_notes } = result.data;

  if (!isMonday(weekStart)) {
    return NextResponse.json({ error: "weekStart must be a Monday (YYYY-MM-DD)" }, { status: 422 });
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
        ? (result.data.primary_json as WeekScheduleJson)
        : emptyWeekSchedule(),
      alternative_json: type === "alternative"
        ? (result.data.alternative_json as WeekScheduleJson | null)
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
    updatePayload.primary_json = result.data.primary_json as WeekScheduleJson;
  } else {
    updatePayload.alternative_json = (result.data.alternative_json ?? null) as WeekScheduleJson | null;
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
