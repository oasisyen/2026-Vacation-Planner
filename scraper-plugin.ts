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
  mode: 'docker' | 'local' | null;
  imageBuiltAt: string | null;
  imageStale: boolean;
}

/** Prefer the scraper venv's python if present, else fall back to python3. */
function pickPython(): string {
  const venv = path.join(SCRAPER_DIR, '.venv', 'bin', 'python');
  return fs.existsSync(venv) ? venv : 'python3';
}

/**
 * ISO-8601 creation timestamp of the `eva-scraper` image, or null if the
 * daemon is down or the image hasn't been built
 * (`docker build -t eva-scraper scraper/`).
 */
function dockerImageBuiltAt(): string | null {
  const r = spawnSync(
    'docker',
    ['image', 'inspect', DOCKER_IMAGE, '--format', '{{.Created}}'],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/**
 * True if the scraper script or its Docker build inputs were edited after the
 * image was built — i.e. `docker run` would execute stale code. This is a
 * real trap: the image only gets rebuilt when someone remembers to run
 * `docker build`, so an edit to fetch_eva_prices.py silently keeps being
 * ignored by every refresh until then.
 */
function isImageStale(builtAt: string): boolean {
  const builtMs = Date.parse(builtAt);
  if (Number.isNaN(builtMs)) return false;
  const inputs = [
    SCRIPT,
    path.join(SCRAPER_DIR, 'Dockerfile'),
    path.join(SCRAPER_DIR, 'requirements.txt'),
  ];
  return inputs.some((f) => {
    try {
      return fs.statSync(f).mtimeMs > builtMs;
    } catch {
      return false;
    }
  });
}

/**
 * Build the command to run one scrape. Prefer the container (keeps Python off
 * the host); fall back to the venv/system Python when Docker isn't ready.
 * Returns the spawn command + args and staleness info for the UI.
 */
function buildRunner(start?: string, end?: string): {
  cmd: string;
  args: string[];
  mode: 'docker' | 'local';
  imageBuiltAt: string | null;
  imageStale: boolean;
} {
  const range: string[] = [];
  if (start) range.push('--start', start);
  if (end) range.push('--end', end);

  const imageBuiltAt = dockerImageBuiltAt();
  if (imageBuiltAt) {
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
      imageBuiltAt,
      imageStale: isImageStale(imageBuiltAt),
    };
  }

  return {
    cmd: pickPython(),
    args: [SCRIPT, ...range],
    mode: 'local',
    imageBuiltAt: null,
    imageStale: false,
  };
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
    mode: null,
    imageBuiltAt: null,
    imageStale: false,
  };
  let child: ChildProcess | null = null;

  /** `docker build -t eva-scraper scraper/`, async so it doesn't block the dev server. */
  const rebuildDockerImage = (onDone: (ok: boolean, log: string) => void) => {
    let log = '';
    const build = spawn('docker', ['build', '-t', DOCKER_IMAGE, SCRAPER_DIR]);
    build.stdout?.on('data', (buf: Buffer) => (log = (log + buf.toString()).slice(-2000)));
    build.stderr?.on('data', (buf: Buffer) => (log = (log + buf.toString()).slice(-2000)));
    build.on('error', (e) => onDone(false, e.message));
    build.on('close', (code) => onDone(code === 0, log));
  };

  const runScrape = (runner: ReturnType<typeof buildRunner>) => {
    job.progress = `starting… (${runner.mode})`;

    let errTail = '';
    child = spawn(runner.cmd, runner.args, { cwd: SCRAPER_DIR });

    child.stderr?.on('data', (buf: Buffer) => {
      const text = buf.toString();
      errTail = (errTail + text).slice(-2000);
      // scraper prints "  [OUT 3/60] 2026-11-03: $1250"
      const matches = [...text.matchAll(/\[(OUT|IN) (\d+)\/(\d+)\]/g)];
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
      } else if (code === 0) {
        // Stamp provenance onto the written file so staleness survives a page
        // reload — not just this in-memory job, which resets on server restart.
        try {
          const written = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
          written.scrapedVia = runner.mode;
          if (runner.mode === 'docker') {
            written.dockerImageBuiltAt = runner.imageBuiltAt;
            written.dockerImageStale = runner.imageStale;
          } else {
            delete written.dockerImageBuiltAt;
            delete written.dockerImageStale;
          }
          fs.writeFileSync(PRICES, JSON.stringify(written, null, 2) + '\n');
        } catch {
          // best-effort; the scrape results are already on disk either way
        }
      }
    });
  };

  const start = (rangeStart?: string, rangeEnd?: string) => {
    const runner = buildRunner(rangeStart, rangeEnd);

    job.running = true;
    job.startedAt = new Date().toISOString();
    job.finishedAt = null;
    job.exitCode = null;
    job.error = null;
    job.mode = runner.mode;
    job.imageBuiltAt = runner.imageBuiltAt;
    job.imageStale = runner.imageStale;

    if (runner.mode === 'docker' && runner.imageStale) {
      job.progress = 'image outdated — rebuilding docker image…';
      rebuildDockerImage((ok, log) => {
        if (!ok) {
          job.running = false;
          job.finishedAt = new Date().toISOString();
          job.progress = null;
          job.error =
            'Docker image rebuild failed:\n' +
            (log.trim().split('\n').slice(-6).join('\n') || 'unknown error');
          return;
        }
        // A successful `docker build` means the image now matches the script
        // on disk by definition — even if Docker hit cache (e.g. the file's
        // mtime changed but its content didn't) and left `Created` unchanged,
        // so re-deriving staleness from that timestamp here would be wrong.
        runner.imageBuiltAt = dockerImageBuiltAt();
        runner.imageStale = false;
        job.imageBuiltAt = runner.imageBuiltAt;
        job.imageStale = false;
        runScrape(runner);
      });
      return;
    }

    runScrape(runner);
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
