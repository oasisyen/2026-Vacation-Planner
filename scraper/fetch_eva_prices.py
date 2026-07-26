#!/usr/bin/env python3
"""Fetch EVA Air (BR) non-stop JFK<->TPE prices per date into public/prices.json.

This scrapes Google Flights via the `fli` library, keeping only EVA Air non-stop
fares, and writes the cheapest price per departure date for both directions.

Requirements: Python 3.10+ and `fli` (see requirements.txt). The web app reads the
resulting public/prices.json — it never talks to Google directly.

Usage:
    python fetch_eva_prices.py                      # defaults below
    python fetch_eva_prices.py --start 2026-11-01 --end 2026-12-31
    python fetch_eva_prices.py --out-end 2026-11-30 --in-start 2026-12-01

Be gentle: this paces its requests. It's for personal, low-volume price-watching.
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

# Where the app reads prices from: <repo>/public/prices.json
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "public" / "prices.json"

# Trip window + route defaults (late-2026 NYC -> Taipei).
DEFAULT_START = "2026-11-01"
DEFAULT_END = "2026-12-31"
ORIGIN = "JFK"
DEST = "TPE"
EVA_IATA = "BR"


def eprint(*a: object) -> None:
    print(*a, file=sys.stderr)


def _require_fli():
    """Import fli, giving a friendly error if it's missing or Python is too old."""
    if sys.version_info < (3, 10):
        eprint(
            f"fli requires Python 3.10+, but this is {sys.version.split()[0]}.\n"
            "Install a newer Python (e.g. `brew install python@3.12`) and run:\n"
            "    python3.12 -m venv .venv && source .venv/bin/activate\n"
            "    pip install -r requirements.txt"
        )
        sys.exit(1)
    try:
        from fli.models import (  # noqa: F401
            Airport,
            FlightSearchFilters,
            FlightSegment,
            MaxStops,
            PassengerInfo,
            SeatType,
            SortBy,
        )
        from fli.search import SearchFlights  # noqa: F401
    except ImportError:
        eprint(
            "Could not import `fli`. Install dependencies first:\n"
            "    pip install -r requirements.txt\n"
            "If fli's Google Flights scraping breaks, see README.md for the "
            "fast-flights fallback."
        )
        sys.exit(1)
    return sys.modules["fli.models"], sys.modules["fli.search"]


def daterange(start: str, end: str):
    d = datetime.strptime(start, "%Y-%m-%d").date()
    last = datetime.strptime(end, "%Y-%m-%d").date()
    while d <= last:
        yield d.isoformat()
        d += timedelta(days=1)


def _is_eva(leg) -> bool:
    """True if a flight leg is operated by EVA Air (BR), tolerant of enum shape."""
    airline = getattr(leg, "airline", None)
    if airline is None:
        return False
    name = str(getattr(airline, "name", "")).upper()
    value = str(getattr(airline, "value", "")).upper()
    return "EVA" in name or "EVA" in value or name == EVA_IATA or value == EVA_IATA


def cheapest_eva_nonstop(models, search_mod, origin: str, dest: str, day: str, seat_type):
    """Cheapest EVA non-stop fare for one date, or None if EVA doesn't fly / no data."""
    filters = models.FlightSearchFilters(
        passenger_info=models.PassengerInfo(adults=1),
        flight_segments=[
            models.FlightSegment(
                departure_airport=[[getattr(models.Airport, origin), 0]],
                arrival_airport=[[getattr(models.Airport, dest), 0]],
                travel_date=day,
            )
        ],
        seat_type=seat_type,
        stops=models.MaxStops.NON_STOP,
        sort_by=models.SortBy.CHEAPEST,
    )
    flights = search_mod.SearchFlights().search(filters) or []
    prices = [
        float(f.price)
        for f in flights
        if getattr(f, "legs", None) and all(_is_eva(leg) for leg in f.legs)
    ]
    return round(min(prices)) if prices else None


def scrape_leg(models, search_mod, origin, dest, start, end, label, pace, seat_type):
    out: dict[str, float] = {}
    dates = list(daterange(start, end))
    for i, day in enumerate(dates, 1):
        try:
            price = cheapest_eva_nonstop(models, search_mod, origin, dest, day, seat_type)
        except Exception as exc:  # keep going; one bad date shouldn't kill the run
            eprint(f"  ! {label} {day}: {type(exc).__name__}: {exc}")
            price = None
        if price is not None:
            out[day] = price
        eprint(
            f"  [{label} {i}/{len(dates)}] {day}: "
            + (f"${price}" if price is not None else "no EVA non-stop")
        )
        if i < len(dates):
            time.sleep(pace + random.uniform(0, pace))  # gentle jitter
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", default=DEFAULT_START, help="trip window start (YYYY-MM-DD)")
    p.add_argument("--end", default=DEFAULT_END, help="trip window end (YYYY-MM-DD)")
    p.add_argument("--out-start", help="outbound JFK->TPE range start (default: --start)")
    p.add_argument("--out-end", help="outbound JFK->TPE range end (default: --end)")
    p.add_argument("--in-start", help="inbound TPE->JFK range start (default: --start)")
    p.add_argument("--in-end", help="inbound TPE->JFK range end (default: --end)")
    p.add_argument("--pace", type=float, default=2.5, help="base seconds between requests")
    p.add_argument("--out", default=str(DEFAULT_OUT), help="output prices.json path")
    args = p.parse_args()

    models, search_mod = _require_fli()

    out_start = args.out_start or args.start
    out_end = args.out_end or args.end
    in_start = args.in_start or args.start
    in_end = args.in_end or args.end

    eprint(f"Scraping EVA (BR) non-stop {ORIGIN}->{DEST} economy {out_start}..{out_end}")
    outbound = scrape_leg(
        models, search_mod, ORIGIN, DEST, out_start, out_end, "OUT", args.pace,
        models.SeatType.ECONOMY,
    )
    eprint(f"Scraping EVA (BR) non-stop {ORIGIN}->{DEST} premium economy {out_start}..{out_end}")
    outbound_premium = scrape_leg(
        models, search_mod, ORIGIN, DEST, out_start, out_end, "OUT-PE", args.pace,
        models.SeatType.PREMIUM_ECONOMY,
    )
    eprint(f"Scraping EVA (BR) non-stop {DEST}->{ORIGIN} economy {in_start}..{in_end}")
    inbound = scrape_leg(
        models, search_mod, DEST, ORIGIN, in_start, in_end, "IN", args.pace,
        models.SeatType.ECONOMY,
    )

    payload = {
        "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "currency": "USD",
        "outbound": outbound,
        "outboundPremium": outbound_premium,
        "inbound": inbound,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    eprint(
        f"\nWrote {out_path} — {len(outbound)} outbound + {len(outbound_premium)} "
        f"outbound-premium + {len(inbound)} inbound dates."
    )
    if not outbound and not outbound_premium and not inbound:
        eprint(
            "No prices found. Google Flights may have changed, or EVA has no "
            "non-stop on these dates. See README.md for the fast-flights fallback."
        )
        sys.exit(2)


if __name__ == "__main__":
    main()
