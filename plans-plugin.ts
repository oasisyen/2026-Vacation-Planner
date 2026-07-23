import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PLANS = path.join(PUBLIC_DIR, 'plans.json');

const EMPTY = { schema: 1, generatedAt: '', options: [] };

function readPlans(): unknown {
  try {
    return JSON.parse(fs.readFileSync(PLANS, 'utf8'));
  } catch {
    return EMPTY;
  }
}

async function readBody(
  req: import('node:http').IncomingMessage,
): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

/**
 * Dev-only endpoint backing the "Shared options" panel. It reads and writes the
 * committed public/plans.json — the same file the published read-only site
 * loads. Never bundled into the production build (only runs in the Vite dev
 * server), so the published site can never mutate anyone's plans.
 *
 *   GET /api/plans          -> the current plans.json (or an empty doc)
 *   PUT /api/plans  <body>  -> overwrite plans.json with the posted document
 */
export function plansPlugin(): Plugin {
  return {
    name: 'shared-plans-endpoint',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/plans', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          res.end(JSON.stringify(readPlans()));
          return;
        }

        if (req.method === 'PUT' || req.method === 'POST') {
          const body = await readBody(req);
          if (!body || !Array.isArray(body.options)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'invalid plans document' }));
            return;
          }
          try {
            fs.mkdirSync(PUBLIC_DIR, { recursive: true });
            fs.writeFileSync(PLANS, JSON.stringify(body, null, 2) + '\n');
            res.end(JSON.stringify({ ok: true, count: body.options.length }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
          }
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'method not allowed' }));
      });
    },
  };
}
