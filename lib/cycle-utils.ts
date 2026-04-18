export type CyclePhase = "Menstrual" | "Follicular" | "Ovulatory" | "Luteal";

export type CycleStatus = {
  phase: CyclePhase;
  dayOfCycle: number;
  daysUntilNextPeriod: number;
  injuryRiskElevated: boolean;
};

/**
 * Returns the current cycle phase and related info given the last period start
 * date and typical cycle length.
 *
 * Phase boundaries (1-indexed day of cycle):
 *   Menstrual:  days 1–5
 *   Follicular: days 6–13
 *   Ovulatory:  days 14–16
 *   Luteal:     days 17–cycleLength
 */
export function getCurrentCyclePhase(
  lastCycleStart: string, // ISO date
  cycleLength = 28,
): CycleStatus {
  const start = new Date(lastCycleStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Day of cycle (1-indexed), wrapping across cycle boundaries
  const dayOfCycle = (diffDays % cycleLength) + 1;
  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1;

  let phase: CyclePhase;
  if (dayOfCycle <= 5) {
    phase = "Menstrual";
  } else if (dayOfCycle <= 13) {
    phase = "Follicular";
  } else if (dayOfCycle <= 16) {
    phase = "Ovulatory";
  } else {
    phase = "Luteal";
  }

  return {
    phase,
    dayOfCycle,
    daysUntilNextPeriod,
    injuryRiskElevated: phase === "Ovulatory",
  };
}
