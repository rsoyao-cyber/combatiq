-- CombatIQ -- Supabase Schema
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Paste the full file and run in one shot. Dependency order is correct.


-- ---------------------------------------------------------------
-- 1. ATHLETE
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  sport                text NOT NULL,
  weight_class         text NOT NULL,
  competition_level    text NOT NULL
                         CHECK (competition_level IN ('Amateur', 'Semi-Pro', 'Professional', 'Elite')),
  training_age_years   integer NOT NULL,
  clinic_name          text,
  trainerize_user_id   integer,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------
-- 2. TEST SESSION
-- One-off physical assessment sessions (CMJ, grip, Yo-Yo, etc.)
-- NOT recurring training sessions -- see training_session for those.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_session (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id          uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  session_date        date NOT NULL,
  practitioner_notes  text,
  results_json        jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.test_session ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_session_athlete_id   ON public.test_session (athlete_id);
CREATE INDEX IF NOT EXISTS idx_test_session_session_date ON public.test_session (session_date);


-- ---------------------------------------------------------------
-- 3. DAILY CHECK-IN
-- Athlete wellness snapshot. All 0-5 ratings: 0 = very poor, 5 = excellent.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_check_in (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id                uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  checkin_date              date NOT NULL,

  sleep_quality             integer NOT NULL CHECK (sleep_quality BETWEEN 0 AND 5),
  sleep_hours               numeric,
  physical_fatigue          integer NOT NULL CHECK (physical_fatigue BETWEEN 0 AND 5),
  mental_focus              integer NOT NULL CHECK (mental_focus BETWEEN 0 AND 5),
  motivation                integer NOT NULL CHECK (motivation BETWEEN 0 AND 5),
  mood                      integer NOT NULL CHECK (mood BETWEEN 0 AND 5),
  stress                    integer NOT NULL CHECK (stress BETWEEN 0 AND 5),
  diet_quality              integer NOT NULL CHECK (diet_quality BETWEEN 0 AND 5),

  hitting_nutrition_targets boolean,

  sparring_load_rounds      integer,
  session_rpe               integer CHECK (session_rpe BETWEEN 1 AND 10),

  injury_area               text,
  injury_pain_rating        integer CHECK (injury_pain_rating BETWEEN 0 AND 5),

  open_notes                text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_check_in ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_daily_check_in_athlete_id   ON public.daily_check_in (athlete_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_in_checkin_date ON public.daily_check_in (checkin_date);


-- ---------------------------------------------------------------
-- 4. MONTHLY GOAL
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_goal (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  month_year  text NOT NULL,
  goal_text   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_goal ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_monthly_goal_athlete_id ON public.monthly_goal (athlete_id);


-- ---------------------------------------------------------------
-- 5. RMR (Resting Metabolic Rate)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rmr (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  rmr_kcal    integer NOT NULL,
  test_date   date NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rmr ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rmr_athlete_id ON public.rmr (athlete_id);
CREATE INDEX IF NOT EXISTS idx_rmr_test_date  ON public.rmr (test_date);


-- ---------------------------------------------------------------
-- 6. WORKOUT PROGRAM
-- Overarching training block (e.g. Phase 1 - 8 weeks).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_program (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id          uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  name                text NOT NULL,
  phase_number        integer,
  start_date          date NOT NULL,
  end_date            date,
  total_weeks         integer,
  trainerize_plan_id  integer,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_program ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workout_program_athlete_id ON public.workout_program (athlete_id);


-- ---------------------------------------------------------------
-- 7. WORKOUT TEMPLATE
-- Reusable workout definition -- NOT a logged instance.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_template (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id               uuid NOT NULL REFERENCES public.workout_program (id) ON DELETE CASCADE,
  name                     text NOT NULL,
  workout_type             text NOT NULL
                             CHECK (workout_type IN ('interval', 'strength', 'mobility', 'conditioning')),
  estimated_duration_mins  integer,
  equipment                text[],
  instructions             text,
  created_by               text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_template ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workout_template_program_id ON public.workout_template (program_id);


-- ---------------------------------------------------------------
-- 8. TRAINING SESSION
-- A single logged instance of an athlete completing a workout.
-- Distinct from test_session which is for physical assessments.
-- template_id is nullable to support ad hoc sessions.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_session (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id                uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  template_id               uuid REFERENCES public.workout_template (id) ON DELETE SET NULL,
  session_date              date NOT NULL,
  session_rpe               integer CHECK (session_rpe BETWEEN 1 AND 10),
  completed                 boolean NOT NULL DEFAULT true,
  early_termination_reason  text,
  duration_actual_mins      integer,
  practitioner_notes        text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_session ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_session_athlete_id   ON public.training_session (athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_session_session_date ON public.training_session (session_date);
CREATE INDEX IF NOT EXISTS idx_training_session_template_id  ON public.training_session (template_id);


-- ---------------------------------------------------------------
-- 9. EXERCISE SET
-- Granular record of every set in every training session.
--
-- Power vs strength units are mutually exclusive:
--   Strength -> reps + weight_kg
--   Interval  -> duration_secs + power_watts (NEVER weight_kg)
--
-- Trainerize wattage import note:
--   Trainerize exports AssaultBike watts in the "weight" field.
--   e.g. exported value "1199 kg" means 1199 W.
--   Always store in power_watts, never in weight_kg.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_set (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES public.training_session (id) ON DELETE CASCADE,
  exercise_name        text NOT NULL,
  exercise_category    text NOT NULL
                         CHECK (exercise_category IN ('strength', 'power', 'mobility', 'interval')),
  set_number           integer NOT NULL,
  cluster_number       integer,
  reps                 integer,
  weight_kg            numeric,
  power_watts          integer,
  target_power_watts   integer,
  duration_secs        integer,
  rest_secs            integer,
  each_side            boolean NOT NULL DEFAULT false,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_no_mixed_units CHECK (
    NOT (weight_kg IS NOT NULL AND power_watts IS NOT NULL)
  )
);

ALTER TABLE public.exercise_set ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_exercise_set_session_id ON public.exercise_set (session_id);


-- ---------------------------------------------------------------
-- 10. TRAINING WEEK SNAPSHOT
-- Stores the planned (primary) and actual (alternative) weekly
-- training schedule. One row per athlete per week.
--
-- JSON shape for primary_json / alternative_json:
-- {
--   "days": [            -- always 7 entries, Monday–Sunday
--     {
--       "day": "Monday",
--       "morning":   { "label": "Strength & Power", "intensity": "high" },
--       "afternoon": { "label": "—",                "intensity": "rest" },
--       "evening":   { "label": "—",                "intensity": "rest" },
--
--       "intensity_display": "HIGH | HIGH",
--       -- Editable free text shown in the INTENSITY column.
--       -- Default computed from slots:
--       --   1. Collect all non-empty slots (label != "—" and != "").
--       --   2. Dominant = "high" if any slot is high, "med" if any is med, else "rest".
--       --   3. Default display: "<DOMINANT> | <DOMINANT>" (e.g. "HIGH | HIGH").
--       -- The coach may override to show asymmetric values (e.g. "HIGH | MED").
--
--       "total_sessions_override": null,
--       -- null = auto-count non-empty slots.
--       -- integer = manual override for the TOTAL SESSIONS column.
--
--       "session_types": "Strength + S&C"
--       -- Free text for the SESSION TYPES column.
--     },
--     ... (× 7 days)
--   ]
-- }
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_week_snapshot (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  week_start_date   date NOT NULL,    -- must be a Monday (ISO DOW = 1)
  primary_json      jsonb NOT NULL,   -- coach-authored plan
  alternative_json  jsonb,            -- athlete-submitted actuals (nullable)
  adherence         text CHECK (adherence IN ('stuck_to_plan', 'changed')),
  week_notes        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_training_week_athlete_week
    UNIQUE (athlete_id, week_start_date),

  -- Enforce week_start_date is always a Monday
  CONSTRAINT chk_week_start_is_monday
    CHECK (EXTRACT(isodow FROM week_start_date) = 1)
);

ALTER TABLE public.training_week_snapshot ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_week_snapshot_athlete_id
  ON public.training_week_snapshot (athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_week_snapshot_week_start
  ON public.training_week_snapshot (week_start_date);
