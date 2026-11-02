"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkinLabel, initials } from "@/lib/format";
import type { SquadAthlete } from "@/lib/squad";
import { StatusPill, STATUS_ORDER } from "@/components/dashboard/StatusPill";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { LoadVsAverage } from "@/components/dashboard/LoadVsAverage";
import { CopyCheckinLink } from "@/components/dashboard/CopyCheckinLink";

export type SquadFilter = "all" | "attention" | "not_today";
type SortMode = "attention" | "checkin";

const maxSeverity = (a: SquadAthlete) => Math.max(0, ...a.reasons.map((r) => r.severity));

export function SquadTable({
  athletes,
  initialFilter = "all",
}: {
  athletes: SquadAthlete[];
  initialFilter?: SquadFilter;
}) {
  const [filter, setFilter] = useState<SquadFilter>(initialFilter);
  const [sort, setSort] = useState<SortMode>("attention");
  const [query, setQuery] = useState("");

  const counts = {
    all: athletes.length,
    attention: athletes.filter((a) => a.reasons.length > 0).length,
    not_today: athletes.filter((a) => a.daysSinceCheckin !== 0).length,
  };

  const q = query.trim().toLowerCase();
  const rows = athletes
    .filter((a) =>
      filter === "attention" ? a.reasons.length > 0
      : filter === "not_today" ? a.daysSinceCheckin !== 0
      : true,
    )
    .filter((a) => !q || a.name.toLowerCase().includes(q) || a.sport.toLowerCase().includes(q))
    .sort((a, b) => {
      const byCheckin = (a.daysSinceCheckin ?? Infinity) - (b.daysSinceCheckin ?? Infinity);
      if (sort === "checkin") return byCheckin || a.name.localeCompare(b.name);
      return (
        maxSeverity(b) - maxSeverity(a) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        byCheckin ||
        a.name.localeCompare(b.name)
      );
    });

  const FILTERS: { key: SquadFilter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "attention", label: `Needs attention ${counts.attention}` },
    { key: "not_today", label: `Not checked in today ${counts.not_today}` },
  ];

  return (
    <section id="athletes" aria-label="Athletes" className="rounded-2xl border border-border bg-card scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
        <div role="group" aria-label="Filter athletes" className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "h-8 px-3 rounded-full border text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === key
                  ? "bg-foreground border-foreground text-background"
                  : "bg-card border-input text-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-input bg-card text-sm focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search athletes"
              aria-label="Search athletes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="attention">Needs attention first</option>
              <option value="checkin">Last check-in</option>
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          {q ? `No athletes match "${query}".` : "No athletes in this view."}
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          {/* relative: keeps the sr-only header label inside the scroll box on phones */}
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-semibold">Athlete</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">Last check-in</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">Wellbeing · 14 days</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">Load this week vs 4-week avg</th>
                <th scope="col" className="px-2 py-2.5 font-semibold">Weight</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Check-in link</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-border/70 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="size-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0" aria-hidden="true">
                        {initials(a.name)}
                      </span>
                      <div className="flex flex-col leading-snug min-w-0">
                        <Link href={`/dashboard/athlete/${a.id}`} className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-4">
                          {a.name}
                        </Link>
                        <span className="text-xs text-muted-foreground truncate">
                          {[a.sport, a.weightClass].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3"><StatusPill status={a.status} /></td>
                  <td className={cn("px-2 py-3 font-medium whitespace-nowrap", a.daysSinceCheckin === 0 ? "text-foreground" : (a.daysSinceCheckin ?? 99) >= 3 ? "text-status-attention" : "text-muted-foreground")}>
                    {checkinLabel(a.daysSinceCheckin)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <Sparkline
                        values={a.wellbeingSeries}
                        label={a.wellbeing7d != null ? `Wellbeing trend, 7-day average ${a.wellbeing7d.toFixed(1)} out of 5` : "No wellbeing data in the last 14 days"}
                      />
                      <span className="font-semibold tabular-nums">{a.wellbeing7d != null ? a.wellbeing7d.toFixed(1) : "—"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3"><LoadVsAverage weekLoad={a.weekLoad} avgWeekLoad={a.avgWeekLoad} /></td>
                  <td className="px-2 py-3 tabular-nums whitespace-nowrap">
                    {a.weight != null ? (
                      <>
                        <span className="font-semibold">{a.weight} kg</span>
                        {a.weightChangePct != null && (
                          <span className="text-xs text-muted-foreground"> {a.weightChangePct > 0 ? "+" : ""}{a.weightChangePct}% / wk</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right"><CopyCheckinLink athleteId={a.id} name={a.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
