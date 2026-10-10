import { useTripStore } from '../store/useTripStore';
import type { DayStatus } from '../store/useTripStore';
import { STATUS_META, STATUS_ORDER } from '../lib/status';
import { shortDayLabel, wfaWorkWindow } from '../lib/dates';
import { eventChipTime, eventTimeLabel, eventsOnDate } from '../lib/events';
import { formatPrice, type PriceData } from '../lib/flights';
import { tripRoleOn, type RoundTrip } from '../lib/trip';

interface Props {
  prices: PriceData | null;
  /** Round trip whose flight days get a chip in the plans column. */
  trip?: RoundTrip | null;
  /** Shared page: show each day's status as a chip with no edit controls. */
  readOnly?: boolean;
}

export default function ListView({ prices, trip, readOnly = false }: Props) {
  const { marks, events, displayZone, showPrices, setMark, clearMarks } =
    useTripStore();
  const currency = prices?.currency ?? 'USD';

  // Marked days, plus the flight days so the trip shows even if they're unmarked.
  const dates = [
    ...new Set(
      [...Object.keys(marks), trip?.depart, trip?.ret].filter(
        (d): d is string => !!d,
      ),
    ),
  ].sort();

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400 dark:border-zinc-600">
        {readOnly
          ? 'No days marked in this option.'
          : 'No days marked yet. Switch to the Calendar to mark PTO / WFA / weekend days.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Plans / notes</th>
            {showPrices && <th className="px-3 py-2 text-right">EVA fare</th>}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const status = marks[date];
            const dayEvents = eventsOnDate(events, date);
            const out = prices?.outbound[date];
            const inn = prices?.inbound[date];
            const role = tripRoleOn(trip, date);
            return (
              <tr
                key={date}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {shortDayLabel(date, displayZone)}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    status && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_META[status].chip}`}
                      >
                        {STATUS_META[status].label}
                      </span>
                    )
                  ) : (
                    <div className="flex items-center gap-1">
                      {STATUS_ORDER.map((s: DayStatus) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMark(date, s)}
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            status === s
                              ? STATUS_META[s].chip
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => clearMarks([date])}
                        className="ml-1 text-xs text-zinc-400 hover:text-rose-500"
                        title="Clear"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {status === 'WFA' && (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {wfaWorkWindow(date)}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                  {role === 'depart' && (
                    <span className="mr-1 inline-block rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      🛫 Fly out · JFK → TPE
                    </span>
                  )}
                  {role === 'return' && (
                    <span className="mr-1 inline-block rounded bg-violet-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      🛬 Fly home · TPE → JFK
                    </span>
                  )}
                  {dayEvents.map((e) => (
                    <span
                      key={e.id}
                      className="mr-1 inline-block rounded bg-amber-400/80 px-1.5 py-0.5 text-[11px] text-amber-950"
                      title={eventTimeLabel(e) ?? undefined}
                    >
                      {eventChipTime(e, date, displayZone) && (
                        <span className="mr-1 font-bold">
                          {eventChipTime(e, date, displayZone)}
                        </span>
                      )}
                      {e.title}
                    </span>
                  ))}
                </td>
                {showPrices && (
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                    {out != null && (
                      <div className="text-emerald-600 dark:text-emerald-400">
                        ✈ {formatPrice(out, currency)}
                      </div>
                    )}
                    {inn != null && (
                      <div className="text-violet-600 dark:text-violet-400">
                        ↩ {formatPrice(inn, currency)}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
