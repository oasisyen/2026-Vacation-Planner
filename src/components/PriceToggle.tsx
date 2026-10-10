import { useTripStore } from '../store/useTripStore';

/** Switch to show or hide the EVA fare badges on the calendar and list. */
export default function PriceToggle() {
  const showPrices = useTripStore((s) => s.showPrices);
  const setShowPrices = useTripStore((s) => s.setShowPrices);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={showPrices}
      onClick={() => setShowPrices(!showPrices)}
      className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition ${
          showPrices ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
            showPrices ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      Flight prices
    </button>
  );
}
