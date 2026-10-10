import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { useTripStore, type PersistedTrip } from '../store/useTripStore';
import {
  loadPlans,
  savePlans,
  type ChosenFlight,
  type PlansFile,
  type SharedOption,
} from '../lib/plans';
import { formatPrice, type PriceData } from '../lib/flights';

interface Props {
  prices: PriceData | null;
}

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Snapshot the persisted subset of the current editor state. */
function snapshotPlan(s: ReturnType<typeof useTripStore.getState>): PersistedTrip {
  return {
    tripStart: s.tripStart,
    tripEnd: s.tripEnd,
    marks: s.marks,
    events: s.events,
    totalPTO: s.totalPTO,
    totalWFA: s.totalWFA,
    displayZone: s.displayZone,
    flightPrefs: s.flightPrefs,
  };
}

export default function SharedOptionsPanel({ prices }: Props) {
  const importState = useTripStore((s) => s.importState);
  const tripSelection = useTripStore((s) => s.tripSelection);
  const setTripSelection = useTripStore((s) => s.setTripSelection);

  const [options, setOptions] = useState<SharedOption[]>([]);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Inline confirm / rename instead of window.confirm / window.prompt, which some
  // embedded browsers (e.g. app webviews) suppress by returning false/null.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    void loadPlans().then((f) => {
      setOptions(f.options);
      setLoaded(true);
    });
  }, []);

  const persist = async (next: SharedOption[]) => {
    setOptions(next);
    setError(null);
    const file: PlansFile = {
      schema: 1,
      generatedAt: new Date().toISOString(),
      options: next,
    };
    const res = await savePlans(file);
    if (!res.ok) {
      setError(res.error ?? 'Could not save.');
      return false;
    }
    return true;
  };

  const currentFlight = (): ChosenFlight | null => {
    const { depart, ret } = tripSelection;
    if (!depart && !ret) return null;
    return {
      depart: depart || null,
      departPrice: depart ? (prices?.outbound[depart] ?? null) : null,
      return: ret || null,
      returnPrice: ret ? (prices?.inbound[ret] ?? null) : null,
      currency: prices?.currency ?? 'USD',
    };
  };

  const saveOption = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Give the option a name first.');
      return;
    }
    const option: SharedOption = {
      id: genId(),
      label: trimmed,
      note: note.trim() || undefined,
      savedAt: new Date().toISOString(),
      plan: snapshotPlan(useTripStore.getState()),
      flight: currentFlight(),
      pricesSnapshot: prices,
    };
    const ok = await persist([...options, option]);
    if (ok) {
      setLabel('');
      setNote('');
      setStatus(`Saved "${trimmed}".`);
      window.setTimeout(() => setStatus(null), 2500);
    }
  };

  const loadOption = (o: SharedOption) => {
    importState(o.plan);
    setTripSelection({
      depart: o.flight?.depart ?? '',
      ret: o.flight?.return ?? '',
    });
    setStatus(`Loaded "${o.label}" into the editor.`);
    window.setTimeout(() => setStatus(null), 2500);
  };

  const startRename = (o: SharedOption) => {
    setConfirmingId(null);
    setRenamingId(o.id);
    setRenameDraft(o.label);
  };

  const commitRename = (o: SharedOption) => {
    const trimmed = renameDraft.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === o.label) return;
    void persist(
      options.map((x) => (x.id === o.id ? { ...x, label: trimmed } : x)),
    );
  };

  const deleteOption = async (o: SharedOption) => {
    setConfirmingId(null);
    const ok = await persist(options.filter((x) => x.id !== o.id));
    if (ok) {
      setStatus(`Deleted "${o.label}".`);
      window.setTimeout(() => setStatus(null), 2500);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[idx], next[target]] = [next[target], next[idx]];
    void persist(next);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Shared options
      </h2>
      <p className="mb-3 text-xs text-zinc-400">
        Freeze the current plan (calendar, PTO/WFA, events, and the round trip
        picked above) as a named option, then publish them all as a read-only
        page for your family.
      </p>

      {/* Save form */}
      <div className="space-y-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Option name (e.g. Late Nov — cheapest fares)"
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the family (optional)"
          rows={2}
          className="w-full resize-y rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={saveOption}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white"
        >
          Save current plan as option
        </button>
      </div>

      {status && <p className="mt-2 text-xs text-emerald-600">{status}</p>}
      {error && (
        <p className="mt-2 whitespace-pre-line rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          {error}
        </p>
      )}

      {/* Saved list */}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Saved options {loaded ? `(${options.length})` : '…'}
        </h3>
        {loaded && options.length === 0 && (
          <p className="text-xs text-zinc-400">
            None yet. Save one above to start building the shareable page.
          </p>
        )}
        <ul className="space-y-2">
          {options.map((o, idx) => (
            <li
              key={o.id}
              className="rounded-lg border border-zinc-200 p-2 text-sm dark:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {renamingId === o.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(o);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="w-full rounded border border-indigo-400 px-1 py-0.5 text-sm font-medium dark:bg-zinc-900"
                    />
                  ) : (
                    <p className="truncate font-medium">{o.label}</p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    {DateTime.fromISO(o.plan.tripStart).toFormat('LLL d')}–
                    {DateTime.fromISO(o.plan.tripEnd).toFormat('LLL d')}
                    {o.flight?.depart && o.flight?.return && (
                      <>
                        {' · ✈ '}
                        {DateTime.fromISO(o.flight.depart).toFormat('LLL d')} →{' '}
                        {DateTime.fromISO(o.flight.return).toFormat('LLL d')}
                        {o.flight.departPrice != null &&
                          o.flight.returnPrice != null && (
                            <>
                              {' · '}
                              {formatPrice(
                                o.flight.departPrice + o.flight.returnPrice,
                                o.flight.currency,
                              )}
                            </>
                          )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-zinc-400">
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="px-1 disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === options.length - 1}
                      className="px-1 disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {renamingId === o.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => commitRename(o)}
                      className="rounded bg-indigo-600 px-2 py-0.5 font-medium text-white"
                    >
                      Save name
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="rounded border border-zinc-300 px-2 py-0.5 dark:border-zinc-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : confirmingId === o.id ? (
                  <>
                    <span className="self-center text-rose-600 dark:text-rose-300">
                      Delete this option? Can't be undone.
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteOption(o)}
                      className="rounded bg-rose-600 px-2 py-0.5 font-medium text-white"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded border border-zinc-300 px-2 py-0.5 dark:border-zinc-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => loadOption(o)}
                      className="rounded border border-zinc-300 px-2 py-0.5 font-medium dark:border-zinc-600"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => startRename(o)}
                      className="rounded border border-zinc-300 px-2 py-0.5 dark:border-zinc-600"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(null);
                        setConfirmingId(o.id);
                      }}
                      className="rounded border border-zinc-300 px-2 py-0.5 text-rose-600 dark:border-zinc-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
