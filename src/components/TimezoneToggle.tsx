import { useTripStore } from '../store/useTripStore';
import { EST_ZONE, TPE_ZONE } from '../lib/dates';

export default function TimezoneToggle() {
  const { displayZone, setZone } = useTripStore();

  const options: { zone: typeof displayZone; label: string }[] = [
    { zone: EST_ZONE, label: 'New York (EST)' },
    { zone: TPE_ZONE, label: 'Taipei' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Display timezone"
      className="inline-flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-600"
    >
      {options.map((o) => {
        const active = displayZone === o.zone;
        return (
          <button
            key={o.zone}
            role="tab"
            aria-selected={active}
            onClick={() => setZone(o.zone)}
            className={`rounded-md px-3 py-1 font-medium transition ${
              active
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
