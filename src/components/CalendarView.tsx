import { useCallback, useState, type MouseEvent } from 'react';
import { useTripStore } from '../store/useTripStore';
import { Fragment } from 'react';
import { WEEKDAY_LABELS, eachDay, monthLabel, weeksInRange } from '../lib/dates';
import { eventsOnDate } from '../lib/events';
import { isValidTrip, tripRoleOn, type RoundTrip } from '../lib/trip';
import DayCell from './DayCell';
import DayDetailPopup, { type DayDetail } from './DayDetailPopup';
import type { PriceData } from '../lib/flights';

interface Props {
  selected: Set<string>;
  uncovered: Set<string>;
  prices: PriceData | null;
  cheapestOutDate?: string;
  cheapestInDate?: string;
  today: string;
  /** Round trip to mark on the calendar (picked in the flight panel / saved option). */
  trip?: RoundTrip | null;
  onDayClick: (date: string, e: MouseEvent) => void;
}

export default function CalendarView({
  selected,
  uncovered,
  prices,
  cheapestOutDate,
  cheapestInDate,
  today,
  trip,
  onDayClick,
}: Props) {
  const { tripStart, tripEnd, marks, events, displayZone, showPrices } =
    useTripStore();
  const weeks = weeksInRange(tripStart, tripEnd);
  const currency = prices?.currency ?? 'USD';
  const tripComplete = isValidTrip(trip);
  const tripDays = tripComplete ? eachDay(trip!.depart!, trip!.ret!) : [];

  const [open, setOpen] = useState<{ date: string; anchor: HTMLElement } | null>(
    null,
  );
  const close = useCallback(() => setOpen(null), []);
  const toggleDetail = (date: string, anchor: HTMLElement) =>
    setOpen((cur) => (cur?.date === date ? null : { date, anchor }));

  const detailFor = (date: string): DayDetail => {
    const idx = tripDays.indexOf(date);
    return {
      date,
      status: marks[date],
      events: eventsOnDate(events, date),
      zone: displayZone,
      uncovered: uncovered.has(date),
      tripRole: tripRoleOn(trip, date),
      tripDay: idx >= 0 ? { n: idx + 1, of: tripDays.length } : undefined,
      outboundPrice: prices?.outbound[date],
      inboundPrice: prices?.inbound[date],
      cheapestOut: date === cheapestOutDate,
      cheapestIn: date === cheapestInDate,
      currency,
      showPrices,
    };
  };

  // A month heading goes above the week holding its 1st (and above the first
  // week for the opening month), so the grid stays one continuous run of weeks.
  const headingFor = (week: string[], idx: number) => {
    const first = week.find((d) => d.endsWith('-01') && d >= tripStart && d <= tripEnd);
    if (first) return first;
    return idx === 0 ? tripStart : null;
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-1 grid grid-cols-7 gap-1 bg-zinc-50/90 px-1 py-1 text-center text-[11px] font-medium text-zinc-400 backdrop-blur dark:bg-zinc-950/90">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, idx) => {
          const heading = headingFor(week, idx);
          return (
            <Fragment key={week[0]}>
              {heading && (
                <h3
                  className={`col-span-7 text-sm font-semibold text-zinc-700 dark:text-zinc-200 ${
                    idx === 0 ? '' : 'mt-3'
                  }`}
                >
                  {monthLabel(Number(heading.slice(0, 4)), Number(heading.slice(5, 7)))}
                </h3>
              )}
              {week.map((date) => {
                const inRange = date >= tripStart && date <= tripEnd;
                return (
                  <DayCell
                    key={date}
                    date={date}
                    status={marks[date]}
                    events={eventsOnDate(events, date)}
                    zone={displayZone}
                    inRange={inRange}
                    monthStart={date.endsWith('-01')}
                    isToday={date === today}
                    selected={selected.has(date)}
                    uncovered={uncovered.has(date)}
                    outboundPrice={prices?.outbound[date]}
                    inboundPrice={prices?.inbound[date]}
                    cheapestOut={date === cheapestOutDate}
                    cheapestIn={date === cheapestInDate}
                    currency={currency}
                    showPrices={showPrices}
                    tripRole={tripRoleOn(trip, date)}
                    expanded={open?.date === date}
                    onClick={onDayClick}
                    onExpand={toggleDetail}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {open && open.anchor.isConnected && (
        <DayDetailPopup
          detail={detailFor(open.date)}
          anchor={open.anchor}
          onClose={close}
        />
      )}
    </div>
  );
}
