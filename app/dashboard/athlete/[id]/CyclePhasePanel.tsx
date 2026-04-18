"use client";

import { getCurrentCyclePhase, type CyclePhase } from "@/lib/cycle-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const PHASE_COLOURS: Record<CyclePhase, string> = {
  Menstrual:  "bg-red-50   text-red-700   border-red-200",
  Follicular: "bg-sky-50   text-sky-700   border-sky-200",
  Ovulatory:  "bg-amber-50 text-amber-700 border-amber-200",
  Luteal:     "bg-violet-50 text-violet-700 border-violet-200",
};

export function CyclePhasePanel({
  lastCycleStart,
  cycleLength = 28,
}: {
  lastCycleStart: string | null;
  cycleLength?: number;
}) {
  if (!lastCycleStart) {
    return (
      <p className="text-sm text-muted-foreground">
        No cycle data recorded yet. The athlete can log their period start in the daily check-in.
      </p>
    );
  }

  const { phase, dayOfCycle, daysUntilNextPeriod, injuryRiskElevated } =
    getCurrentCyclePhase(lastCycleStart, cycleLength);

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-sm font-semibold px-3 py-1 ${PHASE_COLOURS[phase]}`}>
              {phase} phase
            </Badge>
            <span className="text-sm text-muted-foreground">Day {dayOfCycle} of cycle</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Next period in <span className="font-semibold text-foreground">{daysUntilNextPeriod}d</span>
          </span>
        </div>

        {injuryRiskElevated && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
            <span>Injury risk elevated during ovulatory phase — consider load management this week.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
