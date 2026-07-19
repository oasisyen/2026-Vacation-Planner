export interface PriceData {
  updatedAt: string;
  currency: string;
  /** ISO date -> cheapest EVA non-stop price for that departure day */
  outbound: Record<string, number>;
  /** ISO date -> cheapest EVA non-stop price for that return day */
  inbound: Record<string, number>;
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
