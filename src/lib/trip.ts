/** Where a date sits relative to the picked round trip. */
export type TripRole = 'depart' | 'return' | 'during';

export interface RoundTrip {
  depart: string | null;
  ret: string | null;
}

/** The role of `date` in the round trip, or undefined if it's outside it. */
export function tripRoleOn(
  trip: RoundTrip | null | undefined,
  date: string,
): TripRole | undefined {
  if (!trip) return undefined;
  const { depart, ret } = trip;
  if (depart && date === depart) return 'depart';
  if (ret && date === ret) return 'return';
  if (depart && ret && date > depart && date < ret) return 'during';
  return undefined;
}

/** True when both legs are picked and the return isn't before the departure. */
export function isValidTrip(trip: RoundTrip | null | undefined): boolean {
  return !!trip?.depart && !!trip?.ret && trip.ret >= trip.depart;
}
