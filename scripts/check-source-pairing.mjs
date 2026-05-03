#!/usr/bin/env node
/**
 * PR check: every newly-added source in src/data/sources.ts must have a
 * matching row added to audit/links/reviewed.tsv in the same PR.
 *
 * Implements the unified-resolution-log convention from CLAUDE.md and
 * audit/links/README.md: the registry never changes silently. A new
 * source presupposes a human verified it; the row is the proof. Without
 * this check, AI-proposed citations or quick wire-ups can sneak in
 * without first-pass review.
 *
 * Scope (v1):
 *   - Detects newly-ADDED source ids (top-level keys in RAW_SOURCES,
 *     synthesized state-${kind}-${code} for state-agency maps).
 *   - Requires each new id to appear as a freshly-added row in
 *     reviewed.tsv with a matching first column.
 *   - Modifications (URL change, label edit) are NOT checked. Convention
 *     still requires a row, but detecting modifications cleanly across a
 *     diff is harder; code review catches those for now.
 *
 * Run via the CI workflow on pull_request events. Locally:
 *
 *   node scripts/check-source-pairing.mjs
 *
 * Compares HEAD to `origin/${GITHUB_BASE_REF}` (or `origin/main` locally).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES_PATH = 'src/data/sources.ts';
const REVIEWED_PATH = 'audit/links/reviewed.tsv';

// Base ref: workflow-supplied via AUDIT_BASE_REF (set explicitly per event
// in ci.yml — PR target on pull_request, previous tip on push). Falls back
// to origin/main for local invocations.
const BASE_REF = process.env.AUDIT_BASE_REF || 'origin/main';

function gitShow(ref, path) {
  return execFileSync('git', ['show', `${ref}:${path}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

// Same id-extraction logic the staleness audit uses (audit/staleness/seed-issue.mjs).
// Top-level entries' ids = the outer record key. State-map entries get a
// synthesized `state-${kind}-${code}` matching the runtime wrapping in
// src/data/sources.ts (`withStateIds(kind, RAW_*)`).
const STATE_KIND_BY_DECL = {
  RAW_SOURCES: 'top',
  RAW_STATE_DOR: 'dor',
  RAW_STATE_SNAP_AGENCY: 'snap',
  RAW_STATE_MEDICAID_AGENCY: 'medicaid',
  RAW_STATE_CHIP_AGENCY: 'chip',
};

function parseSourceIds(text) {
  const ids = new Set();
  let block = null;
  let pendingKey = null;
  let inEntry = false;

  for (const line of text.split('\n')) {
    const blockMatch = /^(?:export\s+)?const\s+(RAW_\w+)\s*[:=]/.exec(line);
    if (blockMatch) {
      block = STATE_KIND_BY_DECL[blockMatch[1]] ?? null;
      pendingKey = null;
      inEntry = false;
      continue;
    }
    if (block && /^\}/.test(line) && !inEntry) {
      block = null;
      continue;
    }
    if (!block) continue;

    if (!inEntry) {
      const km =
        block === 'top'
          ? /^\s+(?:['"]([^'"]+)['"]|([A-Za-z_][\w-]*))\s*:\s*\{/.exec(line)
          : /^\s+([A-Z]{2}):\s*\{/.exec(line);
      if (km) {
        pendingKey = km[1] ?? km[2];
        inEntry = true;
      }
      continue;
    }

    if (/^\s{2,4}\},?\s*$/.test(line)) {
      const id = block === 'top' ? pendingKey : `state-${block}-${pendingKey.toLowerCase()}`;
      ids.add(id);
      pendingKey = null;
      inEntry = false;
    }
  }
  return ids;
}

function parseReviewedIds(text) {
  const ids = new Set();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const [id] = line.split('\t');
    if (id) ids.add(id);
  }
  return ids;
}

let baseSourcesText, baseReviewedText;
try {
  baseSourcesText = gitShow(BASE_REF, SOURCES_PATH);
} catch (err) {
  console.error(`Failed to read ${BASE_REF}:${SOURCES_PATH} — make sure ${BASE_REF} is fetched.`);
  console.error(err.message);
  process.exit(2);
}
try {
  baseReviewedText = gitShow(BASE_REF, REVIEWED_PATH);
} catch {
  // reviewed.tsv may not exist on the base ref (very old branches); treat
  // as empty rather than crashing.
  baseReviewedText = '';
}

const headSourcesText = readFileSync(resolve(ROOT, SOURCES_PATH), 'utf8');
const headReviewedText = readFileSync(resolve(ROOT, REVIEWED_PATH), 'utf8');

const baseSourceIds = parseSourceIds(baseSourcesText);
const headSourceIds = parseSourceIds(headSourcesText);
const baseReviewedIds = parseReviewedIds(baseReviewedText);
const headReviewedIds = parseReviewedIds(headReviewedText);

const newSourceIds = [...headSourceIds].filter((id) => !baseSourceIds.has(id));
const newReviewedIds = new Set([...headReviewedIds].filter((id) => !baseReviewedIds.has(id)));

if (newSourceIds.length === 0) {
  console.log('No new sources in this PR. ✓');
  process.exit(0);
}

const missing = newSourceIds.filter((id) => !newReviewedIds.has(id));

if (missing.length > 0) {
  console.error(`❌ ${missing.length} source(s) added without a paired reviewed.tsv row:`);
  for (const id of missing) console.error(`   - ${id}`);
  console.error('');
  console.error('Per the unified-resolution-log convention, every new source needs');
  console.error('a row in audit/links/reviewed.tsv proving a human verified it.');
  console.error('Format: id<TAB>YYYY-MM-DD<TAB>your-handle<TAB>brief notes');
  console.error('See CLAUDE.md and audit/links/README.md for the rationale.');
  process.exit(1);
}

console.log(`✓ ${newSourceIds.length} new source(s) all paired with reviewed.tsv rows:`);
for (const id of newSourceIds) console.log(`   - ${id}`);
