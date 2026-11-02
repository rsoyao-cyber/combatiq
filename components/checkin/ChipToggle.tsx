"use client";

import { cn } from "@/lib/utils";

// A wrapping row of pill toggles; each chip is independently on or off.
export function ChipToggle({
  options,
  selected,
  onToggle,
  label,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option)}
            className={cn(
              "h-9 px-3 rounded-full border text-[13px] font-medium transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-muted border-input text-foreground/80 hover:bg-input",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
