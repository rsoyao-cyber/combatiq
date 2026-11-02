// Check-in streak helpers. Dates are ISO YYYY-MM-DD strings (UTC, matching
// how check-ins are stored).

function shiftDay(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Consecutive days with a check-in, ending today — or yesterday, so the
// streak isn't shown as broken before today's check-in is done.
export function computeStreak(dates: string[], today: string): number {
  const logged = new Set(dates);
  let day = logged.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (logged.has(day)) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}

// The last `n` days ending today, oldest first.
export function lastNDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDay(today, i - (n - 1)));
}
