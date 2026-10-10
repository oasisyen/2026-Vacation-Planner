import { useState } from 'react';
import type { TripEvent, Zone } from '../store/useTripStore';
import { EST_ZONE, TPE_ZONE } from '../lib/dates';
import { eventTimeIn, eventTimeLabel } from '../lib/events';

interface Props {
  initial?: TripEvent;
  defaultDate: string;
  onSave: (data: Omit<TripEvent, 'id'>) => void;
  onCancel: () => void;
}

export default function EventEditor({
  initial,
  defaultDate,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? defaultDate);
  const [endDate, setEndDate] = useState(initial?.endDate ?? defaultDate);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [hasTime, setHasTime] = useState(!!initial?.startTime);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [timeZone, setTimeZone] = useState<Zone>(initial?.timeZone ?? TPE_ZONE);

  // Normalize so start <= end.
  const [s, e] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const timed = hasTime && startTime !== '';
  const endBeforeStart =
    timed && endTime !== '' && s === e && endTime <= startTime;

  const valid =
    title.trim() !== '' &&
    startDate !== '' &&
    endDate !== '' &&
    (!hasTime || startTime !== '') &&
    !endBeforeStart;

  const draft: Omit<TripEvent, 'id'> = {
    title: title.trim(),
    startDate: s,
    endDate: e,
    // Explicit undefineds so an edit (merged into the old event) clears a
    // previously set time when "Add a time" is unticked.
    startTime: timed ? startTime : undefined,
    endTime: timed ? endTime || undefined : undefined,
    timeZone: timed ? timeZone : undefined,
    notes: notes.trim() || undefined,
  };
  const preview = timed ? eventTimeLabel(draft as TripEvent) : null;
  const previewOther = timed
    ? eventTimeIn(draft as TripEvent, timeZone === TPE_ZONE ? EST_ZONE : TPE_ZONE)
    : null;

  const submit = () => {
    if (!valid) return;
    onSave(draft);
  };

  return (
    <div className="space-y-2 rounded-lg border border-indigo-300 bg-indigo-50/60 p-3 dark:border-indigo-500/40 dark:bg-indigo-500/10">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Plan title (e.g. Cousin's wedding)"
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
      />
      <div className="flex items-center gap-2 text-sm">
        <label className="flex-1">
          <span className="mb-0.5 block text-xs text-zinc-500">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex-1">
          <span className="mb-0.5 block text-xs text-zinc-500">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
      </div>
      {/* Optional time */}
      <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={hasTime}
          onChange={(ev) => setHasTime(ev.target.checked)}
          className="accent-indigo-600"
        />
        Add a time
      </label>
      {hasTime && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
          <div className="flex items-end gap-2 text-sm">
            <label className="flex-1">
              <span className="mb-0.5 block text-xs text-zinc-500">
                Starts{s !== e ? ` (${s.slice(5)})` : ''}
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(ev) => setStartTime(ev.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <label className="flex-1">
              <span className="mb-0.5 block text-xs text-zinc-500">
                Ends{s !== e ? ` (${e.slice(5)})` : ''} · optional
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(ev) => setEndTime(ev.target.value)}
                className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-0.5 block text-xs text-zinc-500">Time zone</span>
            <select
              value={timeZone}
              onChange={(ev) => setTimeZone(ev.target.value as Zone)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            >
              <option value={TPE_ZONE}>Taipei</option>
              <option value={EST_ZONE}>New York</option>
            </select>
          </label>
          {endBeforeStart ? (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              End time is before the start time.
            </p>
          ) : (
            preview && (
              <p className="text-xs text-zinc-500">
                🕒 {preview}
                {previewOther && (
                  <span className="text-zinc-400"> · {previewOther}</span>
                )}
              </p>
            )
          )}
          {hasTime && startTime === '' && (
            <p className="text-xs text-zinc-400">Pick a start time, or untick “Add a time”.</p>
          )}
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm text-zinc-500"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={submit}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
        >
          Save plan
        </button>
      </div>
    </div>
  );
}
