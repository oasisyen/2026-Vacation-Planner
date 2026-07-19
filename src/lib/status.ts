import type { DayStatus } from '../store/useTripStore';

export const STATUS_ORDER: DayStatus[] = ['PTO', 'WFA', 'WEEKEND'];

export const STATUS_META: Record<
  DayStatus,
  { label: string; cell: string; chip: string; dot: string }
> = {
  PTO: {
    label: 'PTO',
    cell: 'bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100',
    chip: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
  },
  WFA: {
    label: 'WFA',
    cell: 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100',
    chip: 'bg-sky-500 text-white',
    dot: 'bg-sky-500',
  },
  WEEKEND: {
    label: 'Weekend',
    cell: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-300',
    chip: 'bg-zinc-500 text-white',
    dot: 'bg-zinc-500',
  },
};
