# CombatIQ — Claude Code Context

## What this is
An MVP platform for tracking combat athlete performance.
Practitioner enters test data. Athletes submit daily check-ins and weekly
schedule actuals. Claude API generates monthly review reports and pre-fight
readiness reports.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase (PostgreSQL) for all data
- Anthropic Claude API (claude-sonnet-4-6) for report generation
- shadcn/ui (base-nova style, @base-ui/react primitives) for all UI components
- tweakcn indigo/violet theme via CSS custom properties
- Recharts for trend visualisation
- Deployed to Vercel

## Check-in scale
All athlete ratings use 0-5 (0 = very poor, 5 = excellent)

## Who fills in what
- Athlete: daily check-in form (mobile link, no login required)
  also: alternative week schedule via /checkin/[athleteId]/week
- Practitioner (Yusuf): test session data, monthly goals, notes, primary week schedule

## Key domain rules
- Never show practitioner notes to athletes
- Report generation must include traffic-light scoring vs benchmarks
- Pre-fight report must be positively framed (strengths only)
- Both reports are written in first person — coach speaking directly to the athlete

## Coding conventions
- Named exports only
- async/await, never .then()
- Supabase client lives in lib/supabase.ts (browser/anon key)
- Supabase admin client lives in lib/supabase-admin.ts (service role key, server only)
- All DB types hand-maintained in lib/database.types.ts

## UI conventions
- All components use shadcn/ui base-nova style (@base-ui/react primitives)
- base-nova Button does NOT support asChild — use buttonVariants({variant, size}) + cn() applied directly to <Link> instead
- Theme tokens (bg-primary, text-foreground, text-muted-foreground, etc.) are used throughout — never hardcode zinc/amber colours for structural elements
- Traffic-light colours (emerald/amber/red) for rest/med/high intensity are intentional exceptions
- Range slider thumb colour is set via var(--primary) in globals.css
- Theme defined in app/globals.css using tweakcn oklch CSS custom properties

## Primary data ingestion flow
Yusuf uploads Trainerize PDF exports. The system parses them via
Claude API and populates the database after a human review step.
Manual form entry is the fallback only.

## Trainerize extraction prompt

Use this exact prompt when calling the Anthropic API in
app/api/parse-trainerize/route.ts:

"You are extracting structured training data from a Trainerize PDF
export for a combat sports performance tracking system.

Return ONLY valid JSON with no preamble. Structure:

{
  "athlete_name": string,
  "program": {
    "name": string,
    "phase_number": number | null,
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD" | null,
    "total_weeks": number | null,
    "trainerize_plan_id": number | null
  },
  "workout_templates": [
    {
      "name": string,
      "workout_type": "interval"|"strength"|"mobility"|"conditioning",
      "estimated_duration_mins": number | null,
      "equipment": string[],
      "instructions": string,
      "power_benchmarks": [
        {
          "rep_number": number,
          "threshold_watts": number,
          "action_if_below": string
        }
      ]
    }
  ],
  "training_sessions": [
    {
      "workout_template_name": string,
      "session_date": "YYYY-MM-DD",
      "exercise_sets": [
        {
          "exercise_name": string,
          "exercise_category": "strength"|"power"|"mobility"|"interval",
          "set_number": number,
          "cluster_number": number | null,
          "reps": number | null,
          "weight_kg": number | null,
          "power_watts": number | null,
          "target_power_watts": number | null,
          "duration_secs": number | null,
          "each_side": boolean
        }
      ]
    }
  ]
}

CRITICAL UNIT RULE: Trainerize stores AssaultBike power output in the
weight field labelled kg. Any value from an AssaultBike or interval
exercise must be written to power_watts, never weight_kg. A value of
1199 from an AssaultBike set means 1199 watts, not 1199 kilograms.

Sessions appear in the Previous Stats tables -- extract ALL dated rows,
one TrainingSession object per date column."

## Import flow order
Upload PDF -> /api/parse-trainerize -> review at /dashboard/import/review
-> confirm -> /api/confirm-import -> Supabase write

## Trainerize unit collision
AssaultBike power is exported as kg in Trainerize but means watts.
Always write to power_watts column, never weight_kg.

## Report share flow
Generate report -> store in report_share table with uuid token ->
shareable URL is /report/[token] -> no login required to view ->
first page load sets viewed_at (read receipt, supabaseAdmin, server component, silent) ->
PATCH /api/report-share { id } extends expires_at by 30 days from current expiry

## Training week schedule
Stored in training_week_snapshot table. One row per athlete per week_start_date
(always a Monday). Two JSONB columns:
- primary_json: coach-authored plan (7 days, 3 slots each)
- alternative_json: athlete-submitted actuals (same shape, nullable)

JSON shape for both columns:
{
  "days": [
    {
      "day": "Monday",                        // Monday–Sunday
      "morning":   { "label": "Strength", "intensity": "high" },
      "afternoon": { "label": "—",        "intensity": "rest" },
      "evening":   { "label": "—",        "intensity": "rest" },
      "intensity_display": "HIGH | HIGH",     // editable; auto-derived from slots
      "total_sessions_override": null,        // null = auto-count non-empty slots
      "session_types": "Strength + S&C"
    }
    // × 7 days
  ]
}

Intensity values: "rest" | "med" | "high"
Traffic-light display: GREEN = rest, AMBER = med, RED = high

intensity_display default rule (also in computeIntensityDisplay() in lib/training-week-types.ts):
  dominant = highest intensity across non-empty slots → "HIGH | HIGH", "MED | MED", "REST | REST"
  Coach may override to show asymmetric values e.g. "HIGH | MED".

total_sessions_override: null means count of slots where label != "—".

Key files:
- lib/training-week-types.ts      — all types + utility functions
- app/api/training-week/route.ts  — GET + PUT (type: "primary" | "alternative")
- components/TrainingWeekTable.tsx — reusable table (readOnly + editable modes)
- app/dashboard/athlete/[id]/WeekSchedulePanel.tsx — dashboard section (week nav, legend, both tables)
- app/checkin/[athleteId]/week/   — athlete alternative week entry

Coach flow: dashboard → Edit primary table → Save
Athlete flow: /checkin/[athleteId]/week?weekStart=YYYY-MM-DD → fill alternative → Submit

Report generation includes training_week_schedule stats in the stats JSON passed to
the Claude prompt (slot counts, adherence, consecutive high-day flags across last 5 weeks).
Model must not fabricate sessions; if alternative is missing, must say so.

## Athlete dashboard section order
1. Page header (name, sport, RAG badge, Monthly Report + Pre-Fight Report buttons, Import PDF button)
2. Stat strip — current weight, last session load, last session RPE, weeks in program
3. Monthly goal editor
4. Two-column grid (left: weight chart, training load chart, menstrual cycle*, wellbeing trends, training performance, injury log | right: sticky weekly schedule panel)
5. Recent activity — last 7 check-ins
6. Session history — last 40 sessions
7. Reports — Data Completeness card + Report History table
(* female athletes only)

## Weight tracking
Athletes log body weight (kg) in the daily check-in form (optional field).
Stored in daily_check_in.weight_kg (numeric, nullable).
Dashboard shows a Recharts LineChart with:
- Actual weight: solid primary-coloured line from check-in data
- Target trend: dashed emerald line, −1% compound per week from first logged weight
- 8-week window
Key files:
- lib/analytics.ts — getWeightTrends(athleteId, weeks=8) returns { actuals, targets }
- app/dashboard/athlete/[id]/WeightChart.tsx — the chart component
SQL: ALTER TABLE public.daily_check_in ADD COLUMN weight_kg numeric;

## Report generation — current prompt approach
Both report types are written in first person, as the coach speaking directly
to the athlete. Use "I", "you", "your", "we" throughout.

Monthly report: professional, direct, evidence-based. Coach reviewing the
month with the athlete ("I've been tracking your progress...",
"I want you to focus on...").

Pre-fight report: confident, personal, positively framed only. Coach
speaking before a fight ("I've watched you build through this camp...",
"I'm confident you're ready..."). No weakness or deficit language. No
injury mention.

Prompts live in app/api/generate-report/route.ts.
