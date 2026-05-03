#!/usr/bin/env node
/**
 * Source inventory audit.
 *
 * Builds a snapshot of every citation in the registry crossed against:
 *
 *   1. Where it's used in the codebase (top-level entries only — state-map
 *      entries are dynamically accessed by code, treated as collectively
 *      used, see notes in output).
 *   2. Latest curl status (from audit/links/results/latest.tsv).
 *   3. Latest human review (from audit/links/reviewed.tsv).
 *
 * Outputs `audit/source-inventory.md` — a sortable, scannable table for
 * triage. Surfaces three priority queues at the top:
 *
 *   - Top-level sources with no detected usage outside src/data/sources.ts
 *     itself (candidates for removal).
 *   - Broken sources (already in queue #116; surfaced here too).
 *   - Original-tier sources that have never been reviewed (highest-stakes
 *     queue for the human-only review sweep).
 *
 * Run via `yarn audit:inventory`.
 *
 * Imports the actual TypeScript modules via Node's --experimental-strip-types
 * (Node 22+) — same approach the staleness/seed scripts could use but
 * historically don't. Worth noting since the inline-regex parsers in those
 * scripts could be replaced with this approach if we ever consolidate.
 */

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEWED_TSV = resolve(ROOT, 'audit/links/reviewed.tsv');
const LATEST_TSV = resolve(ROOT, 'audit/links/results/latest.tsv');
const OUT_MD = resolve(ROOT, 'audit/source-inventory.md');

// Pull live data — types stripped on the fly so `id`/`tier`/etc. flow through.
// Use a file URL rather than a raw path so this works on Windows (Node's
// dynamic import() rejects bare drive-letter paths like `C:\...`).
const sourcesModule = await import(pathToFileURL(resolve(ROOT, 'src/data/sources.ts')).href);
const { SOURCES, ALL_SOURCES } = sourcesModule;

// ── Status + reviews ────────────────────────────────────────────────────
//
// `BROKEN_STATUS_CODES` matches the UI's definition (src/lib/sourceStatus.tsx),
// so this report's broken count tracks the /sources page exactly. The audit
// pipeline (audit/links/seed-issues.mjs and generate-status.mjs) currently
// uses a slightly narrower set that excludes `000ERR`; that divergence is
// long-standing and tracked as a follow-up. When the three definitions
// converge, this constant becomes a re-export.
const BROKEN_SET = new Set(['404', '000', '000ERR', 'ERR', '999']);

const STATUS_BY_URL = (() => {
  const map = new Map();
  for (const line of readFileSync(LATEST_TSV, 'utf8').split('\n').slice(1)) {
    if (!line) continue;
    const [status, url] = line.split('\t');
    if (url) map.set(url, status);
  }
  return map;
})();

const LATEST_REVIEW = (() => {
  const map = new Map();
  for (const line of readFileSync(REVIEWED_TSV, 'utf8').split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const [id, date] = line.split('\t');
    if (!id) continue;
    if (!map.has(id) || date > map.get(id)) map.set(id, date);
  }
  return map;
})();

// ── Usage detection (top-level only) ────────────────────────────────────
//
// State-map entries are consumed via runtime lookups
// (`STATE_DOR[stateCode]`, `STATE_SNAP_AGENCY[state]`, etc.) and
// `Object.values(STATE_*)`, so individual state usage isn't statically
// checkable without much more work. The triage question for state maps is
// data accuracy, not "is this used" — every entry is in play whenever a
// user picks that state. So we limit usage detection to top-level
// SOURCES['key'] references.
//
// Files explicitly excluded from the "is this source used" grep: the
// registry itself (`sources.ts`) and the bibliography page
// (`Sources.tsx`). The bibliography enumerates every top-level source by
// design — counting it as a usage would mean a citation only referenced
// by the bibliography (i.e. functionally dead) would never surface as
// unused. That's the bug the audit exists to catch.
const USAGE_GREP_EXCLUDES = new Set(['src/data/sources.ts', 'src/components/Sources.tsx']);

function gatherTopLevelUsage(id) {
  // Match SOURCES['id'], SOURCES["id"], or SOURCES.id (rare; only valid
  // for identifier-safe ids like `insurekidsnow`).
  const patterns = [`SOURCES\\['${id}'\\]`, `SOURCES\\["${id}"\\]`, `SOURCES\\.${id}\\b`];
  const refs = [];
  for (const pat of patterns) {
    let out = '';
    try {
      out = execFileSync('grep', ['-rn', '--include=*.ts', '--include=*.tsx', '-E', pat, 'src/'], {
        cwd: ROOT,
        encoding: 'utf8',
      });
    } catch (err) {
      // grep exits 1 when there are no matches — that's fine. Anything
      // else (binary missing, invalid regex, permission error) is real
      // and should fail loudly so we don't silently mark sources unused.
      if (err.status !== 1) {
        throw new Error(`grep failed for pattern ${pat}`, { cause: err });
      }
    }
    for (const line of out.split('\n')) {
      if (!line) continue;
      const m = /^([^:]+):(\d+):/.exec(line);
      if (!m) continue;
      const [, file, lineNo] = m;
      if (USAGE_GREP_EXCLUDES.has(file)) continue;
      refs.push(`${file}:${lineNo}`);
    }
  }
  return refs;
}

// ── Build rows ──────────────────────────────────────────────────────────
const topLevelIds = new Set(Object.keys(SOURCES));

const rows = [];
for (const source of ALL_SOURCES) {
  const isTopLevel = topLevelIds.has(source.id);
  const status = STATUS_BY_URL.get(source.url) ?? '';
  const broken = BROKEN_SET.has(status);
  const latestReview = LATEST_REVIEW.get(source.id) ?? null;
  const usage = isTopLevel ? gatherTopLevelUsage(source.id) : null;

  rows.push({
    id: source.id,
    label: source.label,
    tier: source.tier ?? '—',
    url: source.url,
    addedBy: source.addedBy ?? '',
    addedAt: source.addedAt ?? '',
    status,
    broken,
    latestReview,
    isTopLevel,
    usage, // null for state-map entries
  });
}

// ── Priority queues ─────────────────────────────────────────────────────
const unused = rows.filter((r) => r.isTopLevel && r.usage.length === 0);
const broken = rows.filter((r) => r.broken);
const originalUnreviewed = rows.filter((r) => r.tier === 'original' && !r.latestReview);

// ── Render ──────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
// Record the snapshot date of the link-audit data so a re-run without a
// fresh `yarn check-links` is honest about it. Pull from the dated TSV
// path if available (`results/YYYY-MM-DD.tsv`); fall back to latest.tsv's
// mtime. Without this stamp it's easy to misread broken-source counts as
// current when they're days stale.
const auditDate = (() => {
  const mtime = statSync(LATEST_TSV).mtime.toISOString().slice(0, 10);
  return mtime;
})();
const lines = [];

lines.push('# Source inventory audit');
lines.push('');
lines.push(`_Generated ${today} via \`yarn audit:inventory\`. Link-audit snapshot: ${auditDate}._`);
lines.push(
  '_Re-run after changes; broken counts reflect the snapshot date, not necessarily today — run `yarn check-links` first if a current curl-status reading matters._',
);
lines.push('');
lines.push('Snapshot of every citation in the registry, crossed against where');
lines.push('it’s used in the codebase, its latest curl status, and its latest');
lines.push('human review. Three priority queues surface at the top.');
lines.push('');
lines.push(
  `**Total sources:** ${rows.length} · **Top-level:** ${rows.filter((r) => r.isTopLevel).length} · **Per-state:** ${rows.filter((r) => !r.isTopLevel).length}`,
);
lines.push('');

// Priority queue 1 — unused
lines.push('## 1. Unused top-level sources');
lines.push('');
lines.push(
  "_No `SOURCES['<id>']` references detected outside the registry itself (`src/data/sources.ts`) or the bibliography page (`src/components/Sources.tsx`, which enumerates everything by design). Candidates for removal — but verify by hand: dynamic lookups (e.g. iterating `FLAT_SOURCES`) won’t show up in grep._",
);
lines.push('');
if (unused.length === 0) {
  lines.push('_None — every top-level source is referenced somewhere._');
} else {
  lines.push('| id | label | tier |');
  lines.push('| --- | --- | --- |');
  for (const r of unused) {
    lines.push(`| \`${r.id}\` | ${r.label} | ${r.tier} |`);
  }
}
lines.push('');

// Priority queue 2 — broken
lines.push('## 2. Broken sources');
lines.push('');
lines.push(
  `_Curl returned a hard error (${[...BROKEN_SET].sort().join('/')}). Mirrors issue [#116](https://github.com/TheBudgetAtlas/thebudgetatlas/issues/116)._`,
);
lines.push('');
if (broken.length === 0) {
  lines.push('_None — all citations resolved._');
} else {
  lines.push('| id | label | tier | status | url |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of broken) {
    lines.push(`| \`${r.id}\` | ${r.label} | ${r.tier} | \`${r.status}\` | <${r.url}> |`);
  }
}
lines.push('');

// Priority queue 3 — original tier, never reviewed
lines.push('## 3. Original-tier sources never reviewed');
lines.push('');
lines.push(
  '_Highest-stakes queue. By rule these reviews are 100% human, no AI assistance — open the URL, read the destination, append a row to `audit/links/reviewed.tsv` describing what you saw._',
);
lines.push('');
if (originalUnreviewed.length === 0) {
  lines.push('_None — every original-tier source has at least one review._');
} else {
  lines.push('| id | label | added | url |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of originalUnreviewed) {
    lines.push(`| \`${r.id}\` | ${r.label} | ${r.addedAt} | <${r.url}> |`);
  }
}
lines.push('');

// Full inventory — top-level
lines.push('## Full inventory · top-level sources');
lines.push('');
lines.push('| id | label | tier | added | latest review | status | usage |');
lines.push('| --- | --- | --- | --- | --- | --- | --- |');
const topLevelRows = rows.filter((r) => r.isTopLevel).sort((a, b) => a.id.localeCompare(b.id));
for (const r of topLevelRows) {
  const reviewCell = r.latestReview ?? '_never_';
  const statusCell = r.broken
    ? `🔴 \`${r.status || 'broken'}\``
    : r.status
      ? `\`${r.status}\``
      : '';
  const usageCell =
    r.usage.length === 0
      ? '⚠️ _none_'
      : r.usage.length === 1
        ? `\`${r.usage[0]}\``
        : `${r.usage.length} refs`;
  lines.push(
    `| \`${r.id}\` | ${r.label} | ${r.tier} | ${r.addedAt} | ${reviewCell} | ${statusCell} | ${usageCell} |`,
  );
}
lines.push('');

// Full inventory — state maps (collapsed)
lines.push('## Full inventory · per-state maps');
lines.push('');
lines.push(
  '_State-map entries are dynamically referenced (e.g. `STATE_DOR[stateCode]`); grep can’t verify per-state usage. Listed here grouped by map, sorted within each by id._',
);
lines.push('');
const stateMapPrefixes = ['state-dor-', 'state-snap-', 'state-medicaid-', 'state-chip-'];
const PREFIX_LABEL = {
  'state-dor-': 'STATE_DOR · Departments of Revenue',
  'state-snap-': 'STATE_SNAP_AGENCY · SNAP administering agencies',
  'state-medicaid-': 'STATE_MEDICAID_AGENCY · Medicaid administering agencies',
  'state-chip-': 'STATE_CHIP_AGENCY · CHIP programs',
};
for (const prefix of stateMapPrefixes) {
  const group = rows
    .filter((r) => r.id.startsWith(prefix))
    .sort((a, b) => a.id.localeCompare(b.id));
  lines.push(
    `<details><summary><strong>${PREFIX_LABEL[prefix]}</strong> (${group.length})</summary>`,
  );
  lines.push('');
  lines.push('| id | label | tier | latest review | status |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of group) {
    const reviewCell = r.latestReview ?? '_never_';
    const statusCell = r.broken
      ? `🔴 \`${r.status || 'broken'}\``
      : r.status
        ? `\`${r.status}\``
        : '';
    lines.push(`| \`${r.id}\` | ${r.label} | ${r.tier} | ${reviewCell} | ${statusCell} |`);
  }
  lines.push('');
  lines.push('</details>');
  lines.push('');
}

writeFileSync(OUT_MD, lines.join('\n') + '\n');
console.log(`→ Wrote ${relative(ROOT, OUT_MD)}`);
console.log(
  `   ${rows.length} sources · ${unused.length} unused · ${broken.length} broken · ${originalUnreviewed.length} original/unreviewed`,
);
