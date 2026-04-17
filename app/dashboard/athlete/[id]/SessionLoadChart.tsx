"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SessionLoadPoint } from "@/lib/analytics";

export function SessionLoadChart({ loads }: { loads: SessionLoadPoint[] }) {
  const hasData = loads.some((p) => p.load > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        No training load data yet. Athletes need to log both RPE and session duration in their daily check-in.
      </p>
    );
  }

  const chartData = loads.map((p) => ({
    week: p.weekStart.slice(5), // MM-DD
    load: p.load,
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
        Weekly load (AU) — Foster sRPE method
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--card)",
              color: "var(--foreground)",
            }}
            formatter={(value) => [`${value} AU`, "Load"]}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Bar
            dataKey="load"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            name="load"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
