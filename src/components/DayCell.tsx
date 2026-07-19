import type { MouseEvent } from 'react';
import type { DayStatus, TripEvent, Zone } from '../store/useTripStore';
import { STATUS_META } from '../lib/status';
import { displayDayNumber, wfaWindowShort, wfaWorkWindow } from '../lib/dates';
import { formatPrice } from '../lib/flights';

interface Props {
  date: string;
  status?: DayStatus;
  events: TripEvent[];
  zone: Zone;
  inRange: boolean;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  uncovered: boolean;
  outboundPrice?: number;
  inboundPrice?: number;
  cheapestOut: boolean;
  cheapestIn: boolean;
  currency: string;
  onClick: (date: string, e: MouseEvent) => void;
}

export default function DayCell({
  date,
  status,
  events,
  zone,
  inRange,
  inMonth,
  isToday,
  selected,
  uncovered,
  outboundPrice,
  inboundPrice,
  cheapestOut,
  cheapestIn,
  currency,
  onClick,
}: Props) {
  const dayNum = displayDayNumber(date, zone);
  const meta = status ? STATUS_META[status] : undefined;

  const base =
    'relative flex flex-col h-20 sm:h-24 p-1 text-left rounded-md border transition select-none';
  const tone = !inMonth
    ? 'opacity-35'
    : !inRange
      ? 'opacity-50'
      : '';
  const bg = meta
    ? meta.cell
    : 'bg-white text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
  const ring = selected
    ? 'ring-2 ring-indigo-500 border-indigo-500'
    : uncovered
      ? 'border-amber-400 border-2'
      : 'border-zinc-200 dark:border-zinc-700';

  const title =
    status === 'WFA' ? wfaWorkWindow(date) : uncovered ? 'Has a plan — not marked PTO/WFA yet' : undefined;

  return (
    <button
      type="button"
      title={title}
      onClick={(e) => onClick(date, e)}
      className={`${base} ${bg} ${tone} ${ring} hover:brightness-95`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold leading-none ${
            isToday
              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white'
              : ''
          }`}
        >
          {dayNum}
        </span>
        {status && (
          <span className={`h-2 w-2 rounded-full ${meta!.dot}`} aria-hidden />
        )}
      </div>

      {/* WFA work window in the current display zone */}
      {status === 'WFA' && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
          🖥 {wfaWindowShort(date, zone)}
        </span>
      )}

      {/* Event chips */}
      <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
        {events.slice(0, 2).map((ev) => (
          <span
            key={ev.id}
            className="truncate rounded bg-amber-400/90 px-1 text-[10px] font-medium text-amber-950"
          >
            {ev.title}
          </span>
        ))}
        {events.length > 2 && (
          <span className="text-[10px] text-zinc-500">
            +{events.length - 2} more
          </span>
        )}
      </div>

      {/* Price badges */}
      <div className="mt-auto flex flex-wrap gap-1">
        {outboundPrice != null && (
          <span
            className={`rounded px-1 text-[10px] font-medium ${
              cheapestOut
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}
            title="Outbound JFK→TPE (EVA)"
          >
            ✈{formatPrice(outboundPrice, currency)}
          </span>
        )}
        {inboundPrice != null && (
          <span
            className={`rounded px-1 text-[10px] font-medium ${
              cheapestIn
                ? 'bg-violet-500 text-white'
                : 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
            }`}
            title="Inbound TPE→JFK (EVA)"
          >
            ↩{formatPrice(inboundPrice, currency)}
          </span>
        )}
      </div>
    </button>
  );
}
