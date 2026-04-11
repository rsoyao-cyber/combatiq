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
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex-1 min-w-0">
      <p className="text-sm font-semibold text-zinc-800 mb-4">{title}</p>
      {data.length < 2 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">{emptyMsg}</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#f4f4f5" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e4e4e7" }}
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
      <p className="text-sm text-zinc-400">No exercise progression data yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {progressions.map((progression) => {
        const data = progression.data.map((point) => ({
          date: point.sessionDate.slice(5),
          value: point.value,
        }));
        const color = progression.metricType === "power" ? "#f59e0b" : "#6366f1";
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
