"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { ExerciseProgression } from "@/lib/analytics";

function PerfChart({
  title,
  data,
  dataKey,
  unit,
  color,
  emptyMsg,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  unit: string;
  color: string;
  emptyMsg: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
      {data.length < 2 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMsg}</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
              formatter={(v) => [`${v}${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function PerformanceCharts({
  progressions,
}: {
  progressions: ExerciseProgression[];
}) {
  if (progressions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No exercise progression data yet. Import a Trainerize PDF to see strength and power trends.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {progressions.map((progression) => {
        const data = progression.data.map((point) => ({
          date: point.sessionDate.slice(5),
          value: point.value,
        }));
        const color = progression.metricType === "power" ? "var(--chart-3)" : "var(--chart-1)";
        const metricLabel = progression.metricType === "power" ? "power" : "strength";
        return (
          <PerfChart
            key={`${progression.exerciseName}-${progression.metricType}`}
            title={`${progression.exerciseName} ${metricLabel} (${progression.unit})`}
            data={data}
            dataKey="value"
            unit={progression.unit}
            color={color}
            emptyMsg={`Not enough ${metricLabel} data yet`}
          />
        );
      })}
    </div>
  );
}
