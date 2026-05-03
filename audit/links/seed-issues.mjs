#!/usr/bin/env node
// Maintain a single rolling GitHub issue for broken-citation triage.
//
// Reads the most recent TSV from audit/links/results/, finds entries that
// curl couldn't reach (404, network errors, anti-bot 999), and renders the
// list as a single grouped checklist on a rolling `audit:link` issue.
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
// Usage:
//   node audit/links/seed-issues.mjs               # update the rolling issue
//   node audit/links/seed-issues.mjs --dry-run     # print what would happen
//
// Auth:
//   Requires the gh CLI authenticated. In GitHub Actions, GITHUB_TOKEN is
//   sufficient (set permissions: { issues: write } on the workflow).

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const RESULTS_DIR = resolve(__dirname, 'results');
const SOURCES_TS = resolve(ROOT, 'src/data/sources.ts');
const REPO = 'TheBudgetAtlas/thebudgetatlas';
const LABEL = 'audit:link';

const ACTIONABLE = new Set(['404', '000', 'ERR', '999']);

const DRY_RUN = process.argv.includes('--dry-run');

function sh(args, opts = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
}

// ── 1. Locate the latest results TSV ─────────────────────────────────────
let tsvs;
try {
  tsvs = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.tsv'))
    .sort();
} catch {
  console.error(`No results directory at ${RESULTS_DIR}. Run yarn check-links first.`);
  process.exit(1);
}
if (tsvs.length === 0) {
  console.error('No results TSV found. Run yarn check-links first.');
  process.exit(1);
}
const latestPath = resolve(RESULTS_DIR, tsvs[tsvs.length - 1]);
const latestDate = tsvs[tsvs.length - 1].replace('.tsv', '');
console.log(`→ Reading ${latestPath}`);

// ── 2. Parse rows ────────────────────────────────────────────────────────
const rows = readFileSync(latestPath, 'utf8')
  .split('\n')
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [status, url, finalUrl] = line.split('\t');
    return { status, url, finalUrl };
  });

const broken = rows.filter((r) => ACTIONABLE.has(r.status));
console.log(`→ ${broken.length} broken / ${rows.length} total URLs.`);

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

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
        index.set(url, { label: pendingLabel ?? url, line: i + 1 });
      }
    }
  }
  return index;
}

const sourcesIndex = buildSourcesIndex();

// ── 4. Build the issue body ──────────────────────────────────────────────
function buildTitle(broken) {
  const counts = { 404: 0, errors: 0, anti: 0 };
  for (const r of broken) {
    if (r.status === '404') counts['404']++;
    else if (r.status === '000' || r.status === 'ERR') counts.errors++;
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
  const byErrors = broken.filter((r) => r.status === '000' || r.status === 'ERR');
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

if (broken.length === 0) {
  if (existing) {
    console.log(`→ Closing existing rolling issue #${existing.number} (queue clear)`);
    if (!DRY_RUN) {
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
const title = buildTitle(broken);
const body = buildBody(broken, checkedUrls);

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
