"use client";

import { useState } from "react";
import type { WeekScheduleJson, WeekDay, WeekSlot, SlotIntensity, Adherence } from "@/lib/training-week-types";
import { emptyWeekSchedule, computeIntensityDisplay } from "@/lib/training-week-types";

// ─── Traffic-light colours (dark theme to match checkin palette) ──────────────

const INTENSITY_BG: Record<SlotIntensity, string> = {
  rest: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  med:  "bg-amber-500/20  text-amber-300  border-amber-500/40",
  high: "bg-red-500/20    text-red-300    border-red-500/40",
};

const INTENSITY_SELECT_ACTIVE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-500 text-white",
  med:  "bg-amber-500  text-white",
  high: "bg-red-500    text-white",
};

const INTENSITY_OPTIONS: { value: SlotIntensity; label: string }[] = [
  { value: "rest", label: "REST" },
  { value: "med",  label: "MED"  },
  { value: "high", label: "HIGH" },
];

// ─── Day card ─────────────────────────────────────────────────────────────────

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
      <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">{period}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={isEmpty ? "" : slot.label}
          placeholder="—"
          maxLength={200}
          aria-label={`${period} session description for day ${dayIndex + 1}`}
          onChange={(e) => onChange({ ...slot, label: e.target.value || "—" })}
          className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {/* Intensity pill buttons */}
        <div className="flex rounded-xl overflow-hidden border border-white/20 text-xs font-semibold">
          {INTENSITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...slot, intensity: value })}
              className={`px-2.5 py-2 transition-colors ${
                slot.intensity === value
                  ? INTENSITY_SELECT_ACTIVE[value]
                  : "bg-white/10 text-white/50 hover:bg-white/20"
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
    // Auto-recompute intensity_display when any slot changes
    onChange({ ...updated, intensity_display: computeIntensityDisplay(updated) });
  }

  const intensityClass = (() => {
    const raw = day.intensity_display.toLowerCase();
    if (raw.includes("high")) return INTENSITY_BG.high;
    if (raw.includes("med"))  return INTENSITY_BG.med;
    return INTENSITY_BG.rest;
  })();

  return (
    <div className="bg-white/10 rounded-2xl p-5 flex flex-col gap-4">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">{day.day}</h3>
        <span
          className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${intensityClass}`}
        >
          {day.intensity_display || "REST | REST"}
        </span>
      </div>

      <SlotRow period="Morning"   slot={day.morning}   dayIndex={dayIndex} onChange={(s) => updateSlot("morning", s)} />
      <SlotRow period="Afternoon" slot={day.afternoon} dayIndex={dayIndex} onChange={(s) => updateSlot("afternoon", s)} />
      <SlotRow period="Evening"   slot={day.evening}   dayIndex={dayIndex} onChange={(s) => updateSlot("evening", s)} />

      {/* Session types */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Session types</p>
        <input
          type="text"
          value={day.session_types}
          placeholder="e.g. Strength + S&C"
          maxLength={500}
          aria-label={`Session types for ${day.day}`}
          onChange={(e) => onChange({ ...day, session_types: e.target.value })}
          className="w-full bg-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
    </div>
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
  /** Pre-filled from alternative_json (if exists) or primary_json, otherwise empty. */
  prefill: WeekScheduleJson | null;
}) {
  const [schedule, setSchedule] = useState<WeekScheduleJson>(
    prefill ?? emptyWeekSchedule(),
  );
  const [adherence, setAdherence] = useState<Adherence>(null);
  const [weekNotes, setWeekNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Format the week range for display
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
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center px-5 text-center gap-4">
        <span className="text-6xl">✅</span>
        <h1 className="text-2xl font-bold text-white">Week submitted</h1>
        <p className="text-white/60">Thanks {athleteName}. Your alternative week has been saved.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="px-5 pb-6" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
        <p className="text-sm text-white/50 mb-1">Week of {weekLabel}</p>
        <h1 className="text-2xl font-bold">{athleteName}</h1>
        <p className="text-white/60 text-sm mt-1">What did your week actually look like?</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-5 flex flex-col gap-4"
        style={{ paddingBottom: "max(4rem, env(safe-area-inset-bottom))" }}
      >
        {/* Day cards */}
        {schedule.days.map((day, i) => (
          <DayCard
            key={day.day}
            day={day}
            dayIndex={i}
            onChange={(next) => updateDay(i, next)}
          />
        ))}

        {/* Adherence */}
        <div className="bg-white/10 rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
            How did it go?
          </h2>

          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-white">Did you stick to the plan?</p>
            <div className="flex gap-3">
              {[
                { label: "Stuck to plan", value: "stuck_to_plan" as const },
                { label: "Had to change", value: "changed" as const },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAdherence(adherence === value ? null : value)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    adherence === value
                      ? "bg-amber-400 text-zinc-900"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="week_notes" className="text-base font-semibold text-white">
              Any notes about the week?
            </label>
            <textarea
              id="week_notes"
              rows={3}
              maxLength={1000}
              placeholder="Travel, illness, schedule changes…"
              value={weekNotes}
              onChange={(e) => setWeekNotes(e.target.value)}
              className="bg-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>

        {status === "error" && (
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-amber-400 text-zinc-900 font-bold text-base py-4 rounded-2xl disabled:opacity-50 transition-opacity"
        >
          {status === "submitting" ? "Submitting…" : "Submit my week"}
        </button>
      </form>
    </div>
  );
}
