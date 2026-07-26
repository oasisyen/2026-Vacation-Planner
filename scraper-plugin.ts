import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCRAPER_DIR = path.join(ROOT, 'scraper');
const SCRIPT = path.join(SCRAPER_DIR, 'fetch_eva_prices.py');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PRICES = path.join(PUBLIC_DIR, 'prices.json');

/** Name of the container image built from scraper/Dockerfile. */
const DOCKER_IMAGE = 'eva-scraper';

interface JobState {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  progress: string | null;
  error: string | null;
}

/** Prefer the scraper venv's python if present, else fall back to python3. */
function pickPython(): string {
  const venv = path.join(SCRAPER_DIR, '.venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
}

/**
 * True if we can run the scraper in Docker: the daemon is up AND the
 * `eva-scraper` image has been built (`docker build -t eva-scraper scraper/`).
 * A single `docker image inspect` covers both — it fails if either is missing.
 */
function dockerReady(): boolean {
  const r = spawnSync('docker', ['image', 'inspect', DOCKER_IMAGE], {
    stdio: 'ignore',
  });
  return r.status === 0;
}

/**
 * Build the command to run one scrape. Prefer the container (keeps Python off
 * the host); fall back to the venv/system Python when Docker isn't ready.
 * Returns the spawn command + args and a short label for the UI.
 */
function buildRunner(start?: string, end?: string): {
  cmd: string;
  args: string[];
  mode: 'docker' | 'local';
} {
  const range: string[] = [];
  if (start) range.push('--start', start);
  if (end) range.push('--end', end);

  if (dockerReady()) {
    // Mount the repo's public/ at /public; the script writes there via --out.
    // Args after the image name are passed straight to the ENTRYPOINT script.
    return {
      cmd: 'docker',
      args: [
        'run',
        '--rm',
        '-v',
        `${PUBLIC_DIR}:/public`,
        DOCKER_IMAGE,
        '--out',
        '/public/prices.json',
        ...range,
      ],
      mode: 'docker',
    };
  }

  return { cmd: pickPython(), args: [SCRIPT, ...range], mode: 'local' };
}

function pricesUpdatedAt(): string | null {
  try {
    const j = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
    return typeof j.updatedAt === 'string' ? j.updatedAt : null;
  } catch {
    return null;
  }
}

async function readBody(req: import('node:http').IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Dev-only endpoint that runs the EVA price scraper on demand so the app has a
 * "Refresh prices" button. Never bundled into the production build (this only
 * runs inside the Vite dev server).
 *
 *   POST /api/refresh-prices  { start, end }  -> starts a scrape (409 if running)
 *   GET  /api/refresh-prices                  -> { running, progress, updatedAt, ... }
 */
export function scraperPlugin(): Plugin {
  const job: JobState = {
    running: false,
    startedAt: null,
    finishedAt: null,
    exitCode: null,
    progress: null,
    error: null,
  };
  let child: ChildProcess | null = null;

  const start = (start?: string, end?: string) => {
    const runner = buildRunner(start, end);

    job.running = true;
    job.startedAt = new Date().toISOString();
    job.finishedAt = null;
    job.exitCode = null;
    job.progress = `starting… (${runner.mode})`;
    job.error = null;

    let errTail = '';
    child = spawn(runner.cmd, runner.args, { cwd: SCRAPER_DIR });

    child.stderr?.on('data', (buf: Buffer) => {
      const text = buf.toString();
      errTail = (errTail + text).slice(-2000);
      // scraper prints "  [OUT 3/60] 2026-11-03: $1250" (also OUT-PE, IN)
      const matches = [...text.matchAll(/\[(OUT-PE|OUT|IN) (\d+)\/(\d+)\]/g)];
      const last = matches.at(-1);
      if (last) job.progress = `${last[1]} ${last[2]}/${last[3]}`;
    });

    child.on('error', (e) => {
      job.error = e.message;
    });

    child.on('close', (code) => {
      job.running = false;
      job.finishedAt = new Date().toISOString();
      job.exitCode = code;
      job.progress = null;
      child = null;
      if (code !== 0 && !job.error) {
        // surface the tail of stderr so the UI can explain the failure
        job.error = errTail.trim().split('\n').slice(-4).join('\n') || `exited ${code}`;
      }
    });
  };

  return {
    name: 'eva-scraper-endpoint',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/refresh-prices', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          res.end(JSON.stringify({ ...job, updatedAt: pricesUpdatedAt() }));
          return;
        }

        if (req.method === 'POST') {
          if (job.running) {
            res.statusCode = 409;
            res.end(JSON.stringify({ started: false, ...job }));
            return;
          }
          const body = await readBody(req);
          start(
            typeof body.start === 'string' ? body.start : undefined,
            typeof body.end === 'string' ? body.end : undefined,
          );
          res.end(JSON.stringify({ started: true, ...job }));
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'method not allowed' }));
      });
    },
  };
}
