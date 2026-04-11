// Shared types for the Trainerize import pipeline

export type PowerBenchmark = {
  rep_number: number;
  threshold_watts: number;
  action_if_below: string;
};

export type ParsedExerciseSet = {
  exercise_name: string;
  exercise_category: "strength" | "power" | "mobility" | "interval";
  set_number: number;
  cluster_number: number | null;
  reps: number | null;
  weight_kg: number | null;
  power_watts: number | null;
  target_power_watts: number | null;
  duration_secs: number | null;
  each_side: boolean;
};

export type ParsedWorkoutTemplate = {
  name: string;
  workout_type: "interval" | "strength" | "mobility" | "conditioning";
  estimated_duration_mins: number | null;
  equipment: string[];
  instructions: string;
  power_benchmarks: PowerBenchmark[];
};

export type ParsedTrainingSession = {
  workout_template_name: string;
  session_date: string;
  exercise_sets: ParsedExerciseSet[];
  // Added during review step
  session_rpe?: number | null;
};

export type ParsedImportData = {
  athlete_name: string;
  program: {
    name: string;
    phase_number: number | null;
    start_date: string;
    end_date: string | null;
    total_weeks: number | null;
    trainerize_plan_id: number | null;
  };
  workout_templates: ParsedWorkoutTemplate[];
  training_sessions: ParsedTrainingSession[];
};
