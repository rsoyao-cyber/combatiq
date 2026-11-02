import { cn } from "@/lib/utils";
import type { SquadStatus } from "@/lib/squad";

const STATUS: Record<SquadStatus, { label: string; className: string; dot: string }> = {
  attention: { label: "Attention",      className: "bg-status-attention-bg text-status-attention", dot: "bg-status-attention" },
  monitor:   { label: "Monitor",        className: "bg-status-monitor-bg text-status-monitor",     dot: "bg-status-monitor" },
  ready:     { label: "Ready",          className: "bg-status-ready-bg text-status-ready",         dot: "bg-status-ready" },
  no_data:   { label: "No recent data", className: "bg-muted text-muted-foreground",               dot: "bg-muted-foreground" },
};

export const STATUS_ORDER: Record<SquadStatus, number> = { attention: 0, monitor: 1, no_data: 2, ready: 3 };

export function StatusPill({ status, className }: { status: SquadStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", s.className, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  );
}
