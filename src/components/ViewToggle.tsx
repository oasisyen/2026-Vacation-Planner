export type View = 'calendar' | 'list';

/** Segmented Calendar / List switch. */
export default function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-600">
      {(['calendar', 'list'] as View[]).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 font-medium capitalize transition ${
            view === v
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
