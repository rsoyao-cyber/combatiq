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
  className: string; // badge background + text colour
};

// Five bands from the coaching brief:
// Green 1–2, Green/Amber 3–4, Amber 5–6, Amber/Red 7–8, Red 9–10.
export function rpeBand(rpe: number): RpeBand {
  if (rpe <= 2) return { label: "Easy",        className: "bg-emerald-100 text-emerald-700" };
  if (rpe <= 4) return { label: "Light",       className: "bg-lime-100 text-lime-700" };
  if (rpe <= 6) return { label: "Moderate",    className: "bg-amber-100 text-amber-700" };
  if (rpe <= 8) return { label: "Hard",        className: "bg-orange-100 text-orange-700" };
  return               { label: "Very hard",   className: "bg-red-100 text-red-700" };
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
