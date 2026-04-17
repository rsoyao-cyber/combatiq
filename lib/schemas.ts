import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const uuidSchema = z.uuid({ error: "Must be a valid UUID" });

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be a date in YYYY-MM-DD format" });

// ─── create-athlete ───────────────────────────────────────────────────────────

export const CreateAthleteSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  sport: z.string().min(1, "Sport is required").max(100).trim(),
  weight_class: z.string().max(50).trim().default(""),
  competition_level: z.enum(["Amateur", "Semi-Pro", "Professional", "Elite"], {
    error: "competition_level must be Amateur, Semi-Pro, Professional, or Elite",
  }),
  training_age_years: z
    .number({ error: "training_age_years must be a number" })
    .int()
    .min(0)
    .max(50),
  clinic_name: z.string().max(200).trim().nullable().optional(),
  trainerize_user_id: z.number().int().nullable().optional(),
});

export type CreateAthleteInput = z.infer<typeof CreateAthleteSchema>;

// ─── generate-report ─────────────────────────────────────────────────────────

export const GenerateReportSchema = z.object({
  athleteId: uuidSchema,
  reportType: z.enum(["monthly", "prefight"], {
    error: "reportType must be 'monthly' or 'prefight'",
  }),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;

// ─── training-week PUT ────────────────────────────────────────────────────────

const SlotSchema = z.object({
  label: z.string().max(200),
  intensity: z.enum(["rest", "med", "high"]),
});

const DaySchema = z.object({
  day: z.enum([
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
  ]),
  morning: SlotSchema,
  afternoon: SlotSchema,
  evening: SlotSchema,
  intensity_display: z.string().max(30),
  total_sessions_override: z
    .number().int().min(0).max(20)
    .nullable()
    .optional()
    .default(null),
  session_types: z.string().max(500),
});

export const WeekScheduleSchema = z.object({
  days: z.array(DaySchema).length(7, "Schedule must contain exactly 7 days"),
});

export const TrainingWeekPutSchema = z
  .object({
    athleteId: uuidSchema,
    weekStart: dateSchema,
    type: z.enum(["primary", "alternative"]),
    primary_json: WeekScheduleSchema.optional(),
    alternative_json: WeekScheduleSchema.nullable().optional(),
    adherence: z.enum(["stuck_to_plan", "changed"]).nullable().optional(),
    week_notes: z.string().max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "primary" && !data.primary_json) {
      ctx.addIssue({
        code: "custom",
        message: "primary_json is required when type is 'primary'",
        path: ["primary_json"],
      });
    }
  });

export type TrainingWeekPutInput = z.infer<typeof TrainingWeekPutSchema>;

// ─── confirm-import ───────────────────────────────────────────────────────────
// Mirrors ParsedImportData from lib/trainerize-types.ts.
// Array length caps prevent runaway imports from oversized payloads.

const PowerBenchmarkSchema = z.object({
  rep_number: z.number().int().min(1),
  threshold_watts: z.number().min(0),
  action_if_below: z.string().max(500),
});

const ParsedExerciseSetSchema = z.object({
  exercise_name: z.string().min(1).max(200),
  exercise_category: z.enum(["strength", "power", "mobility", "interval"]),
  set_number: z.number().int().min(1),
  cluster_number: z.number().int().nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).nullable().optional(),
  power_watts: z.number().min(0).nullable().optional(),
  target_power_watts: z.number().min(0).nullable().optional(),
  duration_secs: z.number().int().min(0).nullable().optional(),
  each_side: z.boolean().optional().default(false),
});

const ParsedWorkoutTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  workout_type: z.enum(["interval", "strength", "mobility", "conditioning"]),
  estimated_duration_mins: z.number().int().min(0).nullable().optional(),
  equipment: z.array(z.string().max(100)).max(50),
  instructions: z.string().max(5000),
  power_benchmarks: z.array(PowerBenchmarkSchema).max(20),
});

const ParsedTrainingSessionSchema = z.object({
  workout_template_name: z.string().min(1).max(200),
  session_date: dateSchema.nullable(),   // nullable: route skips null-date sessions
  exercise_sets: z.array(ParsedExerciseSetSchema).max(200),
  session_rpe: z.number().int().min(1).max(10).nullable().optional(),
});

export const ConfirmImportSchema = z.object({
  athlete_name: z.string().min(1).max(200).trim(),
  program: z.object({
    name: z.string().min(1).max(200),
    phase_number: z.number().int().min(0).nullable().optional(),
    start_date: dateSchema,
    end_date: dateSchema.nullable().optional(),
    total_weeks: z.number().int().min(0).nullable().optional(),
    trainerize_plan_id: z.number().int().nullable().optional(),
  }),
  workout_templates: z.array(ParsedWorkoutTemplateSchema).max(100),
  training_sessions: z.array(ParsedTrainingSessionSchema).max(1000),
  filename: z.string().max(500).optional(),
  force: z.boolean().optional().default(false),
  athleteId: uuidSchema.nullable().optional(),
});

export type ConfirmImportInput = z.infer<typeof ConfirmImportSchema>;
