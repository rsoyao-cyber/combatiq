import type { DomainTrend, InjuryFlag } from "@/lib/analytics";
import type { CheckInRow } from "@/lib/squad";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/dashboard/Panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WellbeingCharts } from "./WellbeingCharts";
import { CyclePhasePanel } from "./CyclePhasePanel";

export function WellbeingTab({
  trends,
  checkIns,
  injuries,
  isFemale,
  lastCycle,
}: {
  trends: DomainTrend[];
  checkIns: CheckInRow[];   // last 28 days
  injuries: InjuryFlag[];
  isFemale: boolean;
  lastCycle: { cycle_start_date: string; cycle_length_days: number } | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Panel title="Wellbeing · last 28 days">
        {checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins in the last 28 days.</p>
        ) : (
          <WellbeingCharts trends={trends} checkIns={checkIns} />
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <Panel title="Pain & injury · last 14 days">
          {injuries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pain or injury reported in the last 14 days.</p>
          ) : (
            <div className="relative overflow-x-auto -mx-5">
              <Table className="min-w-[440px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Area</TableHead>
                    <TableHead>Latest pain</TableHead>
                    <TableHead>Last reported</TableHead>
                    <TableHead className="pr-5">Days running</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {injuries.map((inj) => (
                    <TableRow key={inj.area}>
                      <TableCell className="pl-5 font-medium">{inj.area}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold tabular-nums",
                          inj.mostRecentPainRating >= 4 ? "text-status-attention"
                          : inj.mostRecentPainRating >= 2 ? "text-status-monitor"
                          : "text-foreground",
                        )}>
                          {inj.mostRecentPainRating}/5
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{shortDate(inj.mostRecentDate)}</TableCell>
                      <TableCell className="pr-5 text-muted-foreground tabular-nums">{inj.daysOngoing} {inj.daysOngoing === 1 ? "day" : "days"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        {isFemale && (
          <Panel title="Menstrual cycle">
            <CyclePhasePanel
              lastCycleStart={lastCycle?.cycle_start_date ?? null}
              cycleLength={lastCycle?.cycle_length_days ?? 28}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
