import { DateTime } from 'luxon';
import type { TripEvent, Zone } from '../store/useTripStore';
import { TPE_ZONE } from './dates';

/** Events whose inclusive range covers the given ISO date. */
export function eventsOnDate(events: TripEvent[], date: string): TripEvent[] {
  return events.filter((e) => date >= e.startDate && date <= e.endDate);
}

/** Zone an event's times are expressed in (Taipei unless set otherwise). */
export function eventZone(ev: TripEvent): Zone {
  return ev.timeZone ?? TPE_ZONE;
}

/** Short zone name: "Taipei", or "EDT"/"EST" depending on the date. */
export function zoneName(zone: Zone, at: DateTime): string {
  return zone === TPE_ZONE ? 'Taipei' : at.setZone(zone).toFormat('ZZZZ');
}

function instant(date: string, time: string, zone: Zone): DateTime {
  return DateTime.fromISO(`${date}T${time}`, { zone });
}

/** The event's start / end instants, when it has times. */
export function eventInstants(
  ev: TripEvent,
): { start: DateTime; end: DateTime | null } | null {
  if (!ev.startTime) return null;
  const zone = eventZone(ev);
  return {
    start: instant(ev.startDate, ev.startTime, zone),
    end: ev.endTime ? instant(ev.endDate, ev.endTime, zone) : null,
  };
}

const fmt = (dt: DateTime) => dt.toFormat(dt.minute ? 'h:mm a' : 'h a');

/** Day offset of `dt` (viewed in its own zone) relative to a calendar date. */
function dayShift(dt: DateTime, date: string): string {
  const diff = Math.round(
    dt.startOf('day').diff(DateTime.fromISO(date, { zone: dt.zone }), 'days').days,
  );
  if (diff === 0) return '';
  return diff > 0 ? ` (+${diff}d)` : ` (${diff}d)`;
}

/**
 * Full time label in the event's own zone, e.g. "7 PM – 9:30 PM Taipei".
 * Null when the plan is all-day.
 */
export function eventTimeLabel(ev: TripEvent): string | null {
  const t = eventInstants(ev);
  if (!t) return null;
  const name = zoneName(eventZone(ev), t.start);
  return t.end ? `${fmt(t.start)} – ${fmt(t.end)} ${name}` : `${fmt(t.start)} ${name}`;
}

/**
 * The same times converted to another zone, e.g. "7 AM – 9:30 AM EDT", with a
 * day marker when the conversion lands on a different date. Null when the plan
 * is all-day or `zone` is already the event's zone.
 */
export function eventTimeIn(ev: TripEvent, zone: Zone): string | null {
  const t = eventInstants(ev);
  if (!t || zone === eventZone(ev)) return null;
  const s = t.start.setZone(zone);
  const e = t.end?.setZone(zone);
  const name = zoneName(zone, s);
  const sLabel = `${fmt(s)}${dayShift(s, ev.startDate)}`;
  return e
    ? `${sLabel} – ${fmt(e)}${dayShift(e, ev.endDate)} ${name}`
    : `${sLabel} ${name}`;
}

/**
 * Compact start time for a calendar chip on `date` ("7p", "7:30p"), shown in
 * the display zone with ⁺¹/⁻¹ when that moves it to another day. Only on the
 * plan's first day; null otherwise or when all-day.
 */
export function eventChipTime(
  ev: TripEvent,
  date: string,
  zone: Zone,
): string | null {
  const t = eventInstants(ev);
  if (!t || date !== ev.startDate) return null;
  const s = t.start.setZone(zone);
  const short = s.toFormat(s.minute ? 'h:mm' : 'h') + s.toFormat('a').charAt(0).toLowerCase();
  const shift = Math.round(
    s.startOf('day').diff(DateTime.fromISO(date, { zone }), 'days').days,
  );
  return short + (shift > 0 ? '⁺¹' : shift < 0 ? '⁻¹' : '');
}
