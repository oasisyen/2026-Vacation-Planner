import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { DateTime } from 'luxon';
import type { DayStatus, TripEvent, Zone } from '../store/useTripStore';
import { STATUS_META } from '../lib/status';
import { displayDayNumber, wfaWindowShort, wfaWorkWindow } from '../lib/dates';
import { formatPrice } from '../lib/flights';
import type { TripRole } from '../lib/trip';
import { eventChipTime } from '../lib/events';

interface Props {
  date: string;
  status?: DayStatus;
  events: TripEvent[];
  zone: Zone;
  inRange: boolean;
  /** 1st of a month: label the cell "Nov 1" so month changes read in the grid. */
  monthStart: boolean;
  isToday: boolean;
  selected: boolean;
  uncovered: boolean;
  outboundPrice?: number;
  inboundPrice?: number;
  cheapestOut: boolean;
  cheapestIn: boolean;
  currency: string;
  showPrices: boolean;
  tripRole?: TripRole;
  expanded: boolean;
  onClick: (date: string, e: MouseEvent) => void;
  onExpand: (date: string, anchor: HTMLElement) => void;
}

const MAX_EVENT_CHIPS = 3;

export default function DayCell({
  date,
  status,
  events,
  zone,
  inRange,
  monthStart,
  isToday,
  selected,
  uncovered,
  outboundPrice,
  inboundPrice,
  cheapestOut,
  cheapestIn,
  currency,
  showPrices,
  tripRole,
  expanded,
  onClick,
  onExpand,
}: Props) {
  const dayNum = displayDayNumber(date, zone);
  const meta = status ? STATUS_META[status] : undefined;

  const cellRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  // Detect whether anything in the cell is cut off (too many rows, or a chip's
  // text ellipsized) so we only offer the "show all" popup when it's useful.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const overflowY = body.scrollHeight > body.clientHeight + 1;
      const truncated = Array.from(
        body.querySelectorAll<HTMLElement>('[data-clip]'),
      ).some((el) => el.scrollWidth > el.clientWidth + 1);
      setClipped(overflowY || truncated);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    return () => ro.disconnect();
  });

  const hiddenEvents = Math.max(0, events.length - MAX_EVENT_CHIPS);
  const canExpand = clipped || hiddenEvents > 0;

  const base =
    'relative flex flex-col h-24 sm:h-28 p-1 text-left rounded-md border transition select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';
  const tone = inRange ? '' : 'opacity-35';
  const bg = meta
    ? meta.cell
    : 'bg-white text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
  const ring = selected
    ? 'ring-2 ring-indigo-500 border-indigo-500'
    : uncovered
      ? 'border-amber-400 border-2'
      : 'border-zinc-200 dark:border-zinc-700';

  const title =
    status === 'WFA'
      ? wfaWorkWindow(date)
      : uncovered
        ? 'Has a plan — not marked PTO/WFA yet'
        : undefined;

  const expand = (e: MouseEvent) => {
    e.stopPropagation();
    if (cellRef.current) onExpand(date, cellRef.current);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(date, e as unknown as MouseEvent);
    }
  };

  return (
    <div
      ref={cellRef}
      role="button"
      tabIndex={0}
      title={title}
      onClick={(e) => onClick(date, e)}
      onKeyDown={onKeyDown}
      className={`${base} ${bg} ${tone} ${ring} hover:brightness-95`}
    >
      <div className={`flex items-center gap-1 ${tripRole ? 'pt-0.5' : ''}`}>
        <span
          className={`text-xs font-semibold leading-none ${
            isToday
              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white'
              : ''
          }`}
        >
          {monthStart && !isToday
            ? `${DateTime.fromISO(date).toFormat('LLL')} ${dayNum}`
            : dayNum}
        </span>
        {status && (
          <span className={`h-2 w-2 rounded-full ${meta!.dot}`} aria-hidden />
        )}
        {canExpand && (
          <button
            type="button"
            onClick={expand}
            aria-label="Show everything on this day"
            aria-expanded={expanded}
            title="Show all"
            className={`ml-auto -mr-0.5 -mt-0.5 flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-bold leading-none transition ${
              expanded
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900/10 text-zinc-600 hover:bg-zinc-900/20 dark:bg-white/15 dark:text-zinc-200 dark:hover:bg-white/25'
            }`}
          >
            {hiddenEvents > 0 ? `+${hiddenEvents}` : '⋯'}
          </button>
        )}
      </div>

      <div
        ref={bodyRef}
        className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden"
      >
        {/* Round-trip flight day */}
        {(tripRole === 'depart' || tripRole === 'return') && (
          <span
            data-clip
            className={`shrink-0 truncate rounded px-0.5 text-[10px] font-semibold text-white ${
              tripRole === 'depart' ? 'bg-emerald-600' : 'bg-violet-600'
            }`}
            title={
              tripRole === 'depart'
                ? 'Round trip: fly out JFK → TPE'
                : 'Round trip: fly home TPE → JFK'
            }
          >
            {tripRole === 'depart' ? '🛫 Fly out' : '🛬 Fly home'}
          </span>
        )}

        {/* WFA work window in the current display zone */}
        {status === 'WFA' && (
          <span
            data-clip
            className="shrink-0 truncate text-[10px] font-medium text-sky-700 dark:text-sky-300"
          >
            🖥 {wfaWindowShort(date, zone)}
          </span>
        )}

        {/* Event chips */}
        {events.slice(0, MAX_EVENT_CHIPS).map((ev) => (
          <span
            key={ev.id}
            data-clip
            className="shrink-0 truncate rounded bg-amber-400/90 px-1 text-[10px] font-medium text-amber-950"
          >
            {eventChipTime(ev, date, zone) && (
              <span className="mr-0.5 font-bold">{eventChipTime(ev, date, zone)}</span>
            )}
            {ev.title}
          </span>
        ))}

        {/* Price badges */}
        {showPrices && (outboundPrice != null || inboundPrice != null) && (
          <div className="mt-auto flex shrink-0 flex-wrap gap-1">
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
        )}
      </div>

      {/* Strip across the top of every day of the round trip */}
      {tripRole && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-md bg-indigo-500"
        />
      )}
    </div>
  );
}
