import { useState } from 'react';
import type { TripEvent } from '../store/useTripStore';

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

  const valid = title.trim() !== '' && startDate !== '' && endDate !== '';

  const submit = () => {
    if (!valid) return;
    // Normalize so start <= end.
    const [s, e] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    onSave({ title: title.trim(), startDate: s, endDate: e, notes: notes.trim() || undefined });
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
