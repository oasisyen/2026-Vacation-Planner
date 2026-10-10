import { DateTime } from 'luxon';
import type { TripEvent } from '../../store/useTripStore';
import { EST_ZONE, TPE_ZONE } from '../../lib/dates';
import { eventTimeIn, eventTimeLabel, eventZone } from '../../lib/events';

/** Family is split across both cities, so show the time in the other one too. */
const otherZone = (e: TripEvent) => (eventZone(e) === TPE_ZONE ? EST_ZONE : TPE_ZONE);

interface Props {
  events: TripEvent[];
}

function range(e: TripEvent): string {
  const start = DateTime.fromISO(e.startDate).toFormat('LLL d');
  if (e.startDate === e.endDate) return start;
  return `${start} – ${DateTime.fromISO(e.endDate).toFormat('LLL d')}`;
}

/** Read-only list of confirmed plans for the shared viewer. */
export default function EventSummary({ events }: Props) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Plans
      </h2>
      <ul className="space-y-2">
        {sorted.map((e) => (
          <li key={e.id} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{e.title}</span>
              <span className="shrink-0 text-xs text-zinc-400">{range(e)}</span>
            </div>
            {eventTimeLabel(e) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                🕒 {eventTimeLabel(e)}
                {eventTimeIn(e, otherZone(e)) && (
                  <span className="text-zinc-400"> · {eventTimeIn(e, otherZone(e))}</span>
                )}
              </p>
            )}
            {e.notes && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{e.notes}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
