import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CheckInForm } from "./CheckInForm";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const today = new Date().toISOString().split("T")[0];

  const [{ data: athlete }, { data: existingCheckIn }] = await Promise.all([
    supabaseAdmin
      .from("athlete")
      .select("id, name, sex")
      .eq("id", athleteId)
      .single(),

    supabaseAdmin
      .from("daily_check_in")
      .select(
        "sleep_quality, sleep_hours, physical_fatigue, mental_focus, motivation, mood, stress, diet_quality, hitting_nutrition_targets, weight_kg, check_in_timing",
      )
      .eq("athlete_id", athleteId)
      .eq("checkin_date", today)
      .maybeSingle(),
  ]);

  if (!athlete) notFound();

  return (
    <CheckInForm
      athleteId={athlete.id}
      athleteName={athlete.name}
      isFemale={athlete.sex === "female"}
      existingCheckIn={existingCheckIn ?? null}
    />
  );
}
