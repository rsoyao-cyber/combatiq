# CombatIQ

Combat athlete performance tracking and insights platform.

Practitioners enter test and training data. Athletes submit daily wellness check-ins and weekly schedule actuals via mobile-friendly links (no login required). Claude generates monthly review reports and pre-fight readiness reports from the accumulated data.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL) — database, auth, Row Level Security
- **Anthropic Claude API** (`claude-sonnet-4-6`) — report generation
- **Recharts** — trend visualisation
- **Vercel** — deployment

## Database schema

10 tables, all in the `public` schema. Full SQL in [supabase/schema.sql](supabase/schema.sql). TypeScript types hand-maintained at [lib/database.types.ts](lib/database.types.ts).

| Table | Purpose |
|---|---|
| `athlete` | Athlete profiles — sport, weight class, competition level, Trainerize link |
| `test_session` | One-off physical assessments (CMJ, grip strength, Yo-Yo, sprint, body comp) stored as `results_json` |
| `daily_check_in` | Athlete-submitted daily wellness snapshot — sleep, fatigue, focus, mood, stress, diet, RPE, injury |
| `monthly_goal` | Practitioner-set monthly goals per athlete |
| `rmr` | Resting metabolic rate measurements |
| `workout_program` | Overarching training block (e.g. Phase 1, 8 weeks) |
| `workout_template` | Reusable workout definitions — interval / strength / mobility / conditioning |
| `training_session` | Logged instance of an athlete completing a workout on a specific date |
| `exercise_set` | Granular set-level data — reps × kg for strength, duration × watts for power/interval |
| `training_week_snapshot` | Weekly training schedule — coach plan (`primary_json`) and athlete actuals (`alternative_json`), plus adherence and notes |

### Key data rules

- All athlete wellness ratings use a **0–5 scale** (0 = very poor, 5 = excellent)
- RPE uses **1–10**
- Power and weight units are **mutually exclusive** on `exercise_set` — watts go in `power_watts`, never `weight_kg`. Trainerize exports AssaultBike wattage in the weight field (e.g. "1199 kg" = 1199 W) — always remap on import.
- Practitioner notes are **never** exposed to athletes

## Who fills in what

| Role | Action | Route |
|---|---|---|
| Athlete | Daily wellness check-in | `/checkin/[athleteId]` |
| Athlete | Alternative (actual) week schedule | `/checkin/[athleteId]/week` |
| Practitioner (Yusuf) | Test session data, training logs, monthly goals | `/dashboard` |
| Practitioner (Yusuf) | Primary (planned) week schedule | `/dashboard/athlete/[id]` → Weekly training schedule |
| Practitioner (Yusuf) | Import Trainerize PDF, generate reports | `/dashboard/athlete/[id]` |

## Weekly training schedule

The practitioner sets a **primary** (planned) week; the athlete submits an **alternative** (actual) week. Both use the same 7-day × 3-slot structure (morning / afternoon / evening), each slot having a label and an intensity:

| Colour | Intensity | Meaning |
|---|---|---|
| 🟢 Green | `rest` | Recovery session or rest day |
| 🟡 Amber | `med` | Medium-load session |
| 🔴 Red | `high` | High-intensity session |

The **INTENSITY** column shows a paired display (e.g. `HIGH | HIGH`) derived automatically from the slot intensities — editable by the coach. **TOTAL SESSIONS** defaults to the count of non-empty slots with a manual override option.

Report generation includes a compact training week summary (slot counts, adherence, consecutive high-day flags) in the stats JSON sent to Claude.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Regenerate database types

```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase gen types typescript \
  --project-id iunyfcarxsizlblobnxn \
  > lib/database.types.ts
```

Get a token at: Supabase Dashboard → Account → Access Tokens.
