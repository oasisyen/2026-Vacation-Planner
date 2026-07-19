import { useRef } from 'react';
import { useTripStore, type PersistedTrip } from '../store/useTripStore';

export default function DataIO() {
  const state = useTripStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const data: PersistedTrip = {
      tripStart: state.tripStart,
      tripEnd: state.tripEnd,
      marks: state.marks,
      events: state.events,
      totalPTO: state.totalPTO,
      totalWFA: state.totalWFA,
      displayZone: state.displayZone,
      flightPrefs: state.flightPrefs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacation-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PersistedTrip;
        if (!parsed.marks || !Array.isArray(parsed.events)) {
          throw new Error('Not a valid plan file');
        }
        state.importState(parsed);
      } catch (err) {
        alert(`Could not import: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Backup
      </h2>
      <p className="mb-3 text-xs text-zinc-400">
        Your plan is saved automatically in this browser. Export a file to back
        up or move it to another device.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={exportJson}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium dark:border-zinc-600"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium dark:border-zinc-600"
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
