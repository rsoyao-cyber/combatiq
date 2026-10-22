-- Columns and constraint previously applied by hand from the README's
-- "Pending DB migrations" section. Already live in production; written
-- to be safe to re-run.

-- Session activity types (multi-select chips on check-in form)
ALTER TABLE public.daily_check_in
  ADD COLUMN IF NOT EXISTS session_types text[];

-- Two-phase check-in (morning wellbeing pass + post-training completion)
ALTER TABLE public.daily_check_in
  ADD COLUMN IF NOT EXISTS check_in_timing text;

-- Optional body weight logged on the check-in form (WeightChart)
ALTER TABLE public.daily_check_in
  ADD COLUMN IF NOT EXISTS weight_kg numeric;

-- Required for upsert-on-conflict in /api/log-checkin.
-- ADD CONSTRAINT has no IF NOT EXISTS, so guard it manually.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_check_in_athlete_date_unique'
  ) THEN
    ALTER TABLE public.daily_check_in
      ADD CONSTRAINT daily_check_in_athlete_date_unique
      UNIQUE (athlete_id, checkin_date);
  END IF;
END $$;
