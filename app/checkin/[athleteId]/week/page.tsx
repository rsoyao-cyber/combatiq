import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMondayOfWeek, formatWeekRange } from "@/lib/training-week-types";
import type { TrainingWeekSnapshot, WeekScheduleJson, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import { WeekAlternativeForm } from "./WeekAlternativeForm";
import { BrandMark } from "@/components/checkin/BrandMark";

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
      <div className="dark min-h-screen bg-background text-foreground">
        <header
          className="max-w-lg mx-auto px-5 pb-2 flex flex-col gap-4"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <BrandMark />
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-medium text-muted-foreground">{weekLabel} · {athlete.name}</p>
            <h1 className="font-display text-[34px] leading-none font-bold uppercase tracking-wide">Your training plan</h1>
          </div>
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
                <div className="rounded-2xl border border-border bg-card px-4">
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
    <div className="dark text-foreground">
    <WeekAlternativeForm
      athleteId={athlete.id}
      athleteName={athlete.name}
      weekStart={weekStart}
      primarySchedule={primarySchedule}
      existingAlternative={existingAlternative}
    />
    </div>
  );
}
