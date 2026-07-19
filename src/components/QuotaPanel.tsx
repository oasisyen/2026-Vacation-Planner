import { useTripStore } from '../store/useTripStore';
import { computeQuota } from '../lib/quota';
import { STATUS_META } from '../lib/status';

function Bar({
  label,
  used,
  total,
  over,
  colorClass,
}: {
  label: string;
  used: number;
  total: number;
  over: boolean;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = total - used;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={over ? 'font-semibold text-rose-600' : 'text-zinc-500'}>
          {used} / {total} used
          {over ? ` · ${Math.abs(remaining)} over!` : ` · ${remaining} left`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full ${over ? 'bg-rose-500' : colorClass}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QuotaPanel() {
  const { marks, totalPTO, totalWFA, setQuota } = useTripStore();
  const q = computeQuota(marks, totalPTO, totalWFA);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Allowance tracker
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Total PTO days</span>
          <input
            type="number"
            min={0}
            value={totalPTO}
            onChange={(e) => setQuota({ totalPTO: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Total WFA days</span>
          <input
            type="number"
            min={0}
            value={totalWFA}
            onChange={(e) => setQuota({ totalWFA: Number(e.target.value) })}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
      </div>

      <div className="space-y-3">
        <Bar
          label={STATUS_META.PTO.label}
          used={q.usedPTO}
          total={totalPTO}
          over={q.overPTO}
          colorClass="bg-rose-500"
        />
        <Bar
          label={STATUS_META.WFA.label}
          used={q.usedWFA}
          total={totalWFA}
          over={q.overWFA}
          colorClass="bg-sky-500"
        />
      </div>

      {(q.overPTO || q.overWFA) && (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
          You're over your allowance. Free up some days or convert PTO ↔ WFA.
        </p>
      )}
    </section>
  );
}
