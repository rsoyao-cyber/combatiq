import { Activity } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
        <Activity className="size-4 text-primary-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="font-display text-[17px] font-bold uppercase tracking-wide text-foreground">CombatIQ</span>
        <span className="text-[11px] text-muted-foreground">by TFP Clinic</span>
      </div>
    </div>
  );
}
