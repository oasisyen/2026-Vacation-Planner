import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { scraperPlugin } from './scraper-plugin';
import { plansPlugin } from './plans-plugin';

// Flight prices are read from the static public/prices.json produced by the local
// Python scraper (scraper/fetch_eva_prices.py). The scraperPlugin adds a dev-only
// /api/refresh-prices endpoint so the app's "Refresh prices" button can run it.
// plansPlugin adds a dev-only /api/plans endpoint backing the "Shared options" panel.
export default defineConfig({
  // For a GitHub Pages *project* site the app is served from /<repo>/, so the
  // share build sets VITE_BASE (see the build:share script). Local dev stays at /.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), scraperPlugin(), plansPlugin()],
  build: {
    // The flight panel (and its heavy recharts dep) is lazy-loaded in App.tsx, so
    // it splits into its own async chunk that loads after first paint. That async
    // chunk is legitimately large; keep the warning threshold above it.
    chunkSizeWarningLimit: 700,
  },
});
