import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Generate 21 daily check-ins with realistic variation.
// pattern: mostly green (4-5), some amber (3), one red day with injury.
function makeCheckIns(
  athleteId: string,
  redDay: number, // how many days ago the red day is
) {
  return Array.from({ length: 21 }, (_, i) => {
    const daysBack = 20 - i; // oldest first
    const isRedDay = daysBack === redDay;

    if (isRedDay) {
      return {
        athlete_id: athleteId,
        checkin_date: daysAgo(daysBack),
        sleep_quality: 1,
        sleep_hours: 4.5,
        physical_fatigue: 1,
        mental_focus: 2,
        motivation: 1,
        mood: 1,
        stress: 5,
        diet_quality: 2,
        hitting_nutrition_targets: false,
        sparring_load_rounds: 8,
        session_rpe: 9,
        injury_area: "Left knee",
        injury_pain_rating: 4,
        open_notes: "Knee swelled up after hard sparring. Really struggling today.",
      };
    }

    // Amber days: 3 out of every 7
    const isAmberDay = daysBack % 7 === 2 || daysBack % 7 === 5;

    const base = isAmberDay ? 3 : 4;
    const jitter = () => clamp(base + Math.round((Math.random() - 0.5) * 2), 0, 5);

    const hasInjuryFollowOn = daysBack < redDay && daysBack >= redDay - 4;

    return {
      athlete_id: athleteId,
      checkin_date: daysAgo(daysBack),
      sleep_quality: jitter(),
      sleep_hours: 6 + Math.round(Math.random() * 3),
      physical_fatigue: jitter(),
      mental_focus: jitter(),
      motivation: jitter(),
      mood: jitter(),
      stress: clamp(base - 1 + Math.round(Math.random() * 2), 0, 5),
      diet_quality: jitter(),
      hitting_nutrition_targets: Math.random() > 0.3,
      sparring_load_rounds: Math.random() > 0.5 ? Math.floor(Math.random() * 6) + 1 : null,
      session_rpe: Math.floor(Math.random() * 4) + 5,
      injury_area: hasInjuryFollowOn ? "Left knee" : null,
      injury_pain_rating: hasInjuryFollowOn ? clamp(4 - (redDay - daysBack), 0, 5) : null,
      open_notes: null,
    };
  });
}

// ─── athlete seed function ────────────────────────────────────────────────────

async function seedAthlete({
  name,
  sport,
  weight_class,
  competition_level,
  training_age_years,
  redDay,
  intervalExercise,
  strengthExercise,
}: {
  name: string;
  sport: string;
  weight_class: string;
  competition_level: "Amateur" | "Semi-Pro" | "Professional" | "Elite";
  training_age_years: number;
  redDay: number;
  intervalExercise: string;
  strengthExercise: string;
}) {
  console.log(`\n── Seeding ${name} ──`);

  // 1. Athlete
  const { data: athlete, error: athleteErr } = await supabase
    .from("athlete")
    .insert({ name, sport, weight_class, competition_level, training_age_years })
    .select("id")
    .single();

  if (athleteErr || !athlete) throw new Error(`Athlete: ${athleteErr?.message}`);
  const athleteId = athlete.id;
  console.log(`  athlete  ${athleteId}`);

  // 2. WorkoutProgram
  const { data: program, error: progErr } = await supabase
    .from("workout_program")
    .insert({
      athlete_id: athleteId,
      name: "Phase 1 — Foundation Block",
      phase_number: 1,
      start_date: daysAgo(30),
      end_date: daysAgo(-14),
      total_weeks: 6,
    })
    .select("id")
    .single();

  if (progErr || !program) throw new Error(`Program: ${progErr?.message}`);
  const programId = program.id;
  console.log(`  program  ${programId}`);

  // 3. WorkoutTemplates
  const { data: intervalTemplate, error: itErr } = await supabase
    .from("workout_template")
    .insert({
      program_id: programId,
      name: "Interval Conditioning",
      workout_type: "interval",
      estimated_duration_mins: 20,
      equipment: ["AssaultBike"],
      instructions: "4 x 90s at 85-90% effort. 90s active recovery between reps.",
    })
    .select("id")
    .single();

  if (itErr || !intervalTemplate) throw new Error(`Interval template: ${itErr?.message}`);

  const { data: strengthTemplate, error: stErr } = await supabase
    .from("workout_template")
    .insert({
      program_id: programId,
      name: "Strength Day",
      workout_type: "strength",
      estimated_duration_mins: 60,
      equipment: ["Barbell", "Dumbbells", "Cable"],
      instructions: "Main compound lifts followed by accessory work. Rest 2-3 mins between sets.",
    })
    .select("id")
    .single();

  if (stErr || !strengthTemplate) throw new Error(`Strength template: ${stErr?.message}`);
  console.log(`  templates  interval=${intervalTemplate.id}  strength=${strengthTemplate.id}`);

  // 4. TrainingSessions + ExerciseSets
  // Four sessions spread across last 30 days
  const sessionDefs = [
    { daysBack: 28, templateId: intervalTemplate.id, type: "interval" as const },
    { daysBack: 21, templateId: strengthTemplate.id, type: "strength" as const },
    { daysBack: 14, templateId: intervalTemplate.id, type: "interval" as const },
    { daysBack:  7, templateId: strengthTemplate.id, type: "strength" as const },
  ];

  for (const def of sessionDefs) {
    const { data: session, error: sessErr } = await supabase
      .from("training_session")
      .insert({
        athlete_id: athleteId,
        template_id: def.templateId,
        session_date: daysAgo(def.daysBack),
        session_rpe: Math.floor(Math.random() * 3) + 6,
        completed: true,
      })
      .select("id")
      .single();

    if (sessErr || !session) throw new Error(`Session: ${sessErr?.message}`);

    // Exercise sets
    const sets =
      def.type === "interval"
        ? Array.from({ length: 4 }, (_, i) => ({
            session_id: session.id,
            exercise_name: intervalExercise,
            exercise_category: "interval" as const,
            set_number: i + 1,
            cluster_number: null,
            reps: null,
            weight_kg: null,
            power_watts: clamp(
              600 + Math.round(Math.random() * 200) + (28 - def.daysBack) * 2,
              500,
              900,
            ),
            target_power_watts: 650,
            duration_secs: 90,
            rest_secs: 90,
            each_side: false,
          }))
        : [
            // 3 sets each of two exercises
            ...Array.from({ length: 3 }, (_, i) => ({
              session_id: session.id,
              exercise_name: strengthExercise,
              exercise_category: "strength" as const,
              set_number: i + 1,
              cluster_number: null,
              reps: 5,
              weight_kg: clamp(
                80 + i * 5 + Math.round(Math.random() * 10) + (28 - def.daysBack) / 4,
                60,
                160,
              ),
              power_watts: null,
              target_power_watts: null,
              duration_secs: null,
              rest_secs: 180,
              each_side: false,
            })),
            ...Array.from({ length: 3 }, (_, i) => ({
              session_id: session.id,
              exercise_name: "Romanian Deadlift",
              exercise_category: "strength" as const,
              set_number: i + 1,
              cluster_number: null,
              reps: 8,
              weight_kg: clamp(
                60 + i * 5 + Math.round(Math.random() * 10),
                40,
                120,
              ),
              power_watts: null,
              target_power_watts: null,
              duration_secs: null,
              rest_secs: 120,
              each_side: false,
            })),
          ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: setsErr } = await supabase.from("exercise_set").insert(sets as any);
    if (setsErr) throw new Error(`Sets: ${setsErr.message}`);
    console.log(`  session ${daysAgo(def.daysBack)} (${def.type})  ${sets.length} sets`);
  }

  // 5. DailyCheckIns
  const checkIns = makeCheckIns(athleteId, redDay);
  const { error: ciErr } = await supabase.from("daily_check_in").insert(checkIns);
  if (ciErr) throw new Error(`CheckIns: ${ciErr.message}`);
  console.log(`  check-ins  ${checkIns.length} records`);

  return athleteId;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("CombatIQ seed script starting…\n");

  const zakId = await seedAthlete({
    name: "Zak Michaux",
    sport: "Boxing",
    weight_class: "Featherweight",
    competition_level: "Semi-Pro",
    training_age_years: 5,
    redDay: 11,
    intervalExercise: "Assault Fitness AssaultBike",
    strengthExercise: "Barbell Back Squat",
  });

  const yusufId = await seedAthlete({
    name: "Yusuf Ali-Taleb",
    sport: "BJJ",
    weight_class: "Middleweight",
    competition_level: "Amateur",
    training_age_years: 2,
    redDay: 6,
    intervalExercise: "Rowing Machine",
    strengthExercise: "Trap Bar Deadlift",
  });

  console.log(`\nDone.`);
  console.log(`  Zak Michaux   ${zakId}`);
  console.log(`  Yusuf Ali-Taleb  ${yusufId}`);
  console.log(`  Micah Smith   285e72fa-9890-4d06-ab43-f5f77e00783f  (already imported)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
