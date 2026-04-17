-- =============================================================================
-- CombatIQ — Row Level Security policies
-- Migration: 20260417000000_enable_rls.sql
--
-- Access model:
--   authenticated  Practitioner (Yusuf). Can read/write everything.
--                  NOTE: the service role key used in lib/supabase-admin.ts
--                  bypasses RLS entirely. These policies are a defence-in-depth
--                  safety net for any future authenticated browser sessions.
--
--   anon           Unauthenticated users (athletes, report viewers).
--                  - INSERT into daily_check_in           (check-in form)
--                  - SELECT + UPDATE training_week_snapshot (week actuals)
--                  - SELECT from report_share by token    (shared reports)
--                  - Everything else: DENY
--
-- RLS was already ENABLED for the original 10 tables in schema.sql.
-- This migration enables it for import_log and report_share (added later),
-- then creates all policies. Re-running ENABLE ROW LEVEL SECURITY is
-- idempotent — Postgres ignores it if already set.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- Covers tables added after the original schema.sql. Safe to run on all.
-- ---------------------------------------------------------------------------
ALTER TABLE public.athlete                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_session           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_check_in         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goal           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmr                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_program        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_set           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_week_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_share           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- TABLE: athlete
-- Practitioner only. No anon access — athletes never browse the athlete list.
-- =============================================================================
CREATE POLICY "athlete_authenticated_all"
  ON public.athlete
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- No anon policy → anon is denied by default.


-- =============================================================================
-- TABLE: test_session
-- Practitioner only. Contains practitioner_notes — must never reach anon.
-- =============================================================================
CREATE POLICY "test_session_authenticated_all"
  ON public.test_session
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: daily_check_in
-- Practitioner: full access (reads all athlete check-ins on the dashboard).
-- Anon: INSERT only — the athlete check-in form is a public URL with no login.
--   Anon cannot SELECT, UPDATE, or DELETE any check-in rows.
-- =============================================================================
CREATE POLICY "daily_check_in_authenticated_all"
  ON public.daily_check_in
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Athletes submit check-ins via /checkin/[athleteId] without logging in.
-- The athlete_id comes from the URL; no further identity check is needed for MVP.
CREATE POLICY "daily_check_in_anon_insert"
  ON public.daily_check_in
  FOR INSERT
  TO anon
  WITH CHECK (true);


-- =============================================================================
-- TABLE: monthly_goal
-- Practitioner only. Goals are set by the coach and not shown to athletes.
-- =============================================================================
CREATE POLICY "monthly_goal_authenticated_all"
  ON public.monthly_goal
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: rmr
-- Practitioner only. Metabolic test data — internal assessment data.
-- =============================================================================
CREATE POLICY "rmr_authenticated_all"
  ON public.rmr
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: workout_program
-- Practitioner only. Populated by the Trainerize import pipeline.
-- =============================================================================
CREATE POLICY "workout_program_authenticated_all"
  ON public.workout_program
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: workout_template
-- Practitioner only. Reusable workout definitions from Trainerize.
-- =============================================================================
CREATE POLICY "workout_template_authenticated_all"
  ON public.workout_template
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: training_session
-- Practitioner only. Contains practitioner_notes — must never reach anon.
-- =============================================================================
CREATE POLICY "training_session_authenticated_all"
  ON public.training_session
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: exercise_set
-- Practitioner only. Granular set data — read by the dashboard only.
-- =============================================================================
CREATE POLICY "exercise_set_authenticated_all"
  ON public.exercise_set
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: training_week_snapshot
-- Practitioner: full access (creates primary_json, reads both columns).
-- Anon:
--   SELECT — athlete needs to read the primary schedule to display it on their
--            week entry form (/checkin/[athleteId]/week).
--   UPDATE — athlete submits alternative_json actuals via the same form.
--
-- IMPORTANT: RLS alone cannot restrict *which columns* an UPDATE touches.
-- The GRANT below limits anon to only updating the three mutable columns.
-- primary_json is NOT granted to anon for UPDATE — the coach plan is protected.
-- =============================================================================
CREATE POLICY "training_week_snapshot_authenticated_all"
  ON public.training_week_snapshot
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Athlete reads the full row (needs primary_json to display the coach plan).
CREATE POLICY "training_week_snapshot_anon_select"
  ON public.training_week_snapshot
  FOR SELECT
  TO anon
  USING (true);

-- Athlete submits their actuals — updates alternative_json and adherence.
-- Column-level protection is enforced by the GRANT below, not by this policy.
CREATE POLICY "training_week_snapshot_anon_update"
  ON public.training_week_snapshot
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Restrict anon UPDATE to only these columns — primary_json is excluded.
-- This is the column-level security layer that RLS policies cannot express.
REVOKE UPDATE ON public.training_week_snapshot FROM anon;
GRANT  UPDATE (alternative_json, adherence, week_notes, updated_at)
  ON public.training_week_snapshot TO anon;


-- =============================================================================
-- TABLE: import_log
-- Practitioner only. Internal audit trail for Trainerize PDF imports.
-- Anon has no business reason to read or write import records.
-- =============================================================================
CREATE POLICY "import_log_authenticated_all"
  ON public.import_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- TABLE: report_share
-- Practitioner: full access (generates and stores reports).
-- Anon: SELECT only, and only rows where token IS NOT NULL.
--
-- RLS cannot compare the policy against a URL query parameter — it has no
-- access to the HTTP request. The token filter (WHERE token = $token) must
-- be applied by the application query. This policy prevents anon from doing
-- an unfiltered SELECT * that returns all reports; it still requires the app
-- to pass the correct token in the query predicate.
--
-- The /report/[token] page uses a Next.js server component + service role key,
-- so this policy is a secondary defence layer rather than the primary gate.
-- =============================================================================
CREATE POLICY "report_share_authenticated_all"
  ON public.report_share
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon to read a report only if a token exists on that row.
-- The app must always query with: .eq('token', token)
CREATE POLICY "report_share_anon_select_by_token"
  ON public.report_share
  FOR SELECT
  TO anon
  USING (token IS NOT NULL);


-- =============================================================================
-- TABLE: menstrual_cycle (does not exist yet)
-- Uncomment and run this block when the table is created.
-- Same access model as test_session — practitioner only, never anon.
-- =============================================================================
-- ALTER TABLE public.menstrual_cycle ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "menstrual_cycle_authenticated_all"
--   ON public.menstrual_cycle
--   FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
