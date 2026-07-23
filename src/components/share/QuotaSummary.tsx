import { computeQuota } from '../../lib/quota';
import { STATUS_META } from '../../lib/status';
import type { DayStatus } from '../../store/useTripStore';

interface Props {
  marks: Record<string, DayStatus>;
  totalPTO: number;
  totalWFA: number;
}

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
          {over ? ` · ${Math.abs(remaining)} over` : ` · ${remaining} left`}
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

/** Read-only allowance summary for the shared viewer. */
export default function QuotaSummary({ marks, totalPTO, totalWFA }: Props) {
  const q = computeQuota(marks, totalPTO, totalWFA);
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Time off used
      </h2>
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
    </section>
  );
}
