#!/usr/bin/env node
// Generate audit/links/status.md — a human-readable table of every cited
// source with its current curl status and human-review history.
//
// Joins three inputs:
//   1. src/data/sources.ts          → label, tier, date for each URL
//   2. audit/links/results/<latest> → most recent curl status per URL
//   3. audit/links/reviewed.tsv     → human-review log per URL
//
// Writes one markdown table sorted so the rows that need attention surface
// first: broken before unreviewed, unreviewed before reviewed.
//
// Run via `yarn audit:status` or as part of the check-links workflow.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCES_TS = resolve(ROOT, 'src/data/sources.ts');
const RESULTS_DIR = resolve(ROOT, 'audit/links/results');
const REVIEWED_TSV = resolve(ROOT, 'audit/links/reviewed.tsv');
const OUT = resolve(ROOT, 'audit/links/status.md');

// ── 1. Parse sources.ts to build URL → {label, tier} ─────────────────────
const sourcesText = readFileSync(SOURCES_TS, 'utf8');
const sourceMeta = new Map();

// Walk line-by-line tracking the most recent label seen, then attach it
// to the next URL we encounter. Handles both inline entries
// (`AL: { label: 'X', url: 'Y', ... }`) and multi-line entries where
// `label:` and the string are on different lines.
let pendingLabel = null;
let labelOnNextLine = false;
for (const raw of sourcesText.split('\n')) {
  const line = raw.trim();

  if (labelOnNextLine) {
    const m = line.match(/^['"`]([^'"`]+)['"`]/);
    if (m) {
      pendingLabel = m[1];
      labelOnNextLine = false;
      continue;
    }
  }

  // `label: 'foo'` or `label: 'foo',` (single-line)
  let m = line.match(/^label:\s*['"`]([^'"`]+)['"`]/);
  if (m) {
    pendingLabel = m[1];
    continue;
  }
  // `label:` alone (multi-line continuation follows)
  if (/^label:\s*$/.test(line)) {
    labelOnNextLine = true;
    continue;
  }
  // Inline: `{ label: 'foo', url: 'bar', ... }`
  m = line.match(/label:\s*['"`]([^'"`]+)['"`]/);
  if (m) {
    pendingLabel = m[1];
  }

  const urlMatch = line.match(/url:\s*['"`]([^'"`]+)['"`]/);
  if (urlMatch) {
    const url = urlMatch[1];
    const tierMatch = line.match(/tier:\s*['"`]([^'"`]+)['"`]/);
    const addedByInline = line.match(/addedBy:\s*['"`]([^'"`]+)['"`]/);
    const addedAtInline = line.match(/addedAt:\s*['"`]([^'"`]+)['"`]/);
    sourceMeta.set(url, {
      label: pendingLabel ?? url,
      tier: tierMatch?.[1] ?? null,
      addedBy: addedByInline?.[1] ?? null,
      addedAt: addedAtInline?.[1] ?? null,
    });
  }

  // Tier / addedBy / addedAt on their own lines (multi-field entries in SOURCES)
  const lastUrl = [...sourceMeta.keys()].pop();
  if (!lastUrl) continue;
  const existing = sourceMeta.get(lastUrl);
  if (!existing) continue;

  const tierLine = line.match(/^tier:\s*['"`]([^'"`]+)['"`]/);
  if (tierLine && !existing.tier) {
    sourceMeta.set(lastUrl, { ...existing, tier: tierLine[1] });
  }
  const addedByLine = line.match(/^addedBy:\s*['"`]([^'"`]+)['"`]/);
  if (addedByLine && !existing.addedBy) {
    sourceMeta.set(lastUrl, { ...sourceMeta.get(lastUrl), addedBy: addedByLine[1] });
  }
  const addedAtLine = line.match(/^addedAt:\s*['"`]([^'"`]+)['"`]/);
  if (addedAtLine && !existing.addedAt) {
    sourceMeta.set(lastUrl, { ...sourceMeta.get(lastUrl), addedAt: addedAtLine[1] });
  }
}

// ── 2. Read the latest results TSV ────────────────────────────────────────
const tsvs = readdirSync(RESULTS_DIR)
  .filter((f) => f.endsWith('.tsv'))
  .sort();
if (tsvs.length === 0) {
  console.error('No results TSV. Run yarn check-links first.');
  process.exit(1);
}
const latestPath = resolve(RESULTS_DIR, tsvs[tsvs.length - 1]);
const latestDate = tsvs[tsvs.length - 1].replace('.tsv', '');
const status = new Map();
for (const line of readFileSync(latestPath, 'utf8').split('\n').slice(1)) {
  if (!line) continue;
  const [code, url, finalUrl] = line.split('\t');
  status.set(url, { code, finalUrl });
}

// ── 3. Read reviewed.tsv ─────────────────────────────────────────────────
// A URL can have multiple reviews — historical audit trail. We render the
// latest in the table and expose the count so multi-verified citations get
// visual credit. All rows stay in the TSV regardless.
const reviewsByUrl = new Map();
try {
  for (const line of readFileSync(REVIEWED_TSV, 'utf8').split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('url\t')) continue;
    const [url, date, reviewer, notes] = line.split('\t');
    if (!url) continue;
    if (!reviewsByUrl.has(url)) reviewsByUrl.set(url, []);
    reviewsByUrl.get(url).push({ date, reviewer, notes: notes ?? '' });
  }
} catch {
  // No reviewed.tsv yet — fine.
}
// Sort each URL's reviews newest-first so [0] is the latest.
for (const list of reviewsByUrl.values()) {
  list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// ── 4. Build the rows ─────────────────────────────────────────────────────
const rows = [];
for (const [url, { label, tier }] of sourceMeta) {
  const s = status.get(url);
  const reviews = reviewsByUrl.get(url) ?? [];
  const latest = reviews[0]; // newest-first after sort
  rows.push({
    url,
    label,
    tier: tier ?? '—',
    code: s?.code ?? 'unchecked',
    reviewedAt: latest?.date ?? null,
    reviewer: latest?.reviewer ?? null,
    notes: latest?.notes ?? '',
    reviewCount: reviews.length,
    addedBy: sourceMeta.get(url)?.addedBy ?? null,
    addedAt: sourceMeta.get(url)?.addedAt ?? null,
  });
}

// Sort: broken first, then unreviewed-and-loading, then reviewed.
const isBroken = (r) => /^(?:404|000|ERR|999)$/.test(r.code);
const isLoaded = (r) => /^2\d\d|3\d\d$/.test(r.code);
const sortKey = (r) => {
  if (isBroken(r)) return 0;
  if (isLoaded(r) && !r.reviewedAt) return 1;
  if (r.reviewedAt) return 2;
  return 3; // 403 / unchecked / other
};
rows.sort((a, b) => sortKey(a) - sortKey(b) || a.label.localeCompare(b.label));

// ── 5. Emit markdown ─────────────────────────────────────────────────────
const statusEmoji = (code) => {
  if (/^2/.test(code)) return '🟢';
  if (/^3/.test(code)) return '🟡';
  if (code === '404') return '🔴';
  if (code === '403') return '🔵';
  if (/^(?:000|ERR|999)$/.test(code)) return '⚫';
  return '⚪';
};
const reviewMark = (r) => {
  if (!r.reviewedAt) return '—';
  // Show date + ×N badge when multiple reviews exist for this URL.
  const badge = r.reviewCount > 1 ? ` (${r.reviewCount}×)` : '';
  return `✅ ${r.reviewedAt}${badge}`;
};

const counts = {
  total: rows.length,
  broken: rows.filter(isBroken).length,
  loaded: rows.filter(isLoaded).length,
  reviewed: rows.filter((r) => r.reviewedAt).length,
  botBlocked: rows.filter((r) => r.code === '403').length,
};

const lines = [];
lines.push('# Source links — review status');
lines.push('');
lines.push(
  `_Auto-generated by [\`audit/links/generate-status.mjs\`](./generate-status.mjs). ` +
    `Reflects audit run ${latestDate}._`,
);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Metric | Count |');
lines.push('| --- | ---: |');
lines.push(`| Total cited sources | ${counts.total} |`);
lines.push(`| 🟢 Loaded (\`200\`/\`3xx\`) | ${counts.loaded} |`);
lines.push(`| 🔴 Broken (\`404\`/errors) | ${counts.broken} |`);
lines.push(`| 🔵 Bot-blocked (\`403\`) | ${counts.botBlocked} |`);
lines.push(`| ✅ Manually reviewed | ${counts.reviewed} |`);
lines.push('');
lines.push(
  '_Sort order below: broken first, then unreviewed-but-loading, then reviewed. Within each group, alphabetical by label._',
);
lines.push('');
lines.push('## Sources');
lines.push('');
lines.push('|  | Source | Tier | Status | Added by | Added | Latest review | By | Notes |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');

for (const r of rows) {
  // Markdown-escape pipe in any free-form field.
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const label = esc(r.label).slice(0, 80);
  const linkedLabel = `[${label}](${r.url})`;
  const notes = esc(r.notes).slice(0, 120);
  lines.push(
    `| ${[
      statusEmoji(r.code),
      linkedLabel,
      r.tier,
      `\`${r.code}\``,
      ghUserLink(r.addedBy),
      r.addedAt ?? '—',
      reviewMark(r),
      ghUserLink(r.reviewer),
      notes || '—',
    ].join(' | ')} |`,
  );
}

/**
 * Render a contributor handle as a clickable @-link to their GitHub profile.
 * Plain markdown doesn't auto-link `@username` outside of issues/PRs, so we
 * spell out the URL.
 */
function ghUserLink(handle) {
  if (!handle) return '—';
  const clean = String(handle).replace(/^@/, '').trim();
  return `[@${clean}](https://github.com/${clean})`;
}

lines.push('');
lines.push('## How to update this');
lines.push('');
lines.push('1. Source-of-truth registry: [`src/data/sources.ts`](../../src/data/sources.ts).');
lines.push('2. After running `yarn check-links`, run `yarn audit:status` to regenerate this file.');
lines.push(
  '3. To record a manual review of a URL, add a row to [`reviewed.tsv`](./reviewed.tsv) and re-run.',
);
lines.push(
  '4. The nightly audit GitHub Action regenerates this file automatically — no manual run needed for routine updates.',
);
lines.push('');

writeFileSync(OUT, lines.join('\n'));
console.log(`→ Wrote ${OUT}`);
console.log(
  `   ${counts.total} sources | ${counts.loaded} loaded | ${counts.broken} broken | ${counts.reviewed} reviewed`,
);
