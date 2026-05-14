import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMondayOfWeek, formatWeekRange } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot, WeekScheduleJson, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import { WeekAlternativeForm } from "./WeekAlternativeForm";

// ─── Read-only slot display ────────────────────────────────────────────────────

const INTENSITY_BADGE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-50 text-emerald-700 border-emerald-200",
  med:  "bg-amber-50  text-amber-700  border-amber-200",
  high: "bg-red-50    text-red-700    border-red-200",
};

function SlotRow({ period, slot }: { period: string; slot: WeekSlot }) {
  const isEmpty = !slot.label || slot.label === "—";
  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {period}
      </p>
      {isEmpty ? (
        <span className="text-sm text-muted-foreground">Rest</span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{slot.label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${INTENSITY_BADGE[slot.intensity]}`}>
            {slot.intensity.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WeekCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const { athleteId } = await params;
  const { weekStart: rawWeekStart } = await searchParams;

  const { data: athlete } = await supabaseAdmin
    .from("athlete")
    .select("id, name")
    .eq("id", athleteId)
    .single();

  if (!athlete) notFound();

  const currentWeekStart = getMondayOfWeek(new Date());

  // Resolve weekStart — default to current week
  let weekStart = currentWeekStart;
  if (rawWeekStart) {
    const d = new Date(`${rawWeekStart}T00:00:00`);
    if (!isNaN(d.getTime()) && d.getDay() === 1) weekStart = rawWeekStart;
  }

  const isCurrentWeek = weekStart === currentWeekStart;

  const { data: snapshot } = await supabaseAdmin
    .from("training_week_snapshot")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  const typedSnapshot = snapshot as TrainingWeekSnapshot | null;
  const primarySchedule = (typedSnapshot?.primary_json ?? null) as WeekScheduleJson | null;
  const existingAlternative = (typedSnapshot?.alternative_json ?? null) as WeekScheduleJson | null;

  // ── Non-current week: read-only plan view ──────────────────────────────────
  if (!isCurrentWeek) {
    const weekLabel = formatWeekRange(weekStart);
    return (
      <div className="min-h-screen bg-background">
        <header
          className="bg-primary text-primary-foreground px-5 pb-6"
          style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
        >
          <p className="text-sm text-primary-foreground/70 mb-1">{weekLabel}</p>
          <h1 className="text-2xl font-bold">{athlete.name}</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Your training plan</p>
        </header>

        <div
          className="px-4 py-6 flex flex-col gap-5 max-w-lg mx-auto"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          {primarySchedule ? (
            primarySchedule.days.map((day) => (
              <div key={day.day} className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {day.day}
                </p>
                <div className="rounded-xl border border-border bg-background px-4">
                  <SlotRow period="Morning"   slot={day.morning}   />
                  <SlotRow period="Afternoon" slot={day.afternoon} />
                  <SlotRow period="Evening"   slot={day.evening}   />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No training plan has been set for this week yet.
            </p>
          )}

          <p className="text-xs text-center text-muted-foreground mt-2">
            This is your planned schedule. Come back during the week if anything changes.
          </p>
        </div>
      </div>
    );
  }

  // ── Current week: deviation form ───────────────────────────────────────────
  return (
    <WeekAlternativeForm
      athleteId={athlete.id}
      athleteName={athlete.name}
      weekStart={weekStart}
      primarySchedule={primarySchedule}
      existingAlternative={existingAlternative}
    />
  );
}
