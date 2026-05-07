// Cloudflare Worker entry point.
//
// Two responsibilities:
//   1. Serve the link-audit API at /api/audit/*. Backed by D1.
//   2. Delegate everything else to the static-asset binding (the SPA).
//
// The wrangler.jsonc `assets.run_worker_first` setting routes /api/*
// to this worker first; all other paths hit the static assets directly,
// so adding the API doesn't add latency to ordinary page loads.
//
// API surface (see audit/links/README.md for the canonical contract):
//   POST /api/audit/runs        — upsert a run. Bearer-token auth.
//   GET  /api/audit/latest      — most-recent run as JSON.
//   GET  /api/audit/runs/:date  — specific run as JSON.
//   GET  /api/audit/history?url=... — per-URL status history (last 30).
//
// Reads are public — the audit data backs the public /sources page,
// there's nothing sensitive about it. Writes require AUDIT_WRITE_TOKEN
// (set as a Workers secret + a GitHub Actions secret of the same name).

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  AUDIT_WRITE_TOKEN: string;
}

interface PostBody {
  run_date: string;
  results: Array<{ status: string; url: string; final_url?: string | null }>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Mirror of src/lib/audit/status.ts BROKEN_STATUS_CODES. Duplicated rather
// than shared because the Worker bundles separately and pulling TS path
// aliases across the boundary adds friction. If the set changes there it
// changes here too.
const BROKEN_STATUS_CODES = new Set(['404', '000', '000ERR', 'ERR']);

// Flap-window size — kept aligned with FLAP_SUPPRESSION_RUNS in
// audit/links/seed-issues.mjs. A URL is "intermittent" when the latest
// run says broken but the window contains at least one non-broken run.
const FLAP_WINDOW_RUNS = 3;

/**
 * Decorate result rows with an `intermittent` boolean. A row is
 * intermittent iff its current status is broken AND, across the last
 * FLAP_WINDOW_RUNS dated runs, the URL has at least one non-broken
 * status. Mirrors the suppression rule in seed-issues.mjs so the
 * /sources page and the rolling broken-citation issue agree on which
 * URLs are still flapping.
 *
 * Fewer than 2 historical rows for a URL = no flap signal (newly cited);
 * intermittent stays false. This matches seed-issues.mjs:304.
 */
async function decorateIntermittent(
  env: Env,
  asOfDate: string,
  results: Array<{ url: string; status: string; final_url: string | null }>,
): Promise<
  Array<{ url: string; status: string; final_url: string | null; intermittent: boolean }>
> {
  const brokenUrls = results.filter((r) => BROKEN_STATUS_CODES.has(r.status)).map((r) => r.url);
  if (brokenUrls.length === 0) {
    return results.map((r) => ({ ...r, intermittent: false }));
  }
  // Pull the last FLAP_WINDOW_RUNS dated runs ending at asOfDate (inclusive),
  // then per-URL statuses across those dates. The (url, run_date DESC) index
  // makes both queries cheap. Using asOfDate rather than "always latest" so
  // /api/audit/runs/:date stays internally consistent for historical runs.
  const window = await env.DB.prepare(
    'SELECT run_date FROM audit_runs WHERE run_date <= ? ORDER BY run_date DESC LIMIT ?',
  )
    .bind(asOfDate, FLAP_WINDOW_RUNS)
    .all<{ run_date: string }>();
  const windowDates = window.results.map((r) => r.run_date);
  if (windowDates.length < 2) {
    return results.map((r) => ({ ...r, intermittent: false }));
  }
  const placeholders = windowDates.map(() => '?').join(',');
  const urlPlaceholders = brokenUrls.map(() => '?').join(',');
  const history = await env.DB.prepare(
    `SELECT url, status FROM audit_results
     WHERE run_date IN (${placeholders}) AND url IN (${urlPlaceholders})`,
  )
    .bind(...windowDates, ...brokenUrls)
    .all<{ url: string; status: string }>();
  const perUrl = new Map<string, string[]>();
  for (const row of history.results) {
    const list = perUrl.get(row.url) ?? [];
    list.push(row.status);
    perUrl.set(row.url, list);
  }
  return results.map((r) => {
    if (!BROKEN_STATUS_CODES.has(r.status)) return { ...r, intermittent: false };
    const statuses = perUrl.get(r.url) ?? [];
    if (statuses.length < 2) return { ...r, intermittent: false };
    const hasNonBroken = statuses.some((s) => !BROKEN_STATUS_CODES.has(s));
    return { ...r, intermittent: hasNonBroken };
  });
}

function json(data: unknown, init: ResponseInit = {}): Response {
  // Build via the Headers constructor so callers passing a Headers
  // instance (a valid HeadersInit) don't get silently dropped by an
  // object spread.
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function requireAuth(req: Request, env: Env): Response | null {
  const auth = req.headers.get('authorization') ?? '';
  const match = auth.match(/^Bearer\s+(.+)$/);
  if (!match || match[1] !== env.AUDIT_WRITE_TOKEN) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

async function postRun(req: Request, env: Env): Promise<Response> {
  const authError = requireAuth(req, env);
  if (authError) return authError;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body || typeof body.run_date !== 'string' || !DATE_RE.test(body.run_date)) {
    return json({ error: 'run_date must be YYYY-MM-DD' }, { status: 400 });
  }
  if (!Array.isArray(body.results)) {
    return json({ error: 'results must be an array' }, { status: 400 });
  }

  const runDate = body.run_date;
  // Validate the entire results array up-front so a malformed row
  // can't quietly truncate the day's data after the DELETE has already
  // wiped it. All-or-nothing: 400 on any bad row, no DB writes.
  for (let i = 0; i < body.results.length; i++) {
    const r = body.results[i];
    if (!r || typeof r.status !== 'string' || typeof r.url !== 'string') {
      return json({ error: `results[${i}] must have string status + url` }, { status: 400 });
    }
  }

  // Idempotent: re-POSTing the same date wipes prior rows for that date
  // and inserts the new payload. created_at on audit_runs stays at the
  // first-seen timestamp (ON CONFLICT DO NOTHING) so the column means
  // what its name says.
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM audit_results WHERE run_date = ?').bind(runDate),
    env.DB.prepare(
      'INSERT INTO audit_runs (run_date) VALUES (?) ON CONFLICT(run_date) DO NOTHING',
    ).bind(runDate),
  ];
  const insert = env.DB.prepare(
    'INSERT INTO audit_results (run_date, url, status, final_url) VALUES (?, ?, ?, ?)',
  );
  for (const r of body.results) {
    stmts.push(insert.bind(runDate, r.url, r.status, r.final_url ?? null));
  }
  await env.DB.batch(stmts);

  return json({ ok: true, run_date: runDate, inserted: body.results.length });
}

async function getLatest(env: Env): Promise<Response> {
  const run = await env.DB.prepare(
    'SELECT run_date, created_at FROM audit_runs ORDER BY run_date DESC LIMIT 1',
  ).first<{ run_date: string; created_at: number }>();
  if (!run) return json({ error: 'no runs' }, { status: 404 });
  const rows = await env.DB.prepare(
    'SELECT url, status, final_url FROM audit_results WHERE run_date = ? ORDER BY url',
  )
    .bind(run.run_date)
    .all<{ url: string; status: string; final_url: string | null }>();
  const decorated = await decorateIntermittent(env, run.run_date, rows.results);
  return json({ run_date: run.run_date, created_at: run.created_at, results: decorated });
}

async function getRun(date: string, env: Env): Promise<Response> {
  if (!DATE_RE.test(date)) return json({ error: 'invalid date' }, { status: 400 });
  const run = await env.DB.prepare('SELECT run_date, created_at FROM audit_runs WHERE run_date = ?')
    .bind(date)
    .first<{ run_date: string; created_at: number }>();
  if (!run) return json({ error: 'not found' }, { status: 404 });
  const rows = await env.DB.prepare(
    'SELECT url, status, final_url FROM audit_results WHERE run_date = ? ORDER BY url',
  )
    .bind(date)
    .all<{ url: string; status: string; final_url: string | null }>();
  const decorated = await decorateIntermittent(env, run.run_date, rows.results);
  return json({ run_date: run.run_date, created_at: run.created_at, results: decorated });
}

async function getHistory(url: string, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT run_date, status, final_url FROM audit_results WHERE url = ? ORDER BY run_date DESC LIMIT 30',
  )
    .bind(url)
    .all<{ run_date: string; status: string; final_url: string | null }>();
  return json({ url, history: rows.results });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/audit/')) {
      if (request.method === 'POST' && path === '/api/audit/runs') {
        return postRun(request, env);
      }
      if (request.method === 'GET' && path === '/api/audit/latest') {
        return getLatest(env);
      }
      const runMatch = path.match(/^\/api\/audit\/runs\/(.+)$/);
      if (request.method === 'GET' && runMatch) {
        return getRun(runMatch[1], env);
      }
      if (request.method === 'GET' && path === '/api/audit/history') {
        const u = url.searchParams.get('url');
        if (!u) return json({ error: 'url query param required' }, { status: 400 });
        return getHistory(u, env);
      }
      return json({ error: 'not found' }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
