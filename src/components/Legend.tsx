import type { DayStatus } from '../store/useTripStore';
import { STATUS_META } from '../lib/status';

export default function Legend() {
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
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-4 rounded-full bg-indigo-500" />
        Round trip
      </span>
    </div>
  );
}
