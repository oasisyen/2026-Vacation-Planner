import type { DayStatus, TripEvent } from '../store/useTripStore';
import { eachDay, isWeekend } from './dates';

export interface QuotaSummary {
  usedPTO: number;
  usedWFA: number;
  remainingPTO: number;
  remainingWFA: number;
  overPTO: boolean;
  overWFA: boolean;
}

export function computeQuota(
  marks: Record<string, DayStatus>,
  totalPTO: number,
  totalWFA: number,
): QuotaSummary {
  let usedPTO = 0;
  let usedWFA = 0;
  for (const status of Object.values(marks)) {
    if (status === 'PTO') usedPTO++;
    else if (status === 'WFA') usedWFA++;
    // WEEKEND never counts against a quota.
  }
  return {
    usedPTO,
    usedWFA,
    remainingPTO: totalPTO - usedPTO,
    remainingWFA: totalWFA - usedWFA,
    overPTO: usedPTO > totalPTO,
    overWFA: usedWFA > totalWFA,
  };
}

/**
 * Weekday dates inside any confirmed event that are not yet marked PTO or WFA.
 * These are the days that likely need a PTO request.
 */
export function uncoveredEventDates(
  events: TripEvent[],
  marks: Record<string, DayStatus>,
): string[] {
  const set = new Set<string>();
  for (const ev of events) {
    for (const date of eachDay(ev.startDate, ev.endDate)) {
      if (isWeekend(date)) continue;
      const m = marks[date];
      if (m !== 'PTO' && m !== 'WFA') set.add(date);
    }
  }
  return [...set].sort();
}
