import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// No API proxy needed: flight prices are read from the static public/prices.json
// produced by the local Python scraper (scraper/fetch_eva_prices.py).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
