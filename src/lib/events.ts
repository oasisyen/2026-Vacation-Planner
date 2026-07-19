import type { TripEvent } from '../store/useTripStore';

/** Events whose inclusive range covers the given ISO date. */
export function eventsOnDate(events: TripEvent[], date: string): TripEvent[] {
  return events.filter((e) => date >= e.startDate && date <= e.endDate);
}
