"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import type { WeightActual, WeightTarget } from "@/lib/analytics";

export function WeightChart({
  actuals,
  targets,
}: {
  actuals: WeightActual[];
  targets: WeightTarget[];
}) {
  if (actuals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No weight data recorded yet. Athletes can log their weight in the daily check-in.
      </p>
    );
  }

  // Merge actuals and targets onto a unified date axis
  const dateSet = new Set<string>();
  actuals.forEach((a) => dateSet.add(a.date));
  targets.forEach((t) => dateSet.add(t.date));

  const actualMap = new Map(actuals.map((a) => [a.date, a.weight_kg]));
  const targetMap = new Map(targets.map((t) => [t.date, t.weight_kg]));

  const chartData = Array.from(dateSet)
    .sort()
    .map((date) => ({
      date: date.slice(5), // MM-DD
      actual: actualMap.get(date) ?? null,
      target: targetMap.get(date) ?? null,
    }));

  // Y-axis domain: span from slightly below min to slightly above max
  const allValues = [
    ...actuals.map((a) => a.weight_kg),
    ...targets.map((t) => t.weight_kg),
  ];
  const minVal = Math.floor(Math.min(...allValues) - 1);
  const maxVal = Math.ceil(Math.max(...allValues) + 1);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-5 h-0.5 bg-primary rounded" />
          Actual
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-emerald-500 rounded" />
          Target (−1%/week)
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} kg`}
            width={52}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--card)",
              color: "var(--foreground)",
            }}
            formatter={(value, name) => [
              value != null ? `${value} kg` : "—",
              name === "actual" ? "Actual" : "Target",
            ]}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)" }}
            connectNulls={false}
            name="actual"
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls={true}
            name="target"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
