#!/usr/bin/env node
// Generate audit/links/status.md — a human-readable table of every cited
// source with its current curl status and human-review history.
//
// Joins three inputs:
//   1. src/data/sources.ts          → label, tier, date for each URL
//   2. audit/links/results/<latest> → most recent curl status per URL
//   3. audit/links/reviewed.tsv     → human-review log per source id
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

// ── 1. Parse sources.ts to build id → { url, label, tier, addedBy, addedAt }
//
// Sources live in two structural shapes inside sources.ts:
//
//   const RAW_SOURCES = { 'foo-bar': { ... }, ... }                top-level
//   const RAW_STATE_DOR: Record<...> = { AL: { ... }, ... }        state map
//
// Top-level entries' ids are the outer record keys verbatim. State-map
// entries' ids are synthesized as `state-${kind}-${code.toLowerCase()}` to
// match the `withStateIds(kind, RAW_*)` wrapping in src/data/sources.ts.
// Track which RAW block we're inside, then synthesize ids on entry close.
const STATE_KIND_BY_DECL = {
  RAW_SOURCES: 'top',
  RAW_STATE_DOR: 'dor',
  RAW_STATE_SNAP_AGENCY: 'snap',
  RAW_STATE_MEDICAID_AGENCY: 'medicaid',
  RAW_STATE_CHIP_AGENCY: 'chip',
};

const sourcesText = readFileSync(SOURCES_TS, 'utf8');
const sourceMeta = new Map();
{
  let block = null;
  let pendingKey = null;
  let pendingFields = null;
  let inEntry = false;

  for (const line of sourcesText.split('\n')) {
    const blockMatch = /^(?:export\s+)?const\s+(RAW_\w+)\s*[:=]/.exec(line);
    if (blockMatch) {
      block = STATE_KIND_BY_DECL[blockMatch[1]] ?? null;
      pendingKey = null;
      pendingFields = null;
      inEntry = false;
      continue;
    }

    if (block && /^\}/.test(line) && !inEntry) {
      block = null;
      continue;
    }

    if (!block) continue;

    if (!inEntry) {
      // Top-level keys can be quoted (`'foo-bar': {`) or bare identifiers
      // (`insurekidsnow: {`) — JS allows the unquoted form when the key is
      // a valid identifier. State-map keys are always two-letter codes.
      const keyMatch =
        block === 'top'
          ? /^\s+(?:['"]([^'"]+)['"]|([A-Za-z_][\w-]*))\s*:\s*\{/.exec(line)
          : /^\s+([A-Z]{2}):\s*\{/.exec(line);
      if (keyMatch) {
        pendingKey = keyMatch[1] ?? keyMatch[2];
        pendingFields = {};
        inEntry = true;
      }
      continue;
    }

    const url = /url:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (url) pendingFields.url = url[1];
    const label = /label:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (label) pendingFields.label = label[1];
    const tier = /tier:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (tier) pendingFields.tier = tier[1];
    const addedBy = /addedBy:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (addedBy) pendingFields.addedBy = addedBy[1];
    const addedAt = /addedAt:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (addedAt) pendingFields.addedAt = addedAt[1];

    if (/^\s{2,4}\},?\s*$/.test(line)) {
      const id = block === 'top' ? pendingKey : `state-${block}-${pendingKey.toLowerCase()}`;
      sourceMeta.set(id, {
        url: pendingFields.url ?? null,
        label: pendingFields.label ?? id,
        tier: pendingFields.tier ?? null,
        addedBy: pendingFields.addedBy ?? null,
        addedAt: pendingFields.addedAt ?? null,
      });
      pendingKey = null;
      pendingFields = null;
      inEntry = false;
    }
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
// Reviews are keyed by source id (a stable slug), not URL — so review
// history follows a citation through URL changes. A source can have
// multiple reviews; we render the latest in the table and expose the
// count so multi-verified citations get visual credit.
// 4-col legacy rows: id, date, reviewer, notes — kind defaults to 'human'.
// 5-col current: id, date, reviewer, kind, notes.
//
// Recognised kinds: 'human' or 'ai'. The earlier three-state spellings
// ('ai-assisted', 'ai-proposed') still parse for backwards compatibility
// and fold into 'ai'. An unrecognised kind in column 4 is treated as a
// malformed row and skipped with a loud warning — falling back to legacy
// parsing on a typo'd kind would silently promote the row to human and
// shift the column into notes, defeating the whole point of the
// provenance column.
const VALID_KINDS = new Set(['human', 'ai', 'ai-assisted', 'ai-proposed', 'verified-bot-blocked']);
// Kinds that don't represent the kind of full-citation verification this
// status report is summarising — they're recognised so the row isn't
// rejected as malformed, but skipped when populating reviewsById so they
// don't show up in the human/AI counts or the per-source review lists.
// See src/lib/sourceStatus.tsx for the matching UI-side logic and
// audit/links/seed-issues.mjs for what verified-bot-blocked actually does.
const HIDDEN_KINDS = new Set(['verified-bot-blocked']);
const normaliseKind = (raw) => (raw === 'human' ? 'human' : 'ai');
const reviewsById = new Map();
try {
  for (const line of readFileSync(REVIEWED_TSV, 'utf8').split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const parts = line.split('\t');
    const [id, date, reviewer] = parts;
    if (!id) continue;
    let kind, notes;
    if (parts.length >= 5) {
      if (!VALID_KINDS.has(parts[3])) {
        console.warn(
          `[reviewed.tsv] Unrecognised kind "${parts[3]}" on row for "${id}". ` +
            `Expected one of: ${[...VALID_KINDS].join(', ')}. Skipping row.`,
        );
        continue;
      }
      if (HIDDEN_KINDS.has(parts[3])) continue;
      kind = normaliseKind(parts[3]);
      notes = parts[4] ?? '';
    } else {
      kind = 'human';
      notes = parts[3] ?? '';
    }
    if (!reviewsById.has(id)) reviewsById.set(id, []);
    reviewsById.get(id).push({ date, reviewer, kind, notes });
  }
} catch {
  // No reviewed.tsv yet — fine.
}
for (const list of reviewsById.values()) {
  list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// ── 4. Build the rows ─────────────────────────────────────────────────────
const rows = [];
for (const [id, { url, label, tier, addedBy, addedAt }] of sourceMeta) {
  const s = url ? status.get(url) : null;
  const reviews = reviewsById.get(id) ?? [];
  const latest = reviews[0];
  rows.push({
    id,
    url,
    label,
    tier: tier ?? '—',
    code: s?.code ?? 'unchecked',
    reviewedAt: latest?.date ?? null,
    reviewer: latest?.reviewer ?? null,
    reviewedKind: latest?.kind ?? null,
    notes: latest?.notes ?? '',
    reviewCount: reviews.length,
    addedBy,
    addedAt,
  });
}

// Sort: broken first, then unreviewed-and-loading, then reviewed.
// 999 excluded — it's an anti-bot status code (LinkedIn-style refusal)
// not a real broken page. Categorised under bot-blocked alongside 403,
// matching the status-code table in audit/links/README.md.
//
// Match must align with src/lib/sourceStatus.tsx:BROKEN_STATUS_CODES so
// the script's count and the /sources page count agree. `000ERR` is the
// concatenation curl produces when the http_code is 000 (no response)
// AND the command exits non-zero (network error) — counts as broken.
const isBroken = (r) => /^(?:404|000|000ERR|ERR)$/.test(r.code);
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
  // Prefix with the kind icon: ✅ for human (eyes-on-source) or 🤖 for
  // AI-assisted reviews. Treating both identically would launder AI
  // work as the same evidence as a human pass.
  const badge = r.reviewCount > 1 ? ` (${r.reviewCount}×)` : '';
  const icon = r.reviewedKind === 'ai' ? '🤖' : '✅';
  return `${icon} ${r.reviewedAt}${badge}`;
};

const counts = {
  total: rows.length,
  broken: rows.filter(isBroken).length,
  loaded: rows.filter(isLoaded).length,
  reviewedHuman: rows.filter((r) => r.reviewedAt && r.reviewedKind !== 'ai').length,
  reviewedAi: rows.filter((r) => r.reviewedAt && r.reviewedKind === 'ai').length,
  botBlocked: rows.filter((r) => r.code === '403' || r.code === '999').length,
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
lines.push(`| 🔵 Bot-blocked (\`403\`/\`999\`) | ${counts.botBlocked} |`);
lines.push(`| ✅ Reviewed (human) | ${counts.reviewedHuman} |`);
lines.push(`| 🤖 Reviewed (AI) | ${counts.reviewedAi} |`);
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
  `   ${counts.total} sources | ${counts.loaded} loaded | ${counts.broken} broken | ${counts.reviewedHuman} reviewed (human) | ${counts.reviewedAi} reviewed (AI)`,
);
