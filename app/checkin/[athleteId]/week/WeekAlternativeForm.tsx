"use client";

import { useState } from "react";
import type { WeekScheduleJson, WeekDay, WeekSlot, SlotIntensity, Adherence } from "@/lib/training-week-types";
import { emptyWeekSchedule, computeIntensityDisplay } from "@/lib/training-week-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

// ─── Traffic-light colours (keep rest/med/high as-is) ────────────────────────

const INTENSITY_BADGE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-50 text-emerald-700 border-emerald-200",
  med:  "bg-amber-50  text-amber-700  border-amber-200",
  high: "bg-red-50    text-red-700    border-red-200",
};

const INTENSITY_ACTIVE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-500 text-white border-emerald-500",
  med:  "bg-amber-500  text-white border-amber-500",
  high: "bg-red-500    text-white border-red-500",
};

const INTENSITY_OPTIONS: { value: SlotIntensity; label: string }[] = [
  { value: "rest", label: "REST" },
  { value: "med",  label: "MED"  },
  { value: "high", label: "HIGH" },
];

// ─── Slot row ─────────────────────────────────────────────────────────────────

function SlotRow({
  period,
  slot,
  dayIndex,
  onChange,
}: {
  period: string;
  slot: WeekSlot;
  dayIndex: number;
  onChange: (s: WeekSlot) => void;
}) {
  const isEmpty = !slot.label || slot.label === "—";
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{period}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={isEmpty ? "" : slot.label}
          placeholder="—"
          maxLength={200}
          aria-label={`${period} session description for day ${dayIndex + 1}`}
          onChange={(e) => onChange({ ...slot, label: e.target.value || "—" })}
          className="flex-1 border border-input rounded-lg px-3 py-2 text-foreground bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex rounded-lg overflow-hidden border border-input text-xs font-semibold">
          {INTENSITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...slot, intensity: value })}
              className={`px-2.5 py-2 transition-colors ${
                slot.intensity === value
                  ? INTENSITY_ACTIVE[value]
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              aria-label={`Set ${period} intensity to ${label}`}
              aria-pressed={slot.intensity === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

function DayCard({
  day,
  dayIndex,
  onChange,
}: {
  day: WeekDay;
  dayIndex: number;
  onChange: (d: WeekDay) => void;
}) {
  function updateSlot(period: "morning" | "afternoon" | "evening", next: WeekSlot) {
    const updated = { ...day, [period]: next };
    onChange({ ...updated, intensity_display: computeIntensityDisplay(updated) });
  }

  const dominantIntensity: SlotIntensity = (() => {
    const raw = day.intensity_display.toLowerCase();
    if (raw.includes("high")) return "high";
    if (raw.includes("med"))  return "med";
    return "rest";
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">{day.day}</CardTitle>
          <Badge variant="outline" className={`text-xs font-bold ${INTENSITY_BADGE[dominantIntensity]}`}>
            {day.intensity_display || "REST | REST"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SlotRow period="Morning"   slot={day.morning}   dayIndex={dayIndex} onChange={(s) => updateSlot("morning", s)} />
        <SlotRow period="Afternoon" slot={day.afternoon} dayIndex={dayIndex} onChange={(s) => updateSlot("afternoon", s)} />
        <SlotRow period="Evening"   slot={day.evening}   dayIndex={dayIndex} onChange={(s) => updateSlot("evening", s)} />

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Session types</p>
          <input
            type="text"
            value={day.session_types}
            placeholder="e.g. Strength + S&C"
            maxLength={500}
            aria-label={`Session types for ${day.day}`}
            onChange={(e) => onChange({ ...day, session_types: e.target.value })}
            className="w-full border border-input rounded-lg px-3 py-2 text-foreground bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function WeekAlternativeForm({
  athleteId,
  athleteName,
  weekStart,
  prefill,
}: {
  athleteId: string;
  athleteName: string;
  weekStart: string;
  prefill: WeekScheduleJson | null;
}) {
  const [schedule, setSchedule] = useState<WeekScheduleJson>(
    prefill ?? emptyWeekSchedule(),
  );
  const [adherence, setAdherence] = useState<Adherence>(null);
  const [weekNotes, setWeekNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const weekEnd = new Date(`${weekStart}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const weekLabel = `${fmt(new Date(`${weekStart}T00:00:00`))} – ${fmt(weekEnd)}`;

  function updateDay(i: number, next: WeekDay) {
    setSchedule({ days: schedule.days.map((d, idx) => (idx === i ? next : d)) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch("/api/training-week", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId,
        weekStart,
        type: "alternative",
        alternative_json: schedule,
        adherence,
        week_notes: weekNotes || null,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setErrorMsg(err.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Week submitted</h1>
        <p className="text-muted-foreground">Thanks {athleteName}. Your alternative week has been saved.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-5 pb-6" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
        <p className="text-sm text-primary-foreground/70 mb-1">Week of {weekLabel}</p>
        <h1 className="text-2xl font-bold">{athleteName}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">What did your week actually look like?</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-4 py-6 flex flex-col gap-4 max-w-lg mx-auto"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {schedule.days.map((day, i) => (
          <DayCard
            key={day.day}
            day={day}
            dayIndex={i}
            onChange={(next) => updateDay(i, next)}
          />
        ))}

        {/* Adherence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              How did it go?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-foreground">Did you stick to the plan?</p>
              <div className="flex gap-3">
                {[
                  { label: "Stuck to plan", value: "stuck_to_plan" as const },
                  { label: "Had to change", value: "changed" as const },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAdherence(adherence === value ? null : value)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors border ${
                      adherence === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-input hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="week_notes" className="text-base font-semibold text-foreground">
                Any notes about the week?
              </Label>
              <textarea
                id="week_notes"
                rows={3}
                maxLength={1000}
                placeholder="Travel, illness, schedule changes…"
                value={weekNotes}
                onChange={(e) => setWeekNotes(e.target.value)}
                className="border border-input rounded-lg px-4 py-3 text-foreground bg-background placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={status === "submitting"}
          className="w-full h-14 text-base font-bold rounded-2xl"
        >
          {status === "submitting" ? "Submitting…" : "Submit my week"}
        </Button>
      </form>
    </div>
  );
}
