CREATE TABLE IF NOT EXISTS public.menstrual_cycle (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        uuid        NOT NULL REFERENCES public.athlete(id) ON DELETE CASCADE,
  cycle_start_date  date        NOT NULL,
  cycle_length_days integer     NOT NULL DEFAULT 28 CHECK (cycle_length_days BETWEEN 21 AND 45),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.menstrual_cycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access"
  ON public.menstrual_cycle
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon insert"
  ON public.menstrual_cycle
  FOR INSERT
  TO anon
  WITH CHECK (true);
