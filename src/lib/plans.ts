import type { PersistedTrip } from '../store/useTripStore';
import type { PriceData } from './flights';

/** A chosen round-trip itinerary captured with a saved option. */
export interface ChosenFlight {
  depart: string | null;
  departPrice: number | null;
  return: string | null;
  returnPrice: number | null;
  currency: string;
}

/**
 * A frozen version of a plan the user wants to share for a decision. Bundles the
 * full editable plan (so it can be loaded back into the editor), the chosen
 * flight, and a snapshot of the fares at save time so the published read-only
 * site is self-contained (no scraper needed on the family's end).
 */
export interface SharedOption {
  id: string;
  label: string;
  note?: string;
  savedAt: string;
  plan: PersistedTrip;
  flight: ChosenFlight | null;
  pricesSnapshot: PriceData | null;
}

/** The committed public/plans.json document, published with the static site. */
export interface PlansFile {
  schema: 1;
  generatedAt: string;
  options: SharedOption[];
}

export const EMPTY_PLANS: PlansFile = {
  schema: 1,
  generatedAt: '',
  options: [],
};

/** Load the static plans.json bundled with the site. */
export async function loadPlans(): Promise<PlansFile> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}plans.json`, {
      cache: 'no-store',
    });
    if (!res.ok) return { ...EMPTY_PLANS };
    const data = (await res.json()) as PlansFile;
    if (!Array.isArray(data.options)) return { ...EMPTY_PLANS };
    return data;
  } catch {
    return { ...EMPTY_PLANS };
  }
}

/**
 * Persist the whole plans document to disk via the dev-only endpoint. Only works
 * while `npm run dev` is running (the endpoint is not part of the static build).
 */
export async function savePlans(
  file: PlansFile,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...file, generatedAt: new Date().toISOString() }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error:
          res.status === 404
            ? 'Saving options only works while running `npm run dev`.'
            : `server error ${res.status}`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Could not reach the dev server. Is `npm run dev` running?',
    };
  }
}
