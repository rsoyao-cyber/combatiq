"use client";

import { useState } from "react";
import { TrainingWeekTable } from "@/components/TrainingWeekTable";
import type { TrainingWeekSnapshot, WeekScheduleJson, WeekSlot, SlotIntensity } from "@/lib/training-week-types";
import { offsetWeekStart, formatWeekRange } from "@/lib/training-week-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy, Loader2, RotateCcw } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  athleteId: string;
  initialSnapshot: TrainingWeekSnapshot | null;
  initialWeekStart: string;
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="font-semibold text-muted-foreground uppercase tracking-wide">Legend:</span>
      <Badge variant="outline" className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        GREEN — Recovery
      </Badge>
      <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200 font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
        AMBER — Medium
      </Badge>
      <Badge variant="outline" className="gap-1.5 bg-red-50 text-red-700 border-red-200 font-semibold">
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        RED — High
      </Badge>
    </div>
  );
}

// ─── Deviations ───────────────────────────────────────────────────────────────

const INTENSITY_BADGE: Record<SlotIntensity, string> = {
  rest: "bg-emerald-50 text-emerald-700 border-emerald-200",
  med:  "bg-amber-50  text-amber-700  border-amber-200",
  high: "bg-red-50    text-red-700    border-red-200",
};

type Period = "morning" | "afternoon" | "evening";

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "morning",   label: "Morning"   },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening",   label: "Evening"   },
];

function computeDeviations(primary: WeekScheduleJson, alternative: WeekScheduleJson) {
  const result: Array<{
    day: string;
    period: string;
    planned: WeekSlot;
    actual: WeekSlot;
    note: string | null;
  }> = [];

  for (const pDay of primary.days) {
    const aDay = alternative.days.find((d) => d.day === pDay.day);
    if (!aDay) continue;
    for (const { key, label } of PERIODS) {
      const p = pDay[key];
      const a = aDay[key];
      if (p.label !== a.label || p.intensity !== a.intensity) {
        result.push({ day: pDay.day, period: label, planned: p, actual: a, note: a.deviation_note ?? null });
      }
    }
  }
  return result;
}

function DeviationList({
  primary,
  alternative,
  weekNotes,
  adherence,
}: {
  primary: WeekScheduleJson;
  alternative: WeekScheduleJson;
  weekNotes: string | null;
  adherence: string | null;
}) {
  const deviations = computeDeviations(primary, alternative);

  if (deviations.length === 0 && !weekNotes) {
    return (
      <p className="text-xs text-muted-foreground">
        {adherence === "stuck_to_plan" ? "Athlete stuck to the plan this week." : "No deviations logged."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {deviations.map((d, i) => (
        <div key={i} className="rounded-lg bg-muted/50 px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">
              {d.day} {d.period.toLowerCase()}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-xs py-0 ${INTENSITY_BADGE[d.planned.intensity as SlotIntensity]}`}>
                {d.planned.label === "—" ? "Rest" : d.planned.label}
              </Badge>
              <span className="text-xs text-muted-foreground">→</span>
              <Badge variant="outline" className={`text-xs py-0 ${INTENSITY_BADGE[d.actual.intensity as SlotIntensity]}`}>
                {d.actual.label === "—" ? "Rest" : d.actual.label}
              </Badge>
            </div>
          </div>
          {d.note && (
            <p className="text-xs text-muted-foreground italic">"{d.note}"</p>
          )}
        </div>
      ))}
      {weekNotes && (
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-semibold">Week notes:</span> {weekNotes}
        </p>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function WeekSchedulePanel({ athleteId, initialSnapshot, initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [snapshot, setSnapshot] = useState<TrainingWeekSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);

  // Copy-forward state
  const [showCopyUI, setShowCopyUI] = useState(false);
  const [copyWeeks, setCopyWeeks] = useState(2);
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [copyMessage, setCopyMessage] = useState("");

  async function fetchWeek(ws: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/training-week?athleteId=${athleteId}&weekStart=${ws}`);
      const json = await res.json();
      setSnapshot(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  function navWeek(offset: number) {
    const next = offsetWeekStart(weekStart, offset);
    setWeekStart(next);
    fetchWeek(next);
  }

  async function savePrimary(schedule: WeekScheduleJson) {
    const res = await fetch("/api/training-week", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId, weekStart, type: "primary", primary_json: schedule }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Save failed");
    }
    const { data } = (await fetch(
      `/api/training-week?athleteId=${athleteId}&weekStart=${weekStart}`,
    ).then((r) => r.json())) as { data: TrainingWeekSnapshot | null };
    setSnapshot(data);
  }

  async function handleCopy() {
    setCopyStatus("loading");
    try {
      const res = await fetch("/api/training-week/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, fromWeekStart: weekStart, weeks: copyWeeks }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Copy failed");
      const { created, skipped } = json as { created: number; skipped: number };
      setCopyStatus("done");
      setCopyMessage(
        `Copied to ${created} week${created !== 1 ? "s" : ""}${skipped > 0 ? ` · ${skipped} skipped (already had a plan)` : ""}.`,
      );
    } catch (err) {
      setCopyStatus("error");
      setCopyMessage(err instanceof Error ? err.message : "Copy failed");
    }
  }

  function resetCopyUI() {
    setShowCopyUI(false);
    setCopyStatus("idle");
    setCopyMessage("");
  }

  const primaryJson = snapshot?.primary_json ?? null;
  const alternativeJson = snapshot?.alternative_json ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Legend />

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navWeek(-1)} disabled={loading} aria-label="Previous week" className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground min-w-[200px] text-center tabular-nums">
          {formatWeekRange(weekStart)}
        </span>
        <Button variant="outline" size="icon" onClick={() => navWeek(1)} disabled={loading} aria-label="Next week" className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </span>
        )}
      </div>

      {/* Primary schedule */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Training Week Schedule
          </h3>

          {/* Copy-forward UI */}
          {!showCopyUI ? (
            <button
              type="button"
              onClick={() => setShowCopyUI(true)}
              disabled={!primaryJson}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Copy className="w-3 h-3" />
              Copy plan forward
            </button>
          ) : copyStatus === "done" || copyStatus === "error" ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${copyStatus === "done" ? "text-emerald-600" : "text-destructive"}`}>
                {copyMessage}
              </span>
              <button type="button" onClick={resetCopyUI} className="text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Copy to next</span>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCopyWeeks(n)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    copyWeeks === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {n}w
                </button>
              ))}
              <Button
                size="sm"
                className="text-xs h-7"
                disabled={copyStatus === "loading"}
                onClick={handleCopy}
              >
                {copyStatus === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
              </Button>
              <button type="button" onClick={resetCopyUI} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          )}
        </div>

        <TrainingWeekTable
          schedule={primaryJson}
          readOnly={false}
          onSave={savePrimary}
          emptyMessage="No plan for this week yet. Click Edit to create one."
        />
      </div>

      {/* Deviations — only shown when athlete has submitted actuals */}
      {alternativeJson && primaryJson && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Deviations this week
          </h3>
          <DeviationList
            primary={primaryJson}
            alternative={alternativeJson}
            weekNotes={snapshot?.week_notes ?? null}
            adherence={snapshot?.adherence ?? null}
          />
        </div>
      )}
    </div>
  );
}
