"use client";

import { useState } from "react";
import Link from "next/link";
import type { RagStatus } from "@/lib/analytics";

export type AthleteCardData = {
  id: string;
  name: string;
  sport: string;
  weight_class: string;
  lastCheckinDate: string | null;
  ragStatus: RagStatus;
  hasActiveInjury: boolean;
  injuryArea: string | null;
};

const RAG_COLORS: Record<RagStatus, string> = {
  red:   "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
};

const RAG_ORDER: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 };

type SortMode = "rag" | "checkin";

function CheckInLinkButton({ athleteId }: { athleteId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/checkin/${athleteId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-amber-600 transition-colors"
      title="Copy check-in link"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-500">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Check-in link
        </>
      )}
    </button>
  );
}

function AthleteCard({ athlete }: { athlete: AthleteCardData }) {
  return (
    <Link href={`/dashboard/athlete/${athlete.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all h-full flex flex-col">
        {/* header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-zinc-900 text-base leading-tight truncate group-hover:text-amber-600 transition-colors">
              {athlete.name}
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5">{athlete.sport} · {athlete.weight_class}</p>
          </div>

          {/* RAG dot */}
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className={`w-3 h-3 rounded-full ${RAG_COLORS[athlete.ragStatus]}`} />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              {athlete.ragStatus}
            </span>
          </div>
        </div>

        {/* last check-in */}
        <p className="text-xs text-zinc-400 mb-3">
          {athlete.lastCheckinDate
            ? `Last check-in: ${athlete.lastCheckinDate}`
            : "No check-ins yet"}
        </p>

        {/* injury badge */}
        {athlete.hasActiveInjury && (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3">
            ⚠ Injury{athlete.injuryArea ? ` — ${athlete.injuryArea}` : ""}
          </span>
        )}

        {/* check-in link */}
        <div className="mt-auto pt-3 border-t border-zinc-100">
          <CheckInLinkButton athleteId={athlete.id} />
        </div>
      </div>
    </Link>
  );
}

export function AthleteGrid({ athletes }: { athletes: AthleteCardData[] }) {
  const [sort, setSort] = useState<SortMode>("rag");

  const sorted = [...athletes].sort((a, b) => {
    if (sort === "rag") {
      const ragDiff = RAG_ORDER[a.ragStatus] - RAG_ORDER[b.ragStatus];
      if (ragDiff !== 0) return ragDiff;
      // secondary: most recent check-in
      return (b.lastCheckinDate ?? "").localeCompare(a.lastCheckinDate ?? "");
    }
    // sort by last check-in date descending (most recent first), no check-in goes last
    return (b.lastCheckinDate ?? "0000-00-00").localeCompare(a.lastCheckinDate ?? "0000-00-00");
  });

  return (
    <div>
      {/* sort controls */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-zinc-500 font-medium">Sort by</span>
        {(["rag", "checkin"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSort(mode)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
              sort === mode
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {mode === "rag" ? "RAG status" : "Last check-in"}
          </button>
        ))}
      </div>

      {/* grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-medium mb-2">No athletes yet</p>
          <p className="text-sm">Import a Trainerize PDF to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))}
        </div>
      )}
    </div>
  );
}
