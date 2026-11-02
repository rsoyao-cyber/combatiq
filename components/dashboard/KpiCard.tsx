import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  note,
  noteClassName,
  valueClassName,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  noteClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode; // e.g. a progress bar under the value
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-[28px] leading-none font-bold tabular-nums text-foreground", valueClassName)}>
        {value}
        {unit && <span className="text-base font-medium text-muted-foreground"> {unit}</span>}
      </span>
      {children}
      {note && <span className={cn("text-xs text-muted-foreground", noteClassName)}>{note}</span>}
    </div>
  );
}
