import type { MouseEvent } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  WEEKDAY_LABELS,
  monthGrid,
  monthLabel,
  monthsInRange,
} from '../lib/dates';
import { eventsOnDate } from '../lib/events';
import DayCell from './DayCell';
import type { PriceData } from '../lib/flights';

interface Props {
  selected: Set<string>;
  uncovered: Set<string>;
  prices: PriceData | null;
  cheapestOutDate?: string;
  cheapestInDate?: string;
  today: string;
  onDayClick: (date: string, e: MouseEvent) => void;
}

export default function CalendarView({
  selected,
  uncovered,
  prices,
  cheapestOutDate,
  cheapestInDate,
  today,
  onDayClick,
}: Props) {
  const { tripStart, tripEnd, marks, events, displayZone } = useTripStore();
  const months = monthsInRange(tripStart, tripEnd);
  const currency = prices?.currency ?? 'USD';

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {months.map(({ year, month }) => {
        const weeks = monthGrid(year, month);
        return (
          <div key={`${year}-${month}`} className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {monthLabel(year, month)}
            </h3>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-400">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((date) => {
                const inMonth = Number(date.slice(5, 7)) === month;
                const inRange = date >= tripStart && date <= tripEnd;
                return (
                  <DayCell
                    key={date}
                    date={date}
                    status={marks[date]}
                    events={eventsOnDate(events, date)}
                    zone={displayZone}
                    inRange={inRange}
                    inMonth={inMonth}
                    isToday={date === today}
                    selected={selected.has(date)}
                    uncovered={uncovered.has(date)}
                    outboundPrice={prices?.outbound[date]}
                    inboundPrice={prices?.inbound[date]}
                    cheapestOut={date === cheapestOutDate}
                    cheapestIn={date === cheapestInDate}
                    currency={currency}
                    onClick={onDayClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
