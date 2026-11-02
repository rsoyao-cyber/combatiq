"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { DomainTrend } from "@/lib/analytics";

const DOMAIN_LABELS: Record<string, string> = {
  sleep_quality:    "Sleep quality",
  physical_fatigue: "Energy",
  mental_focus:     "Focus",
  motivation:       "Motivation",
  mood:             "Mood",
  stress:           "Stress (5 = calm)",
  diet_quality:     "Diet quality",
};

const TREND_ICON: Record<string, string> = { up: "↑", down: "↓", flat: "→" };

// Line colour follows the athlete status tokens (traffic light by 7-day avg)
function lineColor(avg7: number | null): string {
  if (avg7 == null) return "var(--muted-foreground)";
  if (avg7 < 3) return "var(--status-attention)";
  if (avg7 < 4) return "var(--status-monitor)";
  return "var(--status-ready)";
}

type CheckInRow = {
  checkin_date: string;
  sleep_quality: number | null;
  physical_fatigue: number | null;
  mental_focus: number | null;
  motivation: number | null;
  mood: number | null;
  stress: number | null;
  diet_quality: number | null;
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
          value: row[t.domain as keyof CheckInRow] as number | null,
        }));

        return (
          <div key={t.domain} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-foreground">
                {DOMAIN_LABELS[t.domain]}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold" style={{ color }}>
                  {t.last7Avg != null ? t.last7Avg.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {TREND_ICON[t.trend]}
                </span>
              </div>
            </div>

            {data.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
                    formatter={(v) => [v, DOMAIN_LABELS[t.domain]]}
                  />
                  <ReferenceLine y={3} stroke="var(--border)" strokeDasharray="3 3" />
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
