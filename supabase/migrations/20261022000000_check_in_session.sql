-- =============================================================================
-- Per-session training records
--
-- Until now the check-in form collapsed up to 5 sessions into one daily row
-- (average RPE, total minutes), and load was computed as RPE × 2 × minutes.
-- This table stores one row per session; load is RPE × minutes (Foster sRPE),
-- computed by the database so every reader agrees.
--
-- daily_check_in.session_rpe / session_duration_mins / sparring_load_rounds /
-- session_types are deprecated: no longer written, kept for rollback.
--
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.check_in_session (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id      uuid NOT NULL REFERENCES public.daily_check_in (id) ON DELETE CASCADE,
  athlete_id       uuid NOT NULL REFERENCES public.athlete (id) ON DELETE CASCADE,
  session_date     date NOT NULL,
  position         smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
  session_types    text[] NOT NULL DEFAULT '{}',
  duration_mins    integer NOT NULL CHECK (duration_mins BETWEEN 1 AND 480),
  rpe              integer NOT NULL CHECK (rpe BETWEEN 0 AND 10),
  load_au          integer GENERATED ALWAYS AS (rpe * duration_mins) STORED,
  sparring_rounds  integer CHECK (sparring_rounds >= 0),
  source           text NOT NULL DEFAULT 'athlete' CHECK (source IN ('athlete', 'backfill')),
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_check_in_session_position UNIQUE (check_in_id, position)
);

CREATE INDEX IF NOT EXISTS idx_check_in_session_athlete_date
  ON public.check_in_session (athlete_id, session_date);

-- Practitioner only. Athletes write through /api/log-checkin (service role).
ALTER TABLE public.check_in_session ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'check_in_session'
      AND policyname = 'check_in_session_authenticated_all'
  ) THEN
    CREATE POLICY "check_in_session_authenticated_all"
      ON public.check_in_session
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- replace_check_in_sessions: swap a day's sessions in one transaction.
-- p_sessions: [{ "session_types": [...], "duration_mins": 60, "rpe": 7,
--               "sparring_rounds": 4 | null }, ...] — array order = position.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_check_in_sessions(
  p_check_in_id uuid,
  p_sessions    jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_athlete_id uuid;
  v_date       date;
BEGIN
  SELECT athlete_id, checkin_date INTO v_athlete_id, v_date
  FROM daily_check_in
  WHERE id = p_check_in_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'check-in % not found', p_check_in_id;
  END IF;

  DELETE FROM check_in_session WHERE check_in_id = p_check_in_id;

  INSERT INTO check_in_session (
    check_in_id, athlete_id, session_date, position,
    session_types, duration_mins, rpe, sparring_rounds
  )
  SELECT
    p_check_in_id,
    v_athlete_id,
    v_date,
    s.ord::smallint,
    ARRAY(SELECT jsonb_array_elements_text(s.value -> 'session_types')),
    (s.value ->> 'duration_mins')::integer,
    (s.value ->> 'rpe')::integer,
    (s.value ->> 'sparring_rounds')::integer
  FROM jsonb_array_elements(COALESCE(p_sessions, '[]'::jsonb)) WITH ORDINALITY AS s(value, ord);
END;
$$;

-- Only the server (service role) may call it.
REVOKE ALL ON FUNCTION public.replace_check_in_sessions(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_check_in_sessions(uuid, jsonb) TO service_role;


-- ---------------------------------------------------------------------------
-- Backfill: one session per historical day that recorded a duration.
-- Multi-session days were already averaged, so they stay approximate.
-- Days with RPE but no duration were the form's default value, not a session.
-- ---------------------------------------------------------------------------
INSERT INTO public.check_in_session (
  check_in_id, athlete_id, session_date, position,
  session_types, duration_mins, rpe, sparring_rounds, source
)
SELECT
  d.id,
  d.athlete_id,
  d.checkin_date,
  1,
  COALESCE(d.session_types, '{}'),
  d.session_duration_mins,
  d.session_rpe,
  d.sparring_load_rounds,
  'backfill'
FROM public.daily_check_in d
WHERE d.session_duration_mins >= 1
  AND d.session_rpe IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.check_in_session s WHERE s.check_in_id = d.id
  );
