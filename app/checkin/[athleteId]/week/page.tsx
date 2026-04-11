import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMondayOfWeek } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot, WeekScheduleJson } from "@/lib/training-week-types";
import { WeekAlternativeForm } from "./WeekAlternativeForm";

export default async function WeekCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const { athleteId } = await params;
  const { weekStart: rawWeekStart } = await searchParams;

  // Validate athlete exists
  const { data: athlete } = await supabaseAdmin
    .from("athlete")
    .select("id, name")
    .eq("id", athleteId)
    .single();

  if (!athlete) notFound();

  // Resolve weekStart: use query param if provided (and it's a Monday),
  // otherwise default to the current week's Monday.
  const defaultWeekStart = getMondayOfWeek(new Date());
  let weekStart = defaultWeekStart;

  if (rawWeekStart) {
    // Verify it's a Monday before accepting
    const d = new Date(`${rawWeekStart}T00:00:00`);
    if (!isNaN(d.getTime()) && d.getDay() === 1) {
      weekStart = rawWeekStart;
    }
  }

  // Fetch existing snapshot (if any) — used to pre-fill the form
  const { data: snapshot } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  const typedSnapshot = snapshot as TrainingWeekSnapshot | null;

  // Pre-fill priority: alternative_json (if already submitted) > primary_json > null
  const prefill: WeekScheduleJson | null =
    typedSnapshot?.alternative_json ?? typedSnapshot?.primary_json ?? null;

  return (
    <WeekAlternativeForm
      athleteId={athlete.id}
      athleteName={athlete.name}
      weekStart={weekStart}
      prefill={prefill}
    />
  );
}
