# NYC ↔ Taipei Vacation Planner

A single-user web app for planning a NYC → Taiwan trip: mark **PTO / WFA /
weekend** days on a calendar, track your allowances, see the same days in
**New York (EST)** or **Taipei** time, log **confirmed plans** that need time
off, and compare **EVA Air non-stop JFK↔TPE** prices per date to pick the
cheapest flights.

Your data is saved automatically in your browser (localStorage). Export/import a
JSON file to back it up or move it to another device.

## Run the app

```bash
npm install
npm run dev      # open the printed http://localhost:5173
```

Build a static bundle with `npm run build` (output in `dist/`).

## Features

- **Trip window** — set the From/To dates in the header (or use ‹ / › to shift a
  month). The calendar renders every month in that window, so this is how you
  view other months.
- **Calendar view** — click days to select, shift-click for a range, then mark
  PTO / WFA / Weekend. Weekends are excluded from your quotas.
- **List view** — the same days as a date-sorted, quick-editable table.
- **Allowance tracker** — enter your total PTO/WFA; see used/remaining and an
  over-budget warning.
- **Timezone toggle** — EST ↔ Taipei. WFA days show the EST work window in the
  selected zone (e.g. `9a–5p` in NY vs `10p–6a⁺¹` in Taipei — working US hours
  overnight from Taiwan).
- **Confirmed plans** — add events (single day or range). Weekday plan dates not
  yet marked PTO/WFA are flagged with one-click "Mark PTO/WFA" nudges.
- **Flight prices** — EVA non-stop JFK↔TPE prices per date, cheapest in/out dates
  highlighted, price badges on calendar cells, and a round-trip picker showing
  total airfare + how many PTO/WFA days a chosen itinerary consumes.

## Flight prices

The app reads `public/prices.json`. It ships with **sample data** so everything
works immediately. For real EVA prices you can either:

- Click **Refresh prices** in the flight panel (works while `npm run dev` is
  running). It runs the scraper for your current trip window, shows progress,
  and reloads the prices when done. The button is highlighted when data is
  missing, sample, or over a day old.
- Or run the scraper manually — see [`scraper/`](scraper/README.md).

Either way needs **Python 3.10+** with the scraper deps installed (the Refresh
button will show a setup message if they're missing). Prices are cached per date,
not live at booking time — always confirm the fare on EVA's site before buying.

## Tech

Vite + React + TypeScript, Tailwind CSS v4, Zustand (persisted to localStorage),
Luxon (timezones), Recharts (price charts). Flight data via a local Python
scraper (`fli` → Google Flights, EVA-only).
