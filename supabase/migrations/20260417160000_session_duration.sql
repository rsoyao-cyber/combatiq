-- Add session_duration_mins to daily_check_in for Foster sRPE load calculation
ALTER TABLE public.daily_check_in
  ADD COLUMN IF NOT EXISTS session_duration_mins integer CHECK (session_duration_mins >= 0 AND session_duration_mins <= 480);
