"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { DomainTrend } from "@/lib/analytics";

const DOMAIN_LABELS: Record<string, string> = {
  sleep_quality:    "Sleep quality",
  physical_fatigue: "Physical fatigue",
  mental_focus:     "Mental focus",
  motivation:       "Motivation",
  mood:             "Mood",
  stress:           "Stress",
  diet_quality:     "Diet quality",
};

const TREND_ICON: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

function lineColor(avg7: number): string {
  if (avg7 < 3) return "#ef4444"; // red
  if (avg7 < 4) return "#f59e0b"; // amber
  return "#10b981";               // green
}

type CheckInRow = {
  checkin_date: string;
  sleep_quality: number;
  physical_fatigue: number;
  mental_focus: number;
  motivation: number;
  mood: number;
  stress: number;
  diet_quality: number;
};

export function WellbeingCharts({
  trends,
  checkIns,
}: {
  trends: DomainTrend[];
  checkIns: CheckInRow[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {trends.map((t) => {
        const color = lineColor(t.last7Avg);
        const data = checkIns.map((row) => ({
          date: row.checkin_date.slice(5), // MM-DD
          value: row[t.domain as keyof CheckInRow] as number,
        }));

        return (
          <div key={t.domain} className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-zinc-700">
                {DOMAIN_LABELS[t.domain]}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold" style={{ color }}>
                  {t.last7Avg.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400">
                  {TREND_ICON[t.trend]}
                </span>
              </div>
            </div>

            {data.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#a1a1aa" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fontSize: 9, fill: "#a1a1aa" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e4e4e7" }}
                    formatter={(v) => [v, DOMAIN_LABELS[t.domain]]}
                  />
                  <ReferenceLine y={3} stroke="#e4e4e7" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      })}
    </div>
  );
}
