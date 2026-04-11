"use client";

import { useState } from "react";
import type { WeekScheduleJson, WeekDay, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import {
  emptyWeekSchedule,
  computeIntensityDisplay,
  countNonEmptySessions,
} from "@/lib/training-week-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RotateCcw } from "lucide-react";

// ─── Traffic-light styling ────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotDisplay({ slot }: { slot: WeekSlot }) {
  const empty = !slot.label || slot.label === "—";
  if (empty) return <span className="text-muted-foreground/40 select-none">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground text-xs leading-snug">{slot.label}</span>
      <Badge variant="outline" className={`gap-1 w-fit text-xs font-semibold ${INTENSITY_BADGE[slot.intensity]}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${INTENSITY_DOT[slot.intensity]}`} />
        {slot.intensity.toUpperCase()}
      </Badge>
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
    <div className="flex flex-col gap-1.5 min-w-[130px]">
      <Input
        id={`${id}-label`}
        type="text"
        value={displayValue}
        placeholder="—"
        maxLength={200}
        aria-label="Session description"
        onChange={(e) => onChange({ ...slot, label: e.target.value || "—" })}
        className="h-7 text-xs px-2"
      />
      <Select
        value={slot.intensity}
        onValueChange={(v) => onChange({ ...slot, intensity: v as SlotIntensity })}
      >
        <SelectTrigger id={`${id}-intensity`} className={`h-7 text-xs font-semibold ${INTENSITY_BADGE[slot.intensity]}`} aria-label="Slot intensity">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rest" className="text-xs font-semibold text-emerald-700">REST</SelectItem>
          <SelectItem value="med"  className="text-xs font-semibold text-amber-700">MED</SelectItem>
          <SelectItem value="high" className="text-xs font-semibold text-red-700">HIGH</SelectItem>
        </SelectContent>
      </Select>
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
  /** Optional label shown below the table when there is no data. */
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
      {/* Edit button */}
      {!readOnly && !isEditing && (
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={startEdit} className="text-xs">
            Edit
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-16">
                Day
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">
                Morning
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">
                Afternoon
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">
                Evening
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Intensity
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Total Sessions
              </th>
              <th scope="col" className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
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
                <tr key={day.day} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-3 font-semibold text-foreground text-left whitespace-nowrap">
                    {day.day.slice(0, 3)}
                  </th>

                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor slot={draftDay.morning} id={`${i}-morning`} onChange={(s) => updateSlot(i, "morning", s)} />
                    ) : (
                      <SlotDisplay slot={day.morning} />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor slot={draftDay.afternoon} id={`${i}-afternoon`} onChange={(s) => updateSlot(i, "afternoon", s)} />
                    ) : (
                      <SlotDisplay slot={day.afternoon} />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <SlotEditor slot={draftDay.evening} id={`${i}-evening`} onChange={(s) => updateSlot(i, "evening", s)} />
                    ) : (
                      <SlotDisplay slot={day.evening} />
                    )}
                  </td>

                  {/* Intensity display */}
                  <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">
                    {isEditing && draftDay ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={draftDay.intensity_display}
                          maxLength={30}
                          aria-label="Intensity display"
                          onChange={(e) =>
                            updateDay(i, (d) => ({ ...d, intensity_display: e.target.value }))
                          }
                          className="h-7 text-xs w-[90px] px-2"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Recompute from slot intensities"
                          onClick={() =>
                            updateDay(i, (d) => ({
                              ...d,
                              intensity_display: computeIntensityDisplay(d),
                            }))
                          }
                          className="h-7 w-7 text-muted-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span>{day.intensity_display || "—"}</span>
                    )}
                  </td>

                  {/* Total sessions */}
                  <td className="px-3 py-3">
                    {isEditing && draftDay ? (
                      <div className="flex flex-col gap-0.5">
                        <Input
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
                          className="h-7 text-xs w-14 px-2"
                        />
                        <span className="text-muted-foreground text-xs">auto: {autoCount}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-foreground">{totalSessions}</span>
                    )}
                  </td>

                  {/* Session types */}
                  <td className="px-3 py-3 text-muted-foreground">
                    {isEditing && draftDay ? (
                      <Input
                        type="text"
                        value={draftDay.session_types}
                        maxLength={500}
                        placeholder="e.g. Strength + S&C"
                        aria-label="Session types"
                        onChange={(e) =>
                          updateDay(i, (d) => ({ ...d, session_types: e.target.value }))
                        }
                        className="h-7 text-xs w-44 px-2"
                      />
                    ) : day.session_types ? (
                      day.session_types
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isEditing && !schedule && emptyMessage && (
        <p className="text-xs text-muted-foreground mt-2">{emptyMessage}</p>
      )}

      {/* Save / Cancel bar */}
      {isEditing && (
        <div className="flex items-center gap-3 mt-3 justify-end">
          {saveError && (
            <Alert variant="destructive" className="py-2 px-3 h-auto">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">{saveError}</AlertDescription>
            </Alert>
          )}
          <Button variant="outline" size="sm" onClick={cancelEdit} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
