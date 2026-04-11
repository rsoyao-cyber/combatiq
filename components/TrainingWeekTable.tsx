"use client";

import { useState } from "react";
import type { WeekScheduleJson, WeekDay, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import {
  emptyWeekSchedule,
  computeIntensityDisplay,
  countNonEmptySessions,
} from "@/lib/training-week-types";

// ─── Traffic-light styling ────────────────────────────────────────────────────
// GREEN = recovery/rest, AMBER = medium, RED = high

const INTENSITY_BADGE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-50 text-emerald-700 border-emerald-200",
  med:  "bg-amber-50  text-amber-700  border-amber-200",
  high: "bg-red-50    text-red-700    border-red-200",
};

const INTENSITY_DOT: Record<SlotIntensity, string> = {
  rest: "bg-emerald-500",
  med:  "bg-amber-400",
  high: "bg-red-500",
};

const INTENSITY_SELECT: Record<SlotIntensity, string> = {
  rest: "border-emerald-300 bg-emerald-50 text-emerald-700",
  med:  "border-amber-300  bg-amber-50  text-amber-700",
  high: "border-red-300    bg-red-50    text-red-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotDisplay({ slot }: { slot: WeekSlot }) {
  const empty = !slot.label || slot.label === "—";
  if (empty) return <span className="text-zinc-300 select-none">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-zinc-700 text-xs leading-snug">{slot.label}</span>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold rounded px-1.5 py-0.5 border w-fit ${INTENSITY_BADGE[slot.intensity]}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${INTENSITY_DOT[slot.intensity]}`} />
        {slot.intensity.toUpperCase()}
      </span>
    </div>
  );
}

function SlotEditor({
  slot,
  id,
  onChange,
}: {
  slot: WeekSlot;
  id: string;
  onChange: (s: WeekSlot) => void;
}) {
  const displayValue = slot.label === "—" ? "" : slot.label;
  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      <input
        id={`${id}-label`}
        type="text"
        value={displayValue}
        placeholder="—"
        maxLength={200}
        aria-label="Session description"
        onChange={(e) => onChange({ ...slot, label: e.target.value || "—" })}
        className="w-full border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
      <select
        id={`${id}-intensity`}
        value={slot.intensity}
        aria-label="Slot intensity"
        onChange={(e) => onChange({ ...slot, intensity: e.target.value as SlotIntensity })}
        className={`border rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-400 ${INTENSITY_SELECT[slot.intensity]}`}
      >
        <option value="rest">REST</option>
        <option value="med">MED</option>
        <option value="high">HIGH</option>
      </select>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface TrainingWeekTableProps {
  schedule: WeekScheduleJson | null;
  /** When true, no editing UI is shown. Defaults to true. */
  readOnly?: boolean;
  /** Called with the updated schedule when the user saves. Should throw on failure. */
  onSave?: (schedule: WeekScheduleJson) => Promise<void>;
  /** Optional label shown above the table (e.g. "No plan yet"). */
  emptyMessage?: string;
}

export function TrainingWeekTable({
  schedule,
  readOnly = true,
  onSave,
  emptyMessage,
}: TrainingWeekTableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeekScheduleJson | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const display = editing && draft ? draft : (schedule ?? emptyWeekSchedule());
  const isEditing = editing && !readOnly;

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(schedule ?? emptyWeekSchedule())));
    setEditing(true);
    setSaveError("");
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setSaveError("");
  }

  function updateDay(i: number, fn: (d: WeekDay) => WeekDay) {
    if (!draft) return;
    setDraft({ days: draft.days.map((d, idx) => (idx === i ? fn(d) : d)) });
  }

  function updateSlot(
    dayIndex: number,
    period: "morning" | "afternoon" | "evening",
    next: WeekSlot,
  ) {
    updateDay(dayIndex, (day) => {
      const updated = { ...day, [period]: next };
      // Auto-recompute intensity_display when any slot changes
      return { ...updated, intensity_display: computeIntensityDisplay(updated) };
    });
  }

  async function handleSave() {
    if (!draft || !onSave) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Edit button — only shown when not read-only and not already editing */}
      {!readOnly && !isEditing && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Edit
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap w-16">
                Day
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide">
                Morning
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide">
                Afternoon
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide">
                Evening
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Intensity
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Total Sessions
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Session Types
              </th>
            </tr>
          </thead>
          <tbody>
            {display.days.map((day, i) => {
              const autoCount = countNonEmptySessions(day);
              const totalSessions = day.total_sessions_override ?? autoCount;
              const draftDay = draft?.days[i];

              return (
                <tr key={day.day} className="border-b border-zinc-100 last:border-0">
                  {/* Day label */}
                  <th
                    scope="row"
                    className="px-3 py-3 font-semibold text-zinc-800 text-left whitespace-nowrap"
                  >
                    {day.day.slice(0, 3)}
                  </th>

                  {/* Morning */}
                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor
                        slot={draftDay.morning}
                        id={`${i}-morning`}
                        onChange={(s) => updateSlot(i, "morning", s)}
                      />
                    ) : (
                      <SlotDisplay slot={day.morning} />
                    )}
                  </td>

                  {/* Afternoon */}
                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor
                        slot={draftDay.afternoon}
                        id={`${i}-afternoon`}
                        onChange={(s) => updateSlot(i, "afternoon", s)}
                      />
                    ) : (
                      <SlotDisplay slot={day.afternoon} />
                    )}
                  </td>

                  {/* Evening */}
                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor
                        slot={draftDay.evening}
                        id={`${i}-evening`}
                        onChange={(s) => updateSlot(i, "evening", s)}
                      />
                    ) : (
                      <SlotDisplay slot={day.evening} />
                    )}
                  </td>

                  {/* Intensity display */}
                  <td className="px-3 py-3 font-semibold text-zinc-700 whitespace-nowrap">
                    {isEditing && draftDay ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={draftDay.intensity_display}
                          maxLength={30}
                          aria-label="Intensity display"
                          onChange={(e) =>
                            updateDay(i, (d) => ({ ...d, intensity_display: e.target.value }))
                          }
                          className="border border-zinc-200 rounded px-2 py-1 text-xs w-[90px] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        {/* Recompute button */}
                        <button
                          type="button"
                          title="Recompute from slot intensities"
                          onClick={() =>
                            updateDay(i, (d) => ({
                              ...d,
                              intensity_display: computeIntensityDisplay(d),
                            }))
                          }
                          className="text-zinc-400 hover:text-zinc-700 transition-colors text-sm leading-none"
                        >
                          ↺
                        </button>
                      </div>
                    ) : (
                      <span>{day.intensity_display || "—"}</span>
                    )}
                  </td>

                  {/* Total sessions */}
                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <div className="flex flex-col gap-0.5">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={draftDay.total_sessions_override ?? ""}
                          placeholder={String(autoCount)}
                          aria-label="Total sessions override"
                          onChange={(e) =>
                            updateDay(i, (d) => ({
                              ...d,
                              total_sessions_override:
                                e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                          className="border border-zinc-200 rounded px-2 py-1 text-xs w-14 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <span className="text-zinc-400 text-xs">auto: {autoCount}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-zinc-800">{totalSessions}</span>
                    )}
                  </td>

                  {/* Session types */}
                  <td className="px-3 py-3 text-zinc-600">
                    {isEditing && draftDay ? (
                      <input
                        type="text"
                        value={draftDay.session_types}
                        maxLength={500}
                        placeholder="e.g. Strength + S&C"
                        aria-label="Session types"
                        onChange={(e) =>
                          updateDay(i, (d) => ({ ...d, session_types: e.target.value }))
                        }
                        className="border border-zinc-200 rounded px-2 py-1 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    ) : day.session_types ? (
                      day.session_types
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state message (read-only, no data) */}
      {!isEditing && !schedule && emptyMessage && (
        <p className="text-xs text-zinc-400 mt-2">{emptyMessage}</p>
      )}

      {/* Save / Cancel bar */}
      {isEditing && (
        <div className="flex items-center gap-3 mt-3 justify-end">
          {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
          <button
            type="button"
            onClick={cancelEdit}
            className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold bg-zinc-900 text-white rounded-lg px-4 py-1.5 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
