import { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { useTripStore } from './store/useTripStore';
import { loadPlans, type SharedOption } from './lib/plans';
import { cheapest } from './lib/flights';
import CalendarView from './components/CalendarView';
import TimezoneToggle from './components/TimezoneToggle';
import QuotaSummary from './components/share/QuotaSummary';
import FlightSummary from './components/share/FlightSummary';
import EventSummary from './components/share/EventSummary';

const EMPTY = new Set<string>();
const noop = () => {};

export default function ShareApp() {
  const importState = useTripStore((s) => s.importState);
  const [options, setOptions] = useState<SharedOption[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans().then((f) => {
      setOptions(f.options);
      if (f.options.length > 0) setActiveId(f.options[0].id);
    });
  }, []);

  const active = useMemo(
    () => options?.find((o) => o.id === activeId) ?? null,
    [options, activeId],
  );

  // Hydrate the shared store so the reused CalendarView renders this option.
  useEffect(() => {
    if (active) importState(active.plan);
  }, [active, importState]);

  const prices = active?.pricesSnapshot ?? null;
  const bestOut = prices ? cheapest(prices.outbound)?.date : undefined;
  const bestIn = prices ? cheapest(prices.inbound)?.date : undefined;
  const today = DateTime.now().toISODate() ?? '';

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-bold">✈️ NYC ↔ Taipei — Trip Options</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
            read-only
          </span>
          <div className="ml-auto flex items-center gap-3">
            {active && <TimezoneToggle />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {options === null && (
          <p className="text-sm text-zinc-400">Loading options…</p>
        )}

        {options !== null && options.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400 dark:border-zinc-600">
            No options have been published yet.
          </div>
        )}

        {active && (
          <>
            {/* Option tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {options!.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setActiveId(o.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    o.id === activeId
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="mr-1 opacity-70">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>

            {active.note && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                {active.note}
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="min-w-0">
                <CalendarView
                  selected={EMPTY}
                  uncovered={EMPTY}
                  prices={prices}
                  cheapestOutDate={bestOut}
                  cheapestInDate={bestIn}
                  today={today}
                  onDayClick={noop}
                />
              </div>

              <aside className="space-y-6">
                <FlightSummary flight={active.flight} />
                <QuotaSummary
                  marks={active.plan.marks}
                  totalPTO={active.plan.totalPTO}
                  totalWFA={active.plan.totalWFA}
                />
                <EventSummary events={active.plan.events} />
              </aside>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-400">
              Saved {DateTime.fromISO(active.savedAt).toRelative() ?? ''} · shared
              for family planning
            </p>
          </>
        )}
      </main>
    </div>
  );
}
