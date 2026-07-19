import { useTripStore } from '../store/useTripStore';
import { fromISO, toISO } from '../lib/dates';

/**
 * Edit the planning window. The calendar renders every month between From and To,
 * so this is also how you "navigate" to other months — widen or shift the range.
 */
export default function TripRangeControl() {
  const { tripStart, tripEnd, setTripRange } = useTripStore();

  const shiftMonths = (delta: number) => {
    const start = toISO(fromISO(tripStart).plus({ months: delta }));
    const end = toISO(fromISO(tripEnd).plus({ months: delta }));
    setTripRange(start, end);
  };

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => shiftMonths(-1)}
        title="Shift window one month earlier"
        className="rounded-md border border-zinc-300 px-2 py-1 leading-none text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        ‹
      </button>
      <input
        type="date"
        value={tripStart}
        max={tripEnd}
        onChange={(e) => e.target.value && setTripRange(e.target.value, tripEnd)}
        className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
        aria-label="Trip window start"
      />
      <span className="text-zinc-400">→</span>
      <input
        type="date"
        value={tripEnd}
        min={tripStart}
        onChange={(e) => e.target.value && setTripRange(tripStart, e.target.value)}
        className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
        aria-label="Trip window end"
      />
      <button
        type="button"
        onClick={() => shiftMonths(1)}
        title="Shift window one month later"
        className="rounded-md border border-zinc-300 px-2 py-1 leading-none text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        ›
      </button>
    </div>
  );
}
