export interface PriceData {
  updatedAt: string;
  currency: string;
  /** ISO date -> cheapest EVA non-stop price for that departure day */
  outbound: Record<string, number>;
  /** ISO date -> cheapest EVA non-stop price for that return day */
  inbound: Record<string, number>;
  /** How the last successful refresh was run (dev-server scrapes only). */
  scrapedVia?: 'docker' | 'local';
  /** ISO-8601 creation time of the Docker image used, if scrapedVia is 'docker'. */
  dockerImageBuiltAt?: string;
  /** True if that image was already older than the scraper script when it ran. */
  dockerImageStale?: boolean;
}

export interface CheapestPick {
  date: string;
  price: number;
}

/** Load the static prices.json written by the Python scraper. */
export async function loadPrices(): Promise<PriceData | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}prices.json`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PriceData;
  } catch {
    return null;
  }
}

export function cheapest(prices: Record<string, number>): CheapestPick | null {
  let best: CheapestPick | null = null;
  for (const [date, price] of Object.entries(prices)) {
    if (best === null || price < best.price) best = { date, price };
  }
  return best;
}

export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

/** True if prices are missing or older than `maxAgeHours` (default 24h). */
export function isStale(updatedAt?: string, maxAgeHours = 24): boolean {
  if (!updatedAt) return true;
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > maxAgeHours * 3600 * 1000;
}

export interface RefreshStatus {
  running: boolean;
  progress: string | null;
  error: string | null;
  exitCode: number | null;
  updatedAt: string | null;
  mode: 'docker' | 'local' | null;
  imageBuiltAt: string | null;
  imageStale: boolean;
}

/** Ask the dev-server scraper endpoint to (re)scrape for the given window. */
export async function triggerRefresh(
  start: string,
  end: string,
): Promise<{ started: boolean; error?: string }> {
  try {
    const res = await fetch('/api/refresh-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end }),
    });
    if (res.status === 409) return { started: false, error: 'already running' };
    if (!res.ok) {
      return {
        started: false,
        error:
          res.status === 404
            ? 'Refresh only works while running `npm run dev` (dev server).'
            : `server error ${res.status}`,
      };
    }
    const data = await res.json();
    return { started: !!data.started };
  } catch {
    return {
      started: false,
      error: 'Could not reach the dev server. Is `npm run dev` running?',
    };
  }
}

export async function getRefreshStatus(): Promise<RefreshStatus | null> {
  try {
    const res = await fetch('/api/refresh-prices', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as RefreshStatus;
  } catch {
    return null;
  }
}
