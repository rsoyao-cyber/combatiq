// Training load helpers — Foster session-RPE method.
//
// Load (AU) = RPE (0–10) × session minutes, per session. The database stores
// the same value as check_in_session.load_au; sessionLoad() exists for the
// places that need it before a row is saved (e.g. the check-in email).

export function sessionLoad(rpe: number, durationMins: number): number {
  return rpe * durationMins;
}

export type RpeBand = {
  label: string;
  className: string; // tinted badge: background + text colour (light and dark)
  color: string;     // solid band colour, e.g. for a selected RPE button
};

// Five bands from the coaching brief:
// Green 1–2, Green/Amber 3–4, Amber 5–6, Amber/Red 7–8, Red 9–10. 0 = rest.
export function rpeBand(rpe: number): RpeBand {
  if (rpe === 0) return { label: "Rest",      color: "#94A3B8", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  if (rpe <= 2)  return { label: "Easy",      color: "#2FB29A", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
  if (rpe <= 4)  return { label: "Light",     color: "#A3E635", className: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300" };
  if (rpe <= 6)  return { label: "Moderate",  color: "#FBBF24", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" };
  if (rpe <= 8)  return { label: "Hard",      color: "#FB923C", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" };
  return               { label: "Very hard", color: "#F87171", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" };
}

export type SessionLike = {
  rpe: number;
  duration_mins: number;
  session_types: string[];
};

export type DaySummary = {
  count: number;
  totalMins: number;
  totalLoad: number;
  types: string[]; // deduplicated, in first-seen order
};

export function summariseDay(sessions: SessionLike[]): DaySummary {
  return {
    count: sessions.length,
    totalMins: sessions.reduce((sum, s) => sum + s.duration_mins, 0),
    totalLoad: sessions.reduce((sum, s) => sum + sessionLoad(s.rpe, s.duration_mins), 0),
    types: [...new Set(sessions.flatMap((s) => s.session_types))],
  };
}
