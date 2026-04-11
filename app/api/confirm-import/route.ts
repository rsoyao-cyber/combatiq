import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ParsedImportData, ParsedTrainingSession } from "@/lib/trainerize-types";

type ConfirmImportBody = ParsedImportData & {
  training_sessions: ParsedTrainingSession[];
  filename?: string;
  force?: boolean;
  athleteId?: string | null;
};

export async function POST(request: Request) {
  const body: ConfirmImportBody = await request.json();
  const { athlete_name, program, workout_templates, training_sessions, filename, force, athleteId: lockedAthleteId } = body;

  // ── 1. Resolve athlete ───────────────────────────────────────────────────
  let athleteId: string;

  if (lockedAthleteId) {
    // Athlete was pre-selected on the UI — use it directly
    athleteId = lockedAthleteId;
  } else {
    // Fall back to name-match / auto-create
    const { data: existingAthlete } = await supabaseAdmin
      .from("athlete")
      .select("id")
      .ilike("name", athlete_name.trim())
      .single();

    if (existingAthlete) {
      athleteId = existingAthlete.id;
    } else {
      const { data: newAthlete, error: athleteError } = await supabaseAdmin
        .from("athlete")
        .insert({
          name: athlete_name.trim(),
          sport: "MMA",
          weight_class: "TBD",
          competition_level: "Amateur",
          training_age_years: 0,
        })
        .select("id")
        .single();

      if (athleteError || !newAthlete) {
        return NextResponse.json(
          { error: "Failed to create athlete", detail: athleteError?.message },
          { status: 500 },
        );
      }
      athleteId = newAthlete.id;
    }
  }

  // ── 2. Duplicate import guard ────────────────────────────────────────────
  if (!force && program.trainerize_plan_id) {
    const { data: existing } = await supabaseAdmin
      .from("import_log")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("trainerize_plan_id", program.trainerize_plan_id)
      .eq("status", "confirmed")
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: "This program has already been imported. Do you want to proceed anyway?",
          duplicate: true,
        },
        { status: 409 },
      );
    }
  }

  // ── 3. Create WorkoutProgram ─────────────────────────────────────────────
  const { data: createdProgram, error: programError } = await supabaseAdmin
    .from("workout_program")
    .insert({
      athlete_id: athleteId,
      name: program.name,
      phase_number: program.phase_number ?? null,
      start_date: program.start_date,
      end_date: program.end_date ?? null,
      total_weeks: program.total_weeks ?? null,
      trainerize_plan_id: program.trainerize_plan_id ?? null,
    })
    .select("id")
    .single();

  if (programError || !createdProgram) {
    return NextResponse.json(
      { error: "Failed to create program", detail: programError?.message },
      { status: 500 },
    );
  }

  const programId = createdProgram.id;

  // ── 4. Create WorkoutTemplates ───────────────────────────────────────────
  // Build name → id map for session matching
  const templateIdByName: Record<string, string> = {};

  for (const template of workout_templates) {
    const { data: createdTemplate, error: templateError } = await supabaseAdmin
      .from("workout_template")
      .insert({
        program_id: programId,
        name: template.name,
        workout_type: template.workout_type,
        estimated_duration_mins: template.estimated_duration_mins ?? null,
        equipment: template.equipment,
        instructions: template.instructions,
      })
      .select("id")
      .single();

    if (templateError || !createdTemplate) {
      return NextResponse.json(
        { error: `Failed to create template "${template.name}"`, detail: templateError?.message },
        { status: 500 },
      );
    }

    templateIdByName[template.name] = createdTemplate.id;
  }

  // ── 5. Create TrainingSessions + ExerciseSets ────────────────────────────
  const createdSessionIds: string[] = [];
  let totalSetsCreated = 0;

  for (const session of training_sessions) {
    const templateId = templateIdByName[session.workout_template_name] ?? null;

    const { data: createdSession, error: sessionError } = await supabaseAdmin
      .from("training_session")
      .insert({
        athlete_id: athleteId,
        template_id: templateId,
        session_date: session.session_date,
        session_rpe: session.session_rpe ?? null,
        completed: true,
      })
      .select("id")
      .single();

    if (sessionError || !createdSession) {
      return NextResponse.json(
        { error: `Failed to create session on ${session.session_date}`, detail: sessionError?.message },
        { status: 500 },
      );
    }

    createdSessionIds.push(createdSession.id);

    // Bulk insert exercise sets for this session
    if (session.exercise_sets.length > 0) {
      // Valid enum values for exercise_category in the DB
      const VALID_CATEGORIES = new Set(["strength", "power", "mobility", "interval"]);

      const setsPayload = session.exercise_sets.map((s) => {
        // Clamp any unexpected category value to the nearest valid one
        // (cast to string first — Claude may return values outside the TS literal union)
        let category: string = s.exercise_category;
        if (!VALID_CATEGORIES.has(category)) {
          if (["conditioning", "cardio", "endurance"].includes(category)) {
            category = "interval";
          } else {
            category = "strength"; // safe fallback
          }
        }

        const isPower = category === "interval" || category === "power";

        return {
          session_id: createdSession.id,
          exercise_name: s.exercise_name,
          exercise_category: category,
          set_number: s.set_number,
          cluster_number: s.cluster_number ?? null,
          reps: s.reps ?? null,
          // Enforce unit rule: never write power to weight_kg (chk_no_mixed_units constraint)
          weight_kg: isPower ? null : (s.weight_kg ?? null),
          power_watts: isPower
            ? (s.power_watts ?? s.weight_kg ?? null)  // handle Trainerize collision
            : null,
          target_power_watts: s.target_power_watts ?? null,
          duration_secs: s.duration_secs ?? null,
          each_side: s.each_side ?? false,
        };
      });

      const { error: setsError } = await supabaseAdmin
        .from("exercise_set")
        .insert(setsPayload);

      if (setsError) {
        return NextResponse.json(
          { error: `Failed to insert sets for session ${session.session_date}`, detail: setsError.message },
          { status: 500 },
        );
      }

      totalSetsCreated += session.exercise_sets.length;
    }
  }

  // ── 6. Write ImportLog ───────────────────────────────────────────────────
  await supabaseAdmin.from("import_log").insert({
    athlete_id: athleteId,
    filename: filename ?? null,
    status: "confirmed",
    programs_created: 1,
    sessions_created: createdSessionIds.length,
    sets_created: totalSetsCreated,
    manually_corrected: false,
    trainerize_plan_id: program.trainerize_plan_id ?? null,
  });

  // ── 7. Return summary ────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    athlete_id: athleteId,
    athlete_name,
    program_id: programId,
    templates_created: Object.keys(templateIdByName).length,
    sessions_created: createdSessionIds.length,
    sets_created: totalSetsCreated,
    template_ids: templateIdByName,
    session_ids: createdSessionIds,
  });
}
