import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import { DateTime } from 'luxon';
import { useTripStore, type DayStatus } from './store/useTripStore';
import { eachDay } from './lib/dates';
import { uncoveredEventDates } from './lib/quota';
import { cheapest, loadPrices, type PriceData } from './lib/flights';
import CalendarView from './components/CalendarView';
import ListView from './components/ListView';
import SelectionToolbar from './components/SelectionToolbar';
import QuotaPanel from './components/QuotaPanel';
import TimezoneToggle from './components/TimezoneToggle';
import TripRangeControl from './components/TripRangeControl';
import EventList from './components/EventList';
import DataIO from './components/DataIO';

// recharts is heavy; load the flight panel as a separate async chunk after first paint.
const FlightPricePanel = lazy(() => import('./components/FlightPricePanel'));
import { STATUS_META } from './lib/status';

type View = 'calendar' | 'list';

export default function App() {
  const { tripStart, tripEnd, marks, events, setMarks, clearMarks } =
    useTripStore();

  const [view, setView] = useState<View>('calendar');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const [prices, setPrices] = useState<PriceData | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);

  const reloadPrices = useCallback(async () => {
    setLoadingPrices(true);
    const p = await loadPrices();
    setPrices(p);
    setLoadingPrices(false);
  }, []);

  useEffect(() => {
    void reloadPrices();
  }, [reloadPrices]);

  const today = DateTime.now().toISODate() ?? '';
  const uncovered = useMemo(
    () => new Set(uncoveredEventDates(events, marks)),
    [events, marks],
  );
  const bestOut = prices ? cheapest(prices.outbound)?.date : undefined;
  const bestIn = prices ? cheapest(prices.inbound)?.date : undefined;

  const inRange = (d: string) => d >= tripStart && d <= tripEnd;

  const handleDayClick = (date: string, e: MouseEvent) => {
    if (!inRange(date)) return;

    if (e.shiftKey && anchor) {
      const [a, b] = anchor <= date ? [anchor, date] : [date, anchor];
      const range = eachDay(a, b).filter(inRange);
      setSelected(new Set(range));
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selected);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      setSelected(next);
      setAnchor(date);
      return;
    }

    // Plain click: toggle a single-day selection.
    if (selected.size === 1 && selected.has(date)) {
      setSelected(new Set());
      setAnchor(null);
    } else {
      setSelected(new Set([date]));
      setAnchor(date);
    }
  };

  const applyStatus = (status: DayStatus) => {
    setMarks([...selected], status);
  };
  const clearSelected = () => clearMarks([...selected]);
  const deselect = () => {
    setSelected(new Set());
    setAnchor(null);
  };

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-bold">
            ✈️ NYC ↔ Taipei Vacation Planner
          </h1>
          <TripRangeControl />
          <div className="ml-auto flex items-center gap-3">
            <TimezoneToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
        {/* Left: calendar / list */}
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-600">
              {(['calendar', 'list'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
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
            <Legend />
          </div>

          {view === 'calendar' ? (
            <>
              <SelectionToolbar
                count={selected.size}
                onApply={applyStatus}
                onClear={clearSelected}
                onDeselect={deselect}
              />
              <div className="no-select">
                <CalendarView
                  selected={selected}
                  uncovered={uncovered}
                  prices={prices}
                  cheapestOutDate={bestOut}
                  cheapestInDate={bestIn}
                  today={today}
                  onDayClick={handleDayClick}
                />
              </div>
            </>
          ) : (
            <ListView prices={prices} />
          )}
        </div>

        {/* Right: panels */}
        <aside className="space-y-6">
          <QuotaPanel />
          <Suspense
            fallback={
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
                Loading flight prices…
              </div>
            }
          >
            <FlightPricePanel
              prices={prices}
              loading={loadingPrices}
              onReload={reloadPrices}
            />
          </Suspense>
          <EventList />
          <DataIO />
        </aside>
      </main>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
      {(['PTO', 'WFA', 'WEEKEND'] as DayStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
          {STATUS_META[s].label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm border-2 border-amber-400" />
        Needs PTO
      </span>
    </div>
  );
}
