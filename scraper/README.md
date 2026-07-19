# EVA price scraper

Fetches **EVA Air (BR) non-stop JFK ↔ TPE** prices per date from Google Flights
and writes them to `../public/prices.json`, which the web app reads. The app
never talks to Google directly — it only reads that JSON file.

## Why a scraper (and not an API)?

You can only fly EVA non-stop, and no free flight API lets you filter a
single-airline, single-route fare per date. Google Flights does, so we scrape it
with the [`fli`](https://github.com/punitarani/fli) library, keeping only EVA
non-stop results.

## Setup

Pick **one** of these. The app's **Refresh prices** button auto-detects which you
have: it uses Docker if the `eva-scraper` image is built, otherwise the venv.

### Option A — Docker (no Python on your system)

```bash
cd scraper
docker build -t eva-scraper .
```

That's it — the button now runs the scraper in a container. To run it by hand,
mount the repo's `public/` so the JSON lands in the real tree:

```bash
docker run --rm -v "$(pwd)/../public:/public" \
  eva-scraper --out /public/prices.json --start 2026-11-01 --end 2026-12-31
```

### Option B — local Python (needs Python 3.10+)

```bash
cd scraper
python3.12 -m venv .venv        # any Python >= 3.10
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

Easiest: click **Refresh prices** in the app while `npm run dev` is running — it
calls this scraper for your current trip window automatically. To run it by hand:

```bash
# Whole default trip window (Nov 1 – Dec 31, 2026), both directions:
python fetch_eva_prices.py

# Any date range you want — there is NO fixed limit; the range is fully
# controlled by these args (the app passes your trip window when you click
# Refresh). Narrow them to make fewer requests (gentler, faster):
python fetch_eva_prices.py --start 2026-10-01 --end 2027-01-31
python fetch_eva_prices.py --out-start 2026-11-14 --out-end 2026-11-24 \
                           --in-start 2026-12-01 --in-end 2026-12-14
```

It paces requests (a few seconds apart) — a full window takes a little while.
When it finishes, reload the web app (or the Refresh button reloads for you); the
flight panel shows the new prices and an "updated …" timestamp instead of
"sample data".

Useful flags: `--start/--end` (whole window, default Nov 1 – Dec 31 2026),
`--out-start/--out-end` and `--in-start/--in-end` (per-direction ranges),
`--pace` (seconds between requests), `--out` (output path). The Nov 14 – Dec 14
you may have seen was only the committed sample data — not a scraper limit.

## Refresh on a schedule (optional)

Add a cron line to re-scrape, e.g. every day at 8am (adjust the paths):

```cron
0 8 * * * cd "/path/to/2026-Vacation-Planner/scraper" && ./.venv/bin/python fetch_eva_prices.py >> scrape.log 2>&1
```

## If it breaks

Google changes its page from time to time, which can break `fli`. Options:

1. Update fli: `pip install -U fli`.
2. Fall back to [`fast-flights`](https://github.com/AWeirdDev/flights)
   (`pip install fast-flights`) — same idea (filter to EVA `BR`, non-stop), a
   different scraping engine. Swap the `fli` calls in `fetch_eva_prices.py` for
   fast-flights' `get_flights(...)` and keep the same JSON output shape.

Meanwhile the app keeps showing the last `prices.json` it has, with its
`updatedAt` timestamp so you know how stale it is. The committed
`public/prices.json` starts as clearly-labelled **sample data**.

## Output shape

```json
{
  "updatedAt": "2026-07-19T12:00:00Z",
  "currency": "USD",
  "outbound": { "2026-11-18": 1165 },
  "inbound":  { "2026-12-09": 1060 }
}
```
