import { DateTime } from 'luxon';
import type { Zone } from '../store/useTripStore';

export const EST_ZONE: Zone = 'America/New_York';
export const TPE_ZONE: Zone = 'Asia/Taipei';

/** Assumed EST working hours used for the WFA work-window overlay. */
export const WORK_START_HOUR = 9; // 9am EST
export const WORK_END_HOUR = 17; // 5pm EST

/** Parse an ISO date (YYYY-MM-DD) as a plain calendar day. */
export function fromISO(date: string): DateTime {
  return DateTime.fromISO(date);
}

export function toISO(dt: DateTime): string {
  return dt.toISODate() ?? '';
}

export function isWeekend(date: string): boolean {
  const dt = fromISO(date);
  return dt.weekday === 6 || dt.weekday === 7; // Sat=6, Sun=7 in Luxon
}

/** Inclusive list of ISO dates from start to end. */
export function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cur = fromISO(startISO).startOf('day');
  const end = fromISO(endISO).startOf('day');
  while (cur <= end) {
    out.push(toISO(cur));
    cur = cur.plus({ days: 1 });
  }
  return out;
}

/**
 * Continuous Sun..Sat weeks covering the range, so months flow into each other
 * without repeating the overlap days.
 */
export function weeksInRange(startISO: string, endISO: string): string[][] {
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  if (end < start) return [];
  let cur = start.minus({ days: start.weekday % 7 });
  const last = end.plus({ days: 6 - (end.weekday % 7) });
  const weeks: string[][] = [];
  while (cur <= last) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toISO(cur));
      cur = cur.plus({ days: 1 });
    }
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthLabel(year: number, month: number): string {
  return DateTime.local(year, month, 1).toFormat('LLLL yyyy');
}

export function shortDayLabel(date: string, zone: Zone): string {
  // Anchor the work-date at EST midnight, then view it in the display zone.
  const dt = DateTime.fromISO(date, { zone: EST_ZONE }).startOf('day');
  return dt.setZone(zone).toFormat('ccc LLL d');
}

/** The day-of-month number shown in a calendar cell for the display zone. */
export function displayDayNumber(date: string, zone: Zone): number {
  if (zone === EST_ZONE) return fromISO(date).day;
  // In Taipei view, label the cell with the local date the user experiences
  // at the start of that EST work-day (EST midnight -> Taipei ~13:00 same day).
  const dt = DateTime.fromISO(date, { zone: EST_ZONE }).startOf('day');
  return dt.setZone(zone).day;
}

/**
 * Compact work-window label in the given display zone, e.g. "9a–5p" (EST) or
 * "10p–6a⁺¹" (Taipei, crossing midnight). Used on WFA calendar cells so the
 * timezone toggle visibly reflects when you'd actually be working.
 */
export function wfaWindowShort(date: string, zone: Zone): string {
  const estStart = DateTime.fromISO(date, { zone: EST_ZONE }).set({
    hour: WORK_START_HOUR,
  });
  const estEnd = DateTime.fromISO(date, { zone: EST_ZONE }).set({
    hour: WORK_END_HOUR,
  });
  const start = estStart.setZone(zone);
  const end = estEnd.setZone(zone);
  const fmt = (dt: DateTime) =>
    dt.toFormat('h') + dt.toFormat('a').charAt(0).toLowerCase();
  const nextDay = end.day !== start.day ? '⁺¹' : '';
  return `${fmt(start)}–${fmt(end)}${nextDay}`;
}

/**
 * For a WFA day, describe the EST work window expressed in Taipei local time,
 * e.g. "Work 9am–5pm EST = 10pm–6am Taipei (next day)".
 */
export function wfaWorkWindow(date: string): string {
  const estStart = DateTime.fromISO(date, { zone: EST_ZONE }).set({
    hour: WORK_START_HOUR,
  });
  const estEnd = DateTime.fromISO(date, { zone: EST_ZONE }).set({
    hour: WORK_END_HOUR,
  });
  const tpeStart = estStart.setZone(TPE_ZONE);
  const tpeEnd = estEnd.setZone(TPE_ZONE);
  const crossesDay = tpeStart.day !== estStart.setZone(EST_ZONE).day;
  const nextNote = crossesDay ? ' (next day)' : '';
  return `Work ${estStart.toFormat('h a')}–${estEnd.toFormat(
    'h a',
  )} EST = ${tpeStart.toFormat('h a')}–${tpeEnd.toFormat(
    'h a',
  )} Taipei${nextNote}`;
}
