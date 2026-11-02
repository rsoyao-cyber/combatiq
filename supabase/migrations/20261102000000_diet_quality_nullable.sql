-- Morning-only check-ins don't ask about diet (it's an end-of-day question),
-- but the column was NOT NULL, so the form sent a made-up default of 3.
-- Allow NULL so an unanswered rating is stored as unanswered. Safe to re-run.
ALTER TABLE public.daily_check_in
  ALTER COLUMN diet_quality DROP NOT NULL;
