"use client";

import { cn } from "@/lib/utils";

const DEFAULT_WORDS = ["Very poor", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Tap-to-rate 0…max scale. Starts unanswered (null) so an untouched question
// is never mistaken for a real answer.
export function RatingScale({
  id,
  label,
  value,
  onChange,
  low,
  high,
  max = 5,
  words = DEFAULT_WORDS,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  low: string;
  high: string;
  max?: number;
  words?: string[];
}) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span id={`${id}-label`} className="text-[15px] font-semibold text-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", value == null ? "text-muted-foreground" : "text-accent-foreground")}>
          {value == null ? "Tap to rate" : words[value] ?? value}
        </span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${n} of ${max}${words[n] ? `, ${words[n]}` : ""}`}
              onClick={() => onChange(n)}
              className={cn(
                "h-11 rounded-xl border text-base font-semibold tabular-nums transition-colors motion-safe:active:scale-95",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-muted border-input text-foreground/80 hover:bg-input",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
