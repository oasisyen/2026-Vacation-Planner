import { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { uncoveredEventDates } from '../lib/quota';
import { shortDayLabel } from '../lib/dates';
import EventEditor from './EventEditor';

export default function EventList() {
  const {
    events,
    marks,
    displayZone,
    tripStart,
    addEvent,
    updateEvent,
    removeEvent,
    setMark,
  } = useTripStore();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const uncovered = uncoveredEventDates(events, marks);
  const sorted = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const dateRangeLabel = (start: string, end: string) =>
    start === end
      ? shortDayLabel(start, displayZone)
      : `${shortDayLabel(start, displayZone)} – ${shortDayLabel(end, displayZone)}`;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Confirmed plans
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-sm font-medium text-white"
          >
            + Add plan
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3">
          <EventEditor
            defaultDate={tripStart}
            onSave={(data) => {
              addEvent(data);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {uncovered.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="mb-2 font-medium text-amber-800 dark:text-amber-200">
            {uncovered.length} plan day{uncovered.length === 1 ? '' : 's'} need
            time off — not marked PTO/WFA yet:
          </p>
          <ul className="space-y-1">
            {uncovered.map((d) => (
              <li key={d} className="flex items-center justify-between gap-2">
                <span className="text-amber-900 dark:text-amber-100">
                  {shortDayLabel(d, displayZone)}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMark(d, 'PTO')}
                    className="rounded bg-rose-500 px-2 py-0.5 text-xs font-medium text-white"
                  >
                    Mark PTO
                  </button>
                  <button
                    type="button"
                    onClick={() => setMark(d, 'WFA')}
                    className="rounded bg-sky-500 px-2 py-0.5 text-xs font-medium text-white"
                  >
                    Mark WFA
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sorted.length === 0 && !adding && (
        <p className="text-sm text-zinc-400">
          No plans yet. Add confirmed events (weddings, dinners, tours) to see
          which dates need PTO.
        </p>
      )}

      <ul className="space-y-2">
        {sorted.map((ev) =>
          editingId === ev.id ? (
            <li key={ev.id}>
              <EventEditor
                initial={ev}
                defaultDate={ev.startDate}
                onSave={(data) => {
                  updateEvent(ev.id, data);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={ev.id}
              className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{ev.title}</p>
                  <p className="text-xs text-zinc-500">
                    {dateRangeLabel(ev.startDate, ev.endDate)}
                  </p>
                  {ev.notes && (
                    <p className="mt-1 text-xs text-zinc-500">{ev.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(ev.id);
                      setAdding(false);
                    }}
                    className="rounded px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEvent(ev.id)}
                    className="rounded px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
