"use client";

import { useState } from "react";
import Link from "next/link";
import { TrainingWeekTable } from "@/components/TrainingWeekTable";
import type { TrainingWeekSnapshot, WeekScheduleJson } from "@/lib/training-week-types";
import { offsetWeekStart, formatWeekRange } from "@/lib/training-week-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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

// ─── Panel ────────────────────────────────────────────────────────────────────

export function WeekSchedulePanel({ athleteId, initialSnapshot, initialWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [snapshot, setSnapshot] = useState<TrainingWeekSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);

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
      body: JSON.stringify({
        athleteId,
        weekStart,
        type: "primary",
        primary_json: schedule,
      }),
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

  const primaryJson = snapshot?.primary_json ?? null;
  const alternativeJson = snapshot?.alternative_json ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Traffic-light legend */}
      <Legend />

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navWeek(-1)}
          disabled={loading}
          aria-label="Previous week"
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground min-w-[200px] text-center tabular-nums">
          {formatWeekRange(weekStart)}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navWeek(1)}
          disabled={loading}
          aria-label="Next week"
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading…
          </span>
        )}
      </div>

      {/* ── Primary (coach plan) ── */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Training Week Schedule
        </h3>
        <TrainingWeekTable
          schedule={primaryJson}
          readOnly={false}
          onSave={savePrimary}
          emptyMessage="No plan for this week yet. Click Edit to create one."
        />
      </div>

      {/* ── Alternative (athlete actuals) ── */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Alternative Training Week Schedule
          </h3>
          <Link
            href={`/checkin/${athleteId}/week?weekStart=${weekStart}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs whitespace-nowrap")}
          >
            Athlete entry →
          </Link>
        </div>

        {alternativeJson ? (
          <div className="flex flex-col gap-3">
            <TrainingWeekTable schedule={alternativeJson} readOnly />
            {(snapshot?.adherence || snapshot?.week_notes) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {snapshot?.adherence && (
                  <span>
                    Adherence:{" "}
                    <span className="font-semibold text-foreground">
                      {snapshot.adherence === "stuck_to_plan" ? "Stuck to plan" : "Changed"}
                    </span>
                  </span>
                )}
                {snapshot?.week_notes && (
                  <span>
                    Notes:{" "}
                    <span className="font-semibold text-foreground">{snapshot.week_notes}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <Card className="p-6 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">No alternative week submitted for this period.</p>
            <Link
              href={`/checkin/${athleteId}/week?weekStart=${weekStart}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
            >
              Athlete entry →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
