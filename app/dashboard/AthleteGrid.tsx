"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Link as LinkIcon } from "lucide-react";
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

const RAG_DOT: Record<RagStatus, string> = {
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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1.5"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 font-semibold">Copied!</span>
        </>
      ) : (
        <>
          <LinkIcon className="w-3 h-3" />
          Check-in link
        </>
      )}
    </Button>
  );
}

function AthleteCard({ athlete }: { athlete: AthleteCardData }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
      {/* RAG dot */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${RAG_DOT[athlete.ragStatus]}`} />

      {/* Main info */}
      <Link href={`/dashboard/athlete/${athlete.id}`} className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
          {athlete.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {athlete.sport} · {athlete.weight_class}
          {athlete.lastCheckinDate
            ? ` · ${athlete.lastCheckinDate}`
            : " · No check-ins"}
          {athlete.hasActiveInjury && (
            <span className="text-red-500 ml-1">
              · ⚠ {athlete.injuryArea ?? "Injury"}
            </span>
          )}
        </p>
      </Link>

      {/* Copy link */}
      <CheckInLinkButton athleteId={athlete.id} />
    </div>
  );
}

export function AthleteGrid({ athletes }: { athletes: AthleteCardData[] }) {
  const [sort, setSort] = useState<SortMode>("rag");

  const sorted = [...athletes].sort((a, b) => {
    if (sort === "rag") {
      const ragDiff = RAG_ORDER[a.ragStatus] - RAG_ORDER[b.ragStatus];
      if (ragDiff !== 0) return ragDiff;
      return (b.lastCheckinDate ?? "").localeCompare(a.lastCheckinDate ?? "");
    }
    return (b.lastCheckinDate ?? "0000-00-00").localeCompare(a.lastCheckinDate ?? "0000-00-00");
  });

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground font-medium">Sort by</span>
        {(["rag", "checkin"] as SortMode[]).map((mode) => (
          <Button
            key={mode}
            variant={sort === mode ? "default" : "outline"}
            size="sm"
            onClick={() => setSort(mode)}
          >
            {mode === "rag" ? "RAG status" : "Last check-in"}
          </Button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium mb-2">No athletes yet</p>
          <p className="text-sm">Import a Trainerize PDF to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))}
        </div>
      )}
    </div>
  );
}
