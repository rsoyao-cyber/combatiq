"use client";

import { useState } from "react";
import type { WeekScheduleJson, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import { computeIntensityDisplay } from "@/lib/training-week-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Intensity styling ────────────────────────────────────────────────────────

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

const INTENSITY_OPTIONS: Array<{ value: SlotIntensity; label: string }> = [
  { value: "rest", label: "REST" },
  { value: "med",  label: "MED"  },
  { value: "high", label: "HIGH" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "morning" | "afternoon" | "evening";

interface DeviationData {
  label: string;
  intensity: SlotIntensity;
  note: string;
}

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "morning",   label: "Morning"   },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening",   label: "Evening"   },
];

function slotId(dayIndex: number, period: Period): string {
  return `${dayIndex}-${period}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialDeviations(
  primary: WeekScheduleJson | null,
  existing: WeekScheduleJson | null,
): Record<string, DeviationData> {
  if (!primary || !existing) return {};
  const result: Record<string, DeviationData> = {};
  for (let i = 0; i < primary.days.length; i++) {
    const pDay = primary.days[i];
    const aDay = existing.days[i];
    if (!aDay) continue;
    for (const { key } of PERIODS) {
      const p = pDay[key];
      const a = aDay[key];
      if (p.label !== a.label || p.intensity !== a.intensity) {
        result[slotId(i, key)] = {
          label: a.label === "—" ? "" : a.label,
          intensity: a.intensity,
          note: a.deviation_note ?? "",
        };
      }
    }
  }
  return result;
}

function buildAlternativeJson(
  primary: WeekScheduleJson,
  deviations: Record<string, DeviationData>,
): WeekScheduleJson {
  return {
    days: primary.days.map((day, i) => {
      const updatedDay = { ...day };
      for (const { key } of PERIODS) {
        const dev = deviations[slotId(i, key)];
        if (dev) {
          updatedDay[key] = {
            label: dev.label || "—",
            intensity: dev.intensity,
            deviation_note: dev.note || null,
          };
        }
      }
      return { ...updatedDay, intensity_display: computeIntensityDisplay(updatedDay) };
    }),
  };
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function WeekAlternativeForm({
  athleteId,
  athleteName,
  weekStart,
  primarySchedule,
  existingAlternative,
}: {
  athleteId: string;
  athleteName: string;
  weekStart: string;
  primarySchedule: WeekScheduleJson | null;
  existingAlternative: WeekScheduleJson | null;
}) {
  const [deviations, setDeviations] = useState<Record<string, DeviationData>>(
    () => buildInitialDeviations(primarySchedule, existingAlternative),
  );
  const [weekNotes, setWeekNotes] = useState(existingAlternative ? "" : "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const weekEnd = new Date(`${weekStart}T00:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const weekLabel = `${fmt(new Date(`${weekStart}T00:00:00`))} – ${fmt(weekEnd)}`;

  const deviationCount = Object.keys(deviations).length;

  function changeSlot(dayIndex: number, period: Period, primarySlot: WeekSlot) {
    const id = slotId(dayIndex, period);
    setDeviations((prev) => ({
      ...prev,
      [id]: {
        label: primarySlot.label === "—" ? "" : primarySlot.label,
        intensity: primarySlot.intensity,
        note: "",
      },
    }));
  }

  function revertSlot(dayIndex: number, period: Period) {
    const id = slotId(dayIndex, period);
    setDeviations((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateDeviation(
    dayIndex: number,
    period: Period,
    field: keyof DeviationData,
    value: string,
  ) {
    const id = slotId(dayIndex, period);
    setDeviations((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!primarySchedule) return;
    setStatus("submitting");
    setErrorMsg("");

    const altJson = buildAlternativeJson(primarySchedule, deviations);

    const res = await fetch("/api/training-week", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId,
        weekStart,
        type: "alternative",
        alternative_json: altJson,
        adherence: deviationCount > 0 ? "changed" : "stuck_to_plan",
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

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Week logged</h1>
        <p className="text-muted-foreground">
          {deviationCount === 0
            ? "Got it — you stuck to the plan this week."
            : `${deviationCount} change${deviationCount !== 1 ? "s" : ""} saved. Thanks for keeping it updated.`}
        </p>
      </div>
    );
  }

  // ── No plan set ──────────────────────────────────────────────────────────────
  if (!primarySchedule) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center gap-4">
        <p className="text-muted-foreground">No training plan has been set for this week yet.</p>
      </div>
    );
  }

  // ── Deviation form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header
        className="bg-primary text-primary-foreground px-5 pb-6"
        style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
      >
        <p className="text-sm text-primary-foreground/70 mb-1">{weekLabel}</p>
        <h1 className="text-2xl font-bold">{athleteName}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">
          {deviationCount === 0
            ? "Tap Change on any session that didn't go to plan."
            : `${deviationCount} change${deviationCount !== 1 ? "s" : ""} logged`}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-4 py-6 flex flex-col gap-5 max-w-lg mx-auto"
        style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}
      >
        {primarySchedule.days.map((day, dayIndex) => (
          <div key={day.day} className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              {day.day}
            </p>
            <Card>
              <CardContent className="pt-3 pb-3 divide-y divide-border">
                {PERIODS.map(({ key, label }) => {
                  const primarySlot = day[key];
                  const isRest = !primarySlot.label || primarySlot.label === "—";
                  const dev = deviations[slotId(dayIndex, key)];

                  return (
                    <div key={key} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        {label}
                      </p>

                      {dev ? (
                        // ── Deviation editor ────────────────────────────────
                        <div className="flex flex-col gap-3">
                          <Input
                            value={dev.label}
                            placeholder="What did you do?"
                            maxLength={200}
                            onChange={(e) => updateDeviation(dayIndex, key, "label", e.target.value)}
                          />
                          <div className="flex rounded-lg overflow-hidden border border-input text-xs font-semibold w-fit">
                            {INTENSITY_OPTIONS.map(({ value, label: intLabel }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateDeviation(dayIndex, key, "intensity", value)}
                                className={`px-3 py-2 transition-colors ${
                                  dev.intensity === value
                                    ? INTENSITY_ACTIVE[value]
                                    : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {intLabel}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Why did this change? (optional)"
                            value={dev.note}
                            maxLength={500}
                            onChange={(e) => updateDeviation(dayIndex, key, "note", e.target.value)}
                            className="border border-input rounded-md px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => revertSlot(dayIndex, key)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Revert to plan
                          </button>
                        </div>
                      ) : (
                        // ── As planned ──────────────────────────────────────
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isRest ? (
                              <span className="text-sm text-muted-foreground">Rest</span>
                            ) : (
                              <>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {primarySlot.label}
                                </span>
                                <span className={cn(
                                  "text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
                                  INTENSITY_BADGE[primarySlot.intensity],
                                )}>
                                  {primarySlot.intensity.toUpperCase()}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <button
                              type="button"
                              onClick={() => changeSlot(dayIndex, key, primarySlot)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Week notes */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="week_notes" className="text-sm font-semibold text-foreground">
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
          {status === "submitting" ? "Saving…" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
