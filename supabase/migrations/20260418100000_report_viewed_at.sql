ALTER TABLE public.report_share
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
