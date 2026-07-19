import type { DayStatus } from '../store/useTripStore';
import { STATUS_META, STATUS_ORDER } from '../lib/status';

interface Props {
  count: number;
  onApply: (status: DayStatus) => void;
  onClear: () => void;
  onDeselect: () => void;
}

export default function SelectionToolbar({
  count,
  onApply,
  onClear,
  onDeselect,
}: Props) {
  const disabled = count === 0;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white/90 p-2 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
      <span className="text-sm text-zinc-500">
        {count > 0 ? (
          <>
            <strong className="text-zinc-800 dark:text-zinc-100">{count}</strong>{' '}
            day{count === 1 ? '' : 's'} selected
          </>
        ) : (
          'Click days to select · Shift-click for a range'
        )}
      </span>
      <div className="ml-auto flex flex-wrap gap-1.5">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onApply(s)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium disabled:opacity-40 ${STATUS_META[s].chip}`}
          >
            Mark {STATUS_META[s].label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200"
        >
          Clear mark
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDeselect}
          className="rounded-md px-2.5 py-1 text-sm text-zinc-500 disabled:opacity-40"
        >
          Deselect
        </button>
      </div>
    </div>
  );
}
