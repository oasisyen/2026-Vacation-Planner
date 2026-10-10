import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DateTime } from 'luxon';
import { useTripStore } from '../store/useTripStore';
import {
  cheapest,
  formatPrice,
  getRefreshStatus,
  isStale,
  triggerRefresh,
  type PriceData,
} from '../lib/flights';
import { eachDay, isWeekend } from '../lib/dates';

interface Props {
  prices: PriceData | null;
  loading: boolean;
  onReload: () => Promise<void> | void;
}

const OUT_COLOR = '#10b981'; // emerald
const IN_COLOR = '#8b5cf6'; // violet
const BEST_OUT = '#047857';
const BEST_IN = '#6d28d9';

/** Parse "OUT 12/61" / "IN 45/61" progress strings into a determinate fraction. */
function parseProgress(
  progress: string | null,
): { leg: 'outbound' | 'inbound'; current: number; total: number } | null {
  if (!progress) return null;
  const m = progress.match(/^(OUT|IN) (\d+)\/(\d+)$/);
  if (!m) return null;
  return { leg: m[1] === 'OUT' ? 'outbound' : 'inbound', current: Number(m[2]), total: Number(m[3]) };
}

function MiniChart({
  data,
  color,
  bestColor,
  bestDate,
  currency,
}: {
  data: { date: string; price: number; label: string }[];
  color: string;
  bestColor: string;
  bestDate?: string;
  currency: string;
}) {
  if (data.length === 0)
    return <p className="text-xs text-zinc-400">No price data.</p>;
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9 }}
          interval="preserveStartEnd"
          stroke="#a1a1aa"
        />
        <YAxis
          tick={{ fontSize: 9 }}
          width={40}
          stroke="#a1a1aa"
          domain={['dataMin - 100', 'dataMax + 50']}
          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
        />
        <Tooltip
          formatter={(v: number) => formatPrice(v, currency)}
          labelFormatter={(l) => `Date: ${l}`}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="price" radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.date} fill={d.date === bestDate ? bestColor : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function FlightPricePanel({ prices, loading, onReload }: Props) {
  const { marks, tripStart, tripEnd, tripSelection, setTripSelection } =
    useTripStore();
  const currency = prices?.currency ?? 'USD';

  // --- Refresh (dev-server scraper) ---
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshMode, setRefreshMode] = useState<'docker' | 'local' | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
    },
    [],
  );

  const startRefresh = async () => {
    setRefreshError(null);
    setJustCompleted(false);
    if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
    const { started, error } = await triggerRefresh(tripStart, tripEnd);
    if (!started) {
      setRefreshError(error ?? 'Could not start the scraper.');
      return;
    }
    setRefreshing(true);
    setProgress('starting…');
    const poll = async () => {
      const status = await getRefreshStatus();
      if (!status) return;
      setProgress(status.progress);
      setRefreshMode(status.mode);
      if (!status.running) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setRefreshing(false);
        setProgress(null);
        if (status.error) {
          setRefreshError(status.error);
        } else {
          await onReload();
          setJustCompleted(true);
          completedTimerRef.current = setTimeout(() => setJustCompleted(false), 5000);
        }
      }
    };
    await poll(); // don't wait a full 3s to learn which mode kicked off
    pollRef.current = setInterval(poll, 3000);
  };

  const toChart = (rec: Record<string, number> | undefined) =>
    Object.entries(rec ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({
        date,
        price,
        label: DateTime.fromISO(date).toFormat('LLL d'),
      }));

  const outData = useMemo(() => toChart(prices?.outbound), [prices]);
  const inData = useMemo(() => toChart(prices?.inbound), [prices]);

  const bestOut = prices ? cheapest(prices.outbound) : null;
  const bestIn = prices ? cheapest(prices.inbound) : null;

  // Combined trip picker
  // Offer every day in the trip window (not just days with a scraped fare), so a
  // trip can still be picked when prices are missing or stale. Keep the current
  // picks listed even if the window has since moved.
  const pickerDates = (picked: string) => {
    const days = tripStart <= tripEnd ? eachDay(tripStart, tripEnd) : [];
    if (picked && !days.includes(picked)) days.push(picked);
    return days.sort();
  };
  const outDates = pickerDates(tripSelection.depart);
  const inDates = pickerDates(tripSelection.ret);
  const dateOption = (d: string, price: number | undefined) =>
    `${DateTime.fromISO(d).toFormat('ccc LLL d')}${
      price != null ? ` · ${formatPrice(price, currency)}` : ''
    }`;
  const { depart, ret } = tripSelection;
  const setDepart = (depart: string) => setTripSelection({ depart });
  const setRet = (ret: string) => setTripSelection({ ret });

  const departPrice = depart ? prices?.outbound[depart] : undefined;
  const retPrice = ret ? prices?.inbound[ret] : undefined;
  const total =
    departPrice != null && retPrice != null ? departPrice + retPrice : null;

  const tripDays = useMemo(() => {
    if (!depart || !ret || ret < depart) return null;
    const days = eachDay(depart, ret);
    let pto = 0;
    let wfa = 0;
    let weekend = 0;
    for (const d of days) {
      if (marks[d] === 'PTO') pto++;
      else if (marks[d] === 'WFA') wfa++;
      else if (marks[d] === 'WEEKEND' || isWeekend(d)) weekend++;
    }
    return { length: days.length, pto, wfa, weekend };
  }, [depart, ret, marks]);

  const isMock = (prices as unknown as { _note?: string })?._note != null;
  const updated = prices
    ? DateTime.fromISO(prices.updatedAt).toRelative()
    : null;
  const stale = isMock || isStale(prices?.updatedAt);
  const parsedProgress = parseProgress(progress);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          EVA flight prices · JFK ↔ TPE
        </h2>
        {updated && (
          <span
            className={`text-xs ${isMock ? 'text-amber-600' : 'text-zinc-400'}`}
            title={isMock ? 'Sample data — run the scraper for real prices' : ''}
          >
            {isMock ? 'sample data' : `updated ${updated}`}
            {!isMock && prices?.scrapedVia && (
              <> · via {prices.scrapedVia === 'docker' ? 'Docker' : 'local Python'}</>
            )}
          </span>
        )}
      </div>

      {/* Refresh control */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startRefresh}
          disabled={refreshing}
          className={`rounded-md px-3 py-1 text-sm font-medium disabled:opacity-60 ${
            stale && !refreshing
              ? 'bg-indigo-600 text-white'
              : 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200'
          }`}
        >
          {refreshing ? 'Scraping…' : 'Refresh prices'}
        </button>
        {!refreshing && stale && !refreshError && (
          <span className="text-xs text-amber-600">
            {isMock ? 'showing sample data' : 'over a day old'} — scrapes{' '}
            {DateTime.fromISO(tripStart).toFormat('LLL d')}–
            {DateTime.fromISO(tripEnd).toFormat('LLL d')}
          </span>
        )}
      </div>

      {refreshing && (
        <div className="mb-3">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            {refreshMode && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                via {refreshMode === 'docker' ? 'Docker' : 'local Python'}
              </span>
            )}
            <span>
              {parsedProgress
                ? `Scraping ${parsedProgress.leg} · ${parsedProgress.current}/${parsedProgress.total}`
                : (progress ?? 'starting…')}
            </span>
            <span className="text-zinc-400">this can take a few minutes</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className={
                parsedProgress
                  ? 'h-full rounded-full bg-indigo-500 transition-[width] duration-500'
                  : 'h-full w-1/3 animate-pulse rounded-full bg-indigo-500'
              }
              style={
                parsedProgress
                  ? {
                      width: `${Math.min(100, Math.round((parsedProgress.current / parsedProgress.total) * 100))}%`,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {!refreshing && justCompleted && (
        <p className="mb-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ Scrape complete — prices updated.
        </p>
      )}

      {refreshError && (
        <p className="mb-3 whitespace-pre-line rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          {refreshError}
        </p>
      )}

      {loading && <p className="text-sm text-zinc-400">Loading prices…</p>}

      {!loading && !prices && (
        <p className="text-sm text-zinc-400">
          No <code>prices.json</code> found. Run{' '}
          <code>python scraper/fetch_eva_prices.py</code>.
        </p>
      )}

      {!loading && prices && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Cheapest outbound
              </p>
              {bestOut && (
                <p className="font-semibold">
                  {DateTime.fromISO(bestOut.date).toFormat('LLL d')} ·{' '}
                  {formatPrice(bestOut.price, currency)}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-500/10">
              <p className="text-xs text-violet-700 dark:text-violet-300">
                Cheapest inbound
              </p>
              {bestIn && (
                <p className="font-semibold">
                  {DateTime.fromISO(bestIn.date).toFormat('LLL d')} ·{' '}
                  {formatPrice(bestIn.price, currency)}
                </p>
              )}
            </div>
          </div>

          <p className="mb-1 text-xs font-medium text-zinc-500">
            Outbound JFK → TPE
          </p>
          <MiniChart
            data={outData}
            color={OUT_COLOR}
            bestColor={BEST_OUT}
            bestDate={bestOut?.date}
            currency={currency}
          />

          <p className="mb-1 mt-3 text-xs font-medium text-zinc-500">
            Inbound TPE → JFK
          </p>
          <MiniChart
            data={inData}
            color={IN_COLOR}
            bestColor={BEST_IN}
            bestDate={bestIn?.date}
            currency={currency}
          />

          {/* Combined trip picker */}
          <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Plan a round trip
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <label className="flex-1">
                <span className="mb-0.5 block text-xs text-zinc-500">Depart</span>
                <select
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <option value="">—</option>
                  {outDates.map((d) => (
                    <option key={d} value={d}>
                      {dateOption(d, prices?.outbound[d])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-0.5 block text-xs text-zinc-500">Return</span>
                <select
                  value={ret}
                  onChange={(e) => setRet(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <option value="">—</option>
                  {inDates
                    .filter((d) => !depart || d >= depart)
                    .map((d) => (
                      <option key={d} value={d}>
                        {dateOption(d, prices?.inbound[d])}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {(total != null || tripDays) && (
              <div className="mt-2 text-sm">
                <p>
                  Round-trip airfare:{' '}
                  {total != null ? (
                    <strong>{formatPrice(total, currency)}</strong>
                  ) : (
                    <span className="text-zinc-400">no fare data</span>
                  )}
                </p>
                {tripDays && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {tripDays.length} days away · {tripDays.pto} PTO ·{' '}
                    {tripDays.wfa} WFA · {tripDays.weekend} weekend
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
