import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DayStatus = 'PTO' | 'WFA' | 'WEEKEND';

export type Zone = 'America/New_York' | 'Asia/Taipei';

export interface TripEvent {
  id: string;
  title: string;
  /** inclusive ISO date range; startDate === endDate means a single day */
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface TripState {
  tripStart: string; // ISO date (YYYY-MM-DD)
  tripEnd: string;
  /** date (EST work-date) -> status */
  marks: Record<string, DayStatus>;
  events: TripEvent[];
  totalPTO: number;
  totalWFA: number;
  displayZone: Zone;
  flightPrefs: { origin: string; destination: string };

  // actions
  setTripRange: (start: string, end: string) => void;
  setMark: (date: string, status: DayStatus) => void;
  setMarks: (dates: string[], status: DayStatus) => void;
  clearMarks: (dates: string[]) => void;
  toggleMark: (date: string, status: DayStatus) => void;
  addEvent: (event: Omit<TripEvent, 'id'>) => void;
  updateEvent: (id: string, patch: Partial<Omit<TripEvent, 'id'>>) => void;
  removeEvent: (id: string) => void;
  setQuota: (patch: Partial<{ totalPTO: number; totalWFA: number }>) => void;
  setZone: (zone: Zone) => void;
  importState: (state: PersistedTrip) => void;
}

/** The subset of state we persist / export. */
export type PersistedTrip = Pick<
  TripState,
  | 'tripStart'
  | 'tripEnd'
  | 'marks'
  | 'events'
  | 'totalPTO'
  | 'totalWFA'
  | 'displayZone'
  | 'flightPrefs'
>;

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Sensible defaults for a late-2026 NYC -> Taipei trip window.
const DEFAULTS: PersistedTrip = {
  tripStart: '2026-11-01',
  tripEnd: '2026-12-31',
  marks: {},
  events: [],
  totalPTO: 15,
  totalWFA: 10,
  displayZone: 'America/New_York',
  flightPrefs: { origin: 'JFK', destination: 'TPE' },
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTripRange: (start, end) => set({ tripStart: start, tripEnd: end }),

      setMark: (date, status) =>
        set((s) => ({ marks: { ...s.marks, [date]: status } })),

      setMarks: (dates, status) =>
        set((s) => {
          const marks = { ...s.marks };
          for (const d of dates) marks[d] = status;
          return { marks };
        }),

      clearMarks: (dates) =>
        set((s) => {
          const marks = { ...s.marks };
          for (const d of dates) delete marks[d];
          return { marks };
        }),

      toggleMark: (date, status) =>
        set((s) => {
          const marks = { ...s.marks };
          if (marks[date] === status) delete marks[date];
          else marks[date] = status;
          return { marks };
        }),

      addEvent: (event) =>
        set((s) => ({ events: [...s.events, { ...event, id: genId() }] })),

      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      removeEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      setQuota: (patch) => set(() => ({ ...patch })),

      setZone: (zone) => set({ displayZone: zone }),

      importState: (state) => set({ ...state }),
    }),
    {
      name: 'vacation-planner-v1',
      version: 1,
    },
  ),
);
