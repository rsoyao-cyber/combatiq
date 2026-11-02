import type { WeightTrendsResult } from "@/lib/analytics";
import type { AthleteSnapshot } from "@/lib/squad";
import { shortDate } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Panel } from "@/components/dashboard/Panel";
import { WeightChart } from "./WeightChart";

export function BodyTab({
  snapshot,
  weightTrends,
  today,
}: {
  snapshot: AthleteSnapshot;
  weightTrends: WeightTrendsResult;
  today: string;
}) {
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const lastWeek = weightTrends.actuals.filter((a) => a.date > weekAgo.toISOString().slice(0, 10));
  const avg7 = lastWeek.length
    ? Math.round((lastWeek.reduce((s, a) => s + a.weight_kg, 0) / lastWeek.length) * 10) / 10
    : null;
  const latest = weightTrends.actuals.at(-1) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Latest weigh-in"
          value={latest ? latest.weight_kg : "—"}
          unit={latest ? "kg" : undefined}
          note={latest ? shortDate(latest.date) : "No weigh-ins in 8 weeks"}
        />
        <KpiCard
          label="7-day average"
          value={avg7 ?? "—"}
          unit={avg7 != null ? "kg" : undefined}
          note={`${lastWeek.length} weigh-in${lastWeek.length === 1 ? "" : "s"} this week`}
        />
        <KpiCard
          label="Change vs a week earlier"
          value={snapshot.weightChangePct != null ? `${snapshot.weightChangePct > 0 ? "+" : ""}${snapshot.weightChangePct}%` : "—"}
          note={snapshot.weightChangePct != null ? "Latest vs last weigh-in ≥7 days before" : "Needs two weigh-ins a week apart"}
        />
      </div>

      <Panel title="Weight · 8 weeks">
        <WeightChart actuals={weightTrends.actuals} targets={weightTrends.targets} />
      </Panel>
    </div>
  );
}
