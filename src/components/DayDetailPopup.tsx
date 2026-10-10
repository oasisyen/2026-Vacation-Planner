import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import type { DayStatus, TripEvent, Zone } from '../store/useTripStore';
import { STATUS_META } from '../lib/status';
import { shortDayLabel, wfaWorkWindow } from '../lib/dates';
import { formatPrice } from '../lib/flights';
import type { TripRole } from '../lib/trip';
import { eventTimeIn, eventTimeLabel } from '../lib/events';

export interface DayDetail {
  date: string;
  status?: DayStatus;
  events: TripEvent[];
  zone: Zone;
  uncovered: boolean;
  tripRole?: TripRole;
  /** 1-based day index within the round trip, when it's a complete trip. */
  tripDay?: { n: number; of: number };
  outboundPrice?: number;
  inboundPrice?: number;
  cheapestOut: boolean;
  cheapestIn: boolean;
  currency: string;
  showPrices: boolean;
}

interface Props {
  detail: DayDetail;
  anchor: HTMLElement;
  onClose: () => void;
}

const POPOVER_W = 288;
const GAP = 8;
const MARGIN = 8;

/** Touch devices (and very narrow windows) get a bottom sheet instead of a popover. */
function useSheetMode() {
  const query = '(pointer: coarse), (max-width: 639px)';
  const [sheet, setSheet] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setSheet(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return sheet;
}

export default function DayDetailPopup({ detail, anchor, onClose }: Props) {
  const sheet = useSheetMode();
  return createPortal(
    sheet ? (
      <BottomSheet onClose={onClose}>
        <DetailBody detail={detail} onClose={onClose} />
      </BottomSheet>
    ) : (
      <Popover anchor={anchor} onClose={onClose}>
        <DetailBody detail={detail} onClose={onClose} />
      </Popover>
    ),
    document.body,
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/** Desktop: floats beside the date cell (right if there's room, else left). */
function Popover({
  anchor,
  onClose,
  children,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.right + GAP;
    if (left + POPOVER_W > vw - MARGIN) left = r.left - GAP - POPOVER_W;
    left = Math.max(MARGIN, Math.min(left, vw - POPOVER_W - MARGIN));
    let top = r.top;
    if (top + h > vh - MARGIN) top = vh - MARGIN - h;
    top = Math.max(MARGIN, top);
    setPos((cur) =>
      cur && cur.top === top && cur.left === left ? cur : { top, left },
    );
  }, [anchor]);

  // Re-place after every render: the content (and so the height) can change.
  useLayoutEffect(place);

  useEffect(() => {
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [place]);

  useEscape(onClose);

  // Click outside closes. Clicks on the anchor cell are ignored so its own
  // "show all" button can toggle the popover instead of closing + reopening.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchor, onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: POPOVER_W,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="animate-pop-in fixed z-50 max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
    >
      {children}
    </div>
  );
}

/** Touch: slides up from the bottom; tap the backdrop or swipe down to dismiss. */
function BottomSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const close = useCallback(() => setClosing(true), []);
  useEscape(close);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(onClose, 200);
    return () => window.clearTimeout(t);
  }, [closing, onClose]);

  // Keep the page behind from scrolling while the sheet is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (dragY > 80) close();
    setDragY(0);
    startY.current = null;
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/40 ${
          closing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
      />
      <div
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={`absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-zinc-900 shadow-2xl dark:bg-zinc-800 dark:text-zinc-100 ${
          closing ? 'animate-sheet-out' : dragY ? '' : 'animate-sheet-in'
        }`}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="-mx-4 mb-1 flex cursor-grab justify-center py-2"
        >
          <span className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailBody({
  detail: d,
  onClose,
}: {
  detail: DayDetail;
  onClose: () => void;
}) {
  const meta = d.status ? STATUS_META[d.status] : undefined;
  const hasFares =
    d.showPrices && (d.outboundPrice != null || d.inboundPrice != null);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {DateTime.fromISO(d.date).toFormat('cccc, LLL d')}
          </p>
          {d.zone !== 'America/New_York' && (
            <p className="text-[11px] text-zinc-400">
              Work day starts {shortDayLabel(d.date, d.zone)} in Taipei
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>

      {(meta || d.uncovered) && (
        <div className="space-y-1">
          {meta && (
            <span
              className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${meta.chip}`}
            >
              {meta.label}
            </span>
          )}
          {d.status === 'WFA' && (
            <p className="text-xs text-sky-700 dark:text-sky-300">
              🖥 {wfaWorkWindow(d.date)}
            </p>
          )}
          {d.uncovered && (
            <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              Has a plan but isn't marked PTO/WFA yet.
            </p>
          )}
        </div>
      )}

      {d.tripRole && (
        <Section title="Round trip">
          <p
            className={`text-xs font-medium ${
              d.tripRole === 'depart'
                ? 'text-emerald-700 dark:text-emerald-300'
                : d.tripRole === 'return'
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {d.tripRole === 'depart'
              ? '🛫 Fly out · JFK → TPE'
              : d.tripRole === 'return'
                ? '🛬 Fly home · TPE → JFK'
                : '🧳 In Taiwan'}
            {d.tripDay && (
              <span className="font-normal text-zinc-400">
                {' '}
                · day {d.tripDay.n} of {d.tripDay.of}
              </span>
            )}
          </p>
        </Section>
      )}

      <Section title={`Plans${d.events.length ? ` (${d.events.length})` : ''}`}>
        {d.events.length === 0 ? (
          <p className="text-xs text-zinc-400">Nothing planned.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-2 py-1 dark:bg-amber-500/10"
              >
                <p className="break-words font-medium">{ev.title}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {ev.startDate === ev.endDate
                    ? eventTimeLabel(ev) ?? 'All day'
                    : `${DateTime.fromISO(ev.startDate).toFormat('LLL d')} – ${DateTime.fromISO(ev.endDate).toFormat('LLL d')}${
                        eventTimeLabel(ev) ? ` · ${eventTimeLabel(ev)}` : ''
                      }`}
                </p>
                {eventTimeIn(ev, d.zone) && (
                  <p className="text-[11px] text-zinc-400">= {eventTimeIn(ev, d.zone)}</p>
                )}
                {ev.notes && (
                  <p className="mt-0.5 whitespace-pre-line break-words text-xs text-zinc-600 dark:text-zinc-300">
                    {ev.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {hasFares && (
        <Section title="EVA fares">
          <div className="flex flex-wrap gap-2 text-xs">
            {d.outboundPrice != null && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                ✈ JFK→TPE {formatPrice(d.outboundPrice, d.currency)}
                {d.cheapestOut && ' · cheapest'}
              </span>
            )}
            {d.inboundPrice != null && (
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-700 dark:text-violet-300">
                ↩ TPE→JFK {formatPrice(d.inboundPrice, d.currency)}
                {d.cheapestIn && ' · cheapest'}
              </span>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h4>
      {children}
    </div>
  );
}
