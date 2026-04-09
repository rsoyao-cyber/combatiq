# CombatIQ — Claude Code Context

## What this is
An MVP platform for tracking combat athlete performance.
Practitioner enters test data. Athletes submit daily check-ins.
Claude API generates monthly review reports and pre-fight readiness reports.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL) for all data
- Anthropic Claude API (claude-sonnet-4-6) for report generation
- Recharts for trend visualisation
- Deployed to Vercel

## Check-in scale
All athlete ratings use 0-5 (0 = very poor, 5 = excellent)

## Who fills in what
- Athlete: daily check-in form (mobile link, no login required)
- Practitioner (Yusuf): test session data, monthly goals, notes

## Key domain rules
- Never show practitioner notes to athletes
- Report generation must include traffic-light scoring vs benchmarks
- Pre-fight report must be positively framed (strengths only)

## Coding conventions
- Named exports only
- async/await, never .then()
- Supabase client lives in lib/supabase.ts
- All DB types auto-generated from Supabase schema
