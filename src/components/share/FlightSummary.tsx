import { DateTime } from 'luxon';
import { formatPrice } from '../../lib/flights';
import type { ChosenFlight } from '../../lib/plans';

interface Props {
  flight: ChosenFlight | null;
}

function Leg({
  label,
  date,
  price,
  currency,
  color,
}: {
  label: string;
  date: string | null;
  price: number | null;
  currency: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-2 ${color}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="font-semibold">
        {date ? DateTime.fromISO(date).toFormat('ccc, LLL d') : '—'}
      </p>
      {price != null && (
        <p className="text-xs">{formatPrice(price, currency)}</p>
      )}
    </div>
  );
}

/** Read-only "chosen flights" card for the shared viewer. */
export default function FlightSummary({ flight }: Props) {
  if (!flight || (!flight.depart && !flight.return)) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Flights · EVA JFK ↔ TPE
        </h2>
        <p className="text-xs text-zinc-400">No flights picked for this option.</p>
      </section>
    );
  }

  const total =
    flight.departPrice != null && flight.returnPrice != null
      ? flight.departPrice + flight.returnPrice
      : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Flights · EVA JFK ↔ TPE
      </h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Leg
          label="Depart JFK → TPE"
          date={flight.depart}
          price={flight.departPrice}
          currency={flight.currency}
          color="bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
        />
        <Leg
          label="Return TPE → JFK"
          date={flight.return}
          price={flight.returnPrice}
          currency={flight.currency}
          color="bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100"
        />
      </div>
      {total != null && (
        <p className="mt-3 text-sm">
          Round-trip airfare:{' '}
          <strong>{formatPrice(total, flight.currency)}</strong>{' '}
          <span className="text-xs text-zinc-400">per person</span>
        </p>
      )}
      <p className="mt-1 text-[11px] text-zinc-400">
        Fares captured when this option was saved — confirm on EVA before booking.
      </p>
    </section>
  );
}
