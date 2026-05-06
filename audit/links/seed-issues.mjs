#!/usr/bin/env node
// Maintain a single rolling GitHub issue for broken-citation triage.
//
// Reads the most recent run from the D1-backed audit API
// (/api/audit/latest), finds entries that curl couldn't reach (404,
// network errors, anti-bot 999), and renders the list as a single
// grouped checklist on a rolling `audit:link` issue. Flap suppression
// fetches per-URL history via /api/audit/history?url=...
//
// State machine, mirroring the staleness audit:
//
//   0 broken + open issue       → close it with a "queue clear" comment
//   0 broken + no open issue    → no-op
//   >0 broken + no open issue   → create + pin
//   >0 broken + open issue      → edit title + body in place + pin
//
// The rolling-issue model collapses 40+ individual broken-URL issues into
// one inbox-friendly digest. The `reviewed.tsv` row + sources.ts edit
// pattern (the unified resolution log) means each fix's PR doesn't need
// `Closes #N` — the next audit run sees the URL is no longer broken and
// drops it from the issue body automatically.
//
// Status codes:
//   404           - page is gone
//   000 / ERR     - DNS/TLS/timeout — likely dead domain or transient outage
//   999           - LinkedIn-style anti-bot — surface because if curl can't
//                   reach it, privacy-conscious users likely can't either
//
// Statuses we DON'T flag:
//   200 / 3xx     - it loaded; review state tracked in reviewed.tsv
//   403           - bot-blocked; almost always fine in a real browser
//
// Per-source suppression via reviewed.tsv:
//   Some bot-blocked URLs (typically 999) genuinely work in a real
//   browser. Adding a row to reviewed.tsv with kind = `verified-bot-blocked`
//   suppresses that source from the broken-citation issue for
//   VERIFIED_BOT_BLOCKED_TTL_DAYS (30) — deliberately tighter than the
//   staleness cadence because bot-blocked URLs lose nightly automated
//   reachability checks, so the human "this loads" check is the only
//   liveness signal and needs to happen more often. Lighter than a
//   full `human` review (just confirms the URL loads, not that the
//   destination still cites the claim) and does NOT reset the
//   staleness clock — see audit/staleness/seed-issue.mjs.
//
// Flap suppression across runs:
//   A URL must be in an actionable status in EVERY one of the last
//   FLAP_SUPPRESSION_RUNS dated runs to escalate into the queue. A
//   single non-actionable status in that window (a 200/3xx that snuck
//   through) is treated as evidence of flap and the URL is held back
//   for another night. The intent is to absorb anti-bot rule rollouts
//   and short state-network outages without spamming the queue, while
//   still flagging genuinely-broken pages within ~3 days. URLs that
//   only appear in some of the last N runs (newly-cited URLs) escalate
//   based on the runs they appear in — a config typo gets surfaced on
//   day one, not held back for 3 days.
//
// Usage:
//   node audit/links/seed-issues.mjs               # update the rolling issue
//   node audit/links/seed-issues.mjs --dry-run     # print what would happen
//
// Env:
//   AUDIT_API_BASE   API origin to fetch from (default https://thebudgetatlas.com).
//                    Set to http://localhost:8787 when iterating against a
//                    local Worker.
//
// Auth:
//   Requires the gh CLI authenticated. In GitHub Actions, GITHUB_TOKEN is
//   sufficient (set permissions: { issues: write } on the workflow).
//   API reads are public — no token needed.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SOURCES_TS = resolve(ROOT, 'src/data/sources.ts');
const REPO = 'TheBudgetAtlas/thebudgetatlas';
const LABEL = 'audit:link';
const API_BASE = process.env.AUDIT_API_BASE ?? 'https://thebudgetatlas.com';

// '000ERR' is the actual single merged code that check.sh writes for
// DNS/TLS/timeout failures (despite the code list above splitting them
// for documentation). Keep both spellings to be safe; UI side uses the
// merged spelling too — see src/lib/sourceStatus.tsx BROKEN_STATUS_CODES.
const ACTIONABLE = new Set(['404', '000', '000ERR', 'ERR', '999']);

const DRY_RUN = process.argv.includes('--dry-run');

function sh(args, opts = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
}

// ── 1. Fetch the latest run from the audit API ───────────────────────────
console.log(`→ Fetching ${API_BASE}/api/audit/latest`);
const latestRes = await fetch(`${API_BASE}/api/audit/latest`);
if (!latestRes.ok) {
  console.error(`/api/audit/latest: HTTP ${latestRes.status} ${latestRes.statusText}`);
  process.exit(1);
}
const latestRun = await latestRes.json();
const rows = latestRun.results ?? [];
const latestDate = latestRun.run_date;

// ── 2. Filter broken rows ────────────────────────────────────────────────
const broken = rows.filter((r) => ACTIONABLE.has(r.status));
console.log(`→ Run ${latestDate}: ${broken.length} broken / ${rows.length} total URLs.`);

// ── 3. Look up registry metadata for each URL (label, file:line) ─────────
//
// Parse sources.ts once to build URL → { label, line } so the rolling
// issue can show meaningful labels and citation locations without 40+
// shell-out grep calls.
function buildSourcesIndex() {
  const text = readFileSync(SOURCES_TS, 'utf8');
  const lines = text.split('\n');
  const index = new Map();
  let pendingLabel = null;
  let labelOnNextLine = false;
  let pendingId = null;
  // When we're inside a per-state agency map (RAW_STATE_DOR /
  // RAW_STATE_SNAP_AGENCY / etc.), the actual source id is synthesized
  // by withStateIds() as `state-${kind}-${code.toLowerCase()}` instead
  // of the raw outer key (which is just the state code, e.g. 'DE').
  // Track which kind we're inside so the lookup id matches what the
  // /sources page and reviewed.tsv use.
  let stateMapKind = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect entry into a per-state raw map.
    const stateDecl = line.match(/^const RAW_STATE_(?:(\w+)_AGENCY|DOR)\s*[:=]/);
    if (stateDecl) {
      stateMapKind = stateDecl[1] ? stateDecl[1].toLowerCase() : 'dor';
    } else if (stateMapKind && line === '};') {
      // Top-level closing of the raw map ends the state-keyed mode.
      stateMapKind = null;
    }

    // Track the most recent outer key (id) — entries look like
    //   'kff-employer-health-benefits': {
    // Used for reviewed.tsv suppression lookup.
    const idMatch = line.match(/^['"]?([a-zA-Z][a-zA-Z0-9-]*)['"]?:\s*\{$/);
    if (idMatch) {
      pendingId = stateMapKind ? `state-${stateMapKind}-${idMatch[1].toLowerCase()}` : idMatch[1];
      pendingLabel = null;
    }

    if (labelOnNextLine) {
      const m = line.match(/^['"`]([^'"`]+)['"`]/);
      if (m) {
        pendingLabel = m[1];
        labelOnNextLine = false;
        continue;
      }
    }

    let m = line.match(/^label:\s*['"`]([^'"`]+)['"`]/);
    if (m) {
      pendingLabel = m[1];
      continue;
    }
    if (/^label:\s*$/.test(line)) {
      labelOnNextLine = true;
      continue;
    }
    m = line.match(/label:\s*['"`]([^'"`]+)['"`]/);
    if (m) pendingLabel = m[1];

    const urlMatch = line.match(/url:\s*['"`]([^'"`]+)['"`]/);
    if (urlMatch) {
      const url = urlMatch[1];
      if (!index.has(url)) {
        index.set(url, { label: pendingLabel ?? url, line: i + 1, id: pendingId });
      }
    }
  }
  return index;
}

const sourcesIndex = buildSourcesIndex();

// ── 3.5. Apply reviewed.tsv suppression for verified-bot-blocked URLs ────
//
// A row in reviewed.tsv with kind=`verified-bot-blocked` declares that a
// human checked the URL in a real browser and confirmed it works despite
// curl's bot-blocked status. Suppress those entries from the broken-
// citation queue for VERIFIED_BOT_BLOCKED_TTL_DAYS so the manual
// verification work isn't redundantly re-done every audit run. After the
// TTL elapses we re-flag — verifications get stale.
const REVIEWED_TSV = resolve(__dirname, 'reviewed.tsv');
// 30 days — deliberately tighter than the staleness cadence (90/180/365
// per tier). Bot-blocked URLs lose nightly automated reachability checks,
// so a human "this loads" verification is the only signal the URL is
// still alive. Compensate for the lost automation with a more frequent
// human re-verification rhythm.
const VERIFIED_BOT_BLOCKED_TTL_DAYS = 30;

function parseReviewedTsv() {
  const text = readFileSync(REVIEWED_TSV, 'utf8');
  // id → most-recent { date, kind } (later rows shadow earlier ones).
  const latest = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [id, date, , kind] = line.split('\t');
    if (!id || !date || !kind) continue;
    const prev = latest.get(id);
    if (!prev || date > prev.date) latest.set(id, { date, kind });
  }
  return latest;
}

function isVerifiedBotBlocked(url, reviews, today) {
  const meta = sourcesIndex.get(url);
  if (!meta?.id) return false;
  const r = reviews.get(meta.id);
  if (!r || r.kind !== 'verified-bot-blocked') return false;
  // Keep suppression only while the verification is still fresh.
  const ageMs = today.getTime() - new Date(r.date).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= VERIFIED_BOT_BLOCKED_TTL_DAYS;
}

const reviews = parseReviewedTsv();
const today = new Date();
let verifiedBotBlockedCount = 0;
let filteredBroken = broken.filter((r) => {
  if (isVerifiedBotBlocked(r.url, reviews, today)) {
    verifiedBotBlockedCount++;
    return false;
  }
  return true;
});
if (verifiedBotBlockedCount > 0) {
  console.log(
    `→ Suppressing ${verifiedBotBlockedCount} verified-bot-blocked URL(s) per reviewed.tsv (TTL ${VERIFIED_BOT_BLOCKED_TTL_DAYS}d).`,
  );
}

// ── 3.6. Flap suppression across recent runs ─────────────────────────────
//
// Require a URL to be in an actionable status in EVERY one of the last N
// runs (current included) before escalating it to the queue. One
// non-actionable status in that window is treated as flap and the URL is
// held back for another night. URLs that appear in fewer than N runs
// (newly-cited URLs) escalate based on the runs they DO appear in.
//
// Fetched per-URL via /api/audit/history?url=... — small N of broken
// URLs per night (~5–30), so the per-URL round trips are cheap. The
// alternative of pulling the last N full runs in one bulk call would
// mean fetching ~600 rows to read ~30 statuses; per-URL is leaner.
//
// Failures (network error, non-2xx, malformed JSON) degrade to "no
// history" rather than aborting the whole issue refresh. Without flap
// data the URL escalates immediately, which is the same behaviour you
// got before flap suppression existed — strictly safer than failing
// to seed the queue at all on a transient API blip.
const FLAP_SUPPRESSION_RUNS = 3;
const HISTORY_FETCH_CONCURRENCY = 5;

async function fetchHistory(url) {
  try {
    const res = await fetch(`${API_BASE}/api/audit/history?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      console.warn(`  history fetch for ${url}: HTTP ${res.status}; treating as no history`);
      return [];
    }
    const body = await res.json();
    return body.history ?? [];
  } catch (err) {
    console.warn(`  history fetch for ${url} threw (${err.message}); treating as no history`);
    return [];
  }
}

// Bounded concurrency so a queue with 50+ broken URLs (an outage / WAF
// rule rollout) doesn't spike the Worker or hit subrequest limits in
// the GitHub Actions runner. CF Workers comfortably handle far more
// than 5 concurrent reads, but the limit also protects against
// upstream rate-limiting on bad days.
async function mapWithLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

let flapSuppressedCount = 0;
const flapChecked = await mapWithLimit(filteredBroken, HISTORY_FETCH_CONCURRENCY, async (r) => {
  const history = await fetchHistory(r.url);
  // history is ordered DESC by run_date and capped at 30 rows by the
  // API — slice to the suppression window. If we have fewer than 2
  // runs of history there's nothing to compare against; fall back to
  // escalating (current behaviour).
  const window = history.slice(0, FLAP_SUPPRESSION_RUNS);
  if (window.length < 2) return { row: r, suppress: false, runs: window.length };
  const allActionable = window.every((h) => ACTIONABLE.has(h.status));
  return { row: r, suppress: !allActionable, runs: window.length };
});

const flapWindow = flapChecked.length ? Math.max(...flapChecked.map((c) => c.runs)) : 0;
filteredBroken = flapChecked
  .filter((c) => {
    if (c.suppress) {
      flapSuppressedCount++;
      return false;
    }
    return true;
  })
  .map((c) => c.row);

if (flapSuppressedCount > 0) {
  console.log(
    `→ Suppressing ${flapSuppressedCount} flapping URL(s) (not actionable in all of last ${flapWindow} run(s)).`,
  );
}

// ── 4. Build the issue body ──────────────────────────────────────────────
function buildTitle(broken) {
  const counts = { 404: 0, errors: 0, anti: 0 };
  for (const r of broken) {
    if (r.status === '404') counts['404']++;
    else if (r.status === '000' || r.status === '000ERR' || r.status === 'ERR') counts.errors++;
    else if (r.status === '999') counts.anti++;
  }
  const parts = [];
  if (counts['404']) parts.push(`${counts['404']} hard 404`);
  if (counts.errors) parts.push(`${counts.errors} errors`);
  if (counts.anti) parts.push(`${counts.anti} anti-bot`);
  const breakdown = parts.length ? ` (${parts.join(', ')})` : '';
  return `Broken citation queue: ${broken.length} broken${breakdown}`;
}

// Extract URLs that were checked (`[x]`) in the existing body, so claim-
// state ("I'm working on this") survives regenerates. The body rewrites
// each run; without this, every claim resets.
function extractCheckedUrls(existingBody) {
  if (!existingBody) return new Set();
  const checked = new Set();
  const re = /^- \[x\] \*\*\[[^\]]+\]\((https?:\/\/[^)]+)\)/gim;
  let m;
  while ((m = re.exec(existingBody)) !== null) checked.add(m[1]);
  return checked;
}

function buildBody(broken, checkedUrls) {
  const by404 = broken.filter((r) => r.status === '404');
  const byErrors = broken.filter(
    (r) => r.status === '000' || r.status === '000ERR' || r.status === 'ERR',
  );
  const byAnti = broken.filter((r) => r.status === '999');

  const lines = [
    `## Broken citations — ${broken.length} total`,
    ``,
    `These citations are returning errors from the [nightly link audit](https://github.com/${REPO}/tree/main/audit/links). Each one needs either a URL fix in [\`src/data/sources.ts\`](https://github.com/${REPO}/blob/main/src/data/sources.ts) or removal of the citation entirely. Per the unified resolution log, **every fix PR also appends a row to [\`audit/links/reviewed.tsv\`](https://github.com/${REPO}/blob/main/audit/links/reviewed.tsv)** describing what was changed and why.`,
    ``,
    `**Use the checkboxes to claim work in progress** — checking a box says "I'm looking at this." Claim state is preserved across nightly regenerates, so once you check, it stays checked until the resolution lands and the item drops off the list entirely. List regenerates each nightly run; resolved citations disappear automatically.`,
    ``,
    `_Last refresh reflects audit run ${latestDate}._`,
    ``,
  ];

  const renderGroup = (heading, items, note) => {
    if (items.length === 0) return [];
    const out = [`### ${heading} (${items.length})`, ``];
    if (note) out.push(`_${note}_`, ``);
    for (const r of items) {
      const meta = sourcesIndex.get(r.url);
      const label = meta?.label ?? r.url;
      const line = meta?.line ? `\`sources.ts:${meta.line}\`` : '_not found in registry_';
      const mark = checkedUrls.has(r.url) ? 'x' : ' ';
      out.push(`- [${mark}] **[${label}](${r.url})** — ${line}`);
    }
    out.push('');
    return out;
  };

  lines.push(...renderGroup('🔴 Hard 404 — page is gone', by404));
  lines.push(
    ...renderGroup(
      '⚫ Network / DNS / timeout',
      byErrors,
      'Might be a transient outage. Manual browser check before fixing.',
    ),
  );
  lines.push(
    ...renderGroup(
      '🚧 Anti-bot blocking',
      byAnti,
      'Often fine in a real browser. Manual check; if reachable, no fix needed beyond a reviewed.tsv row.',
    ),
  );

  lines.push(
    `---`,
    ``,
    `_Auto-refreshed nightly by [\`.github/workflows/audit-links.yml\`](https://github.com/${REPO}/blob/main/.github/workflows/audit-links.yml). To trigger immediately, [run the workflow manually](https://github.com/${REPO}/actions/workflows/audit-links.yml)._`,
  );

  return lines.join('\n');
}

// ── 5. Find existing open audit:link rolling issue ───────────────────────
function findOpenRolling() {
  const out = sh([
    'issue',
    'list',
    '--repo',
    REPO,
    '--label',
    LABEL,
    '--state',
    'open',
    '--limit',
    '50',
    '--json',
    'number,title,body',
  ]);
  const issues = JSON.parse(out || '[]');
  // The rolling issue is identified by its title prefix. Pre-migration
  // issues used "Broken link (404): ..." per-URL titles; the rolling one
  // uses "Broken citation queue: ...".
  return issues.find((i) => i.title.startsWith('Broken citation queue:')) ?? null;
}

// ── Main ─────────────────────────────────────────────────────────────────
const existing = findOpenRolling();

if (filteredBroken.length === 0) {
  if (existing) {
    console.log(`→ Closing existing rolling issue #${existing.number} (queue clear)`);
    if (!DRY_RUN) {
      // Update title alongside closing so the closed issue doesn't keep
      // claiming "N broken" from the last run when there are now zero.
      const clearedDate = new Date().toISOString().slice(0, 10);
      const clearedTitle = `Broken citation queue: clear (cleared ${clearedDate})`;
      sh(['issue', 'edit', String(existing.number), '--repo', REPO, '--title', clearedTitle]);
      sh([
        'issue',
        'comment',
        String(existing.number),
        '--repo',
        REPO,
        '--body',
        '🎉 Broken-citation queue is clear — every cited URL is currently reachable. The next nightly audit will reopen this if anything breaks.',
      ]);
      sh(['issue', 'close', String(existing.number), '--repo', REPO, '--reason', 'completed']);
    }
  } else {
    console.log('→ No broken URLs, no existing rolling issue. Nothing to do.');
  }
  process.exit(0);
}

const checkedUrls = extractCheckedUrls(existing?.body);
if (checkedUrls.size > 0) {
  console.log(`→ Preserving ${checkedUrls.size} checked claim(s) from existing body.`);
}
const title = buildTitle(filteredBroken);
const body = buildBody(filteredBroken, checkedUrls);

if (DRY_RUN) {
  console.log(`\n--- WOULD ${existing ? 'EDIT #' + existing.number : 'CREATE'} ---`);
  console.log(`Title: ${title}`);
  console.log(`\nBody:\n${body}`);
  process.exit(0);
}

let issueNumber;
if (existing) {
  console.log(`→ Updating existing rolling issue #${existing.number}`);
  sh(['issue', 'edit', String(existing.number), '--repo', REPO, '--title', title, '--body', body]);
  issueNumber = String(existing.number);
} else {
  console.log(`→ Creating new rolling issue`);
  const url = sh([
    'issue',
    'create',
    '--repo',
    REPO,
    '--title',
    title,
    '--body',
    body,
    '--label',
    LABEL,
  ]);
  issueNumber = url.trim().split('/').pop();
}

// Pin the rolling issue. Idempotent; warns and continues if quota hit.
try {
  sh(['issue', 'pin', issueNumber, '--repo', REPO]);
  console.log(`→ Pinned #${issueNumber} at the top of issues.`);
} catch {
  console.warn(
    `⚠️  Could not pin issue #${issueNumber} (likely the 3-pinned-issues quota). ` +
      `Issue exists; will be re-pinned next run if quota frees up.`,
  );
}

console.log(`✨ Done.`);
