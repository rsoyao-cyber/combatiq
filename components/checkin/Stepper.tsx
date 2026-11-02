"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// −/+ stepper. `value` may be null (not answered yet): it shows "—" and the
// first tap starts from `start`, so an untouched optional field stays empty.
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  start = min,
  format = (v) => String(v),
  label,
  className,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  start?: number;
  format?: (value: number) => string;
  label: string; // used for the buttons' accessible names
  className?: string;
}) {
  const buttonClass =
    "size-10 rounded-xl border border-input bg-muted text-foreground flex items-center justify-center transition-colors hover:bg-input disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring";

  function nudge(direction: 1 | -1) {
    if (value == null) return onChange(start);
    onChange(Math.min(max, Math.max(min, +(value + direction * step).toFixed(2))));
  }

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value != null && value <= min}
        onClick={() => nudge(-1)}
        className={buttonClass}
      >
        <Minus className="size-4" />
      </button>
      <span
        className={cn("min-w-12 text-center text-xl font-semibold tabular-nums", value == null && "text-muted-foreground")}
        aria-live="polite"
      >
        {value == null ? "—" : format(value)}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value != null && value >= max}
        onClick={() => nudge(1)}
        className={buttonClass}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
