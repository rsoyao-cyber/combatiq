"use client";

import { cn } from "@/lib/utils";
import { rpeBand } from "@/lib/load";

// 0–10 session-RPE picker. Each button carries its band colour as a top
// stripe; the selected one fills with it so the colour reads at a glance.
export function RpeScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const selectedBand = value != null ? rpeBand(value) : null;

  return (
    <div role="group" aria-label="Session RPE" className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => {
          const band = rpeBand(n);
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`RPE ${n}, ${band.label}`}
              onClick={() => onChange(n)}
              style={{
                boxShadow: `inset 0 3px 0 ${band.color}`,
                ...(selected ? { backgroundColor: band.color, borderColor: band.color } : {}),
              }}
              className={cn(
                "h-11 rounded-xl border text-base font-semibold tabular-nums transition-colors motion-safe:active:scale-95",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                selected ? "text-[#08131E]" : "bg-muted border-input text-foreground/80 hover:bg-input",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm min-h-5" aria-live="polite">
        {selectedBand ? (
          <>
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: selectedBand.color }} />
            <span className="font-semibold text-foreground">{value} · {selectedBand.label}</span>
          </>
        ) : (
          <span className="text-muted-foreground">0 = rest · 10 = maximal</span>
        )}
      </div>
    </div>
  );
}
