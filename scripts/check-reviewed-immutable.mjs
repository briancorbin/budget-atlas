#!/usr/bin/env node
/**
 * PR check: rows in audit/links/reviewed.tsv are append-only.
 *
 * Every row in the base ref must still be present, byte-for-byte
 * unchanged, in the PR's HEAD. New rows can be appended; existing rows
 * can't be modified, removed, or reordered into oblivion.
 *
 * Why this matters: reviewed.tsv is the durable audit trail for human
 * verification of citations. Editing a past review row would let
 * someone quietly rewrite history — change the date, change the
 * reviewer, change what was claimed to be verified. That defeats the
 * point. The file grows; rows are immutable.
 *
 * Comments (lines starting with `#`) and blank lines are NOT subject to
 * this check — header docs may need legitimate edits and aren't part of
 * the audit record. If you need to fix a typo in a real review row,
 * that requires explicit acknowledgment via a separate process (e.g. a
 * follow-up "correction" row that supersedes, not edits, the original).
 *
 * Run via the CI workflow on pull_request events. Locally:
 *
 *   node scripts/check-reviewed-immutable.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

/** Extract data rows: non-empty, non-comment, non-header. */
function dataRows(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('id\t')) continue; // legacy header row
    if (line.startsWith('url\t')) continue; // legacy header (pre-id-keying)
    rows.push(line);
  }
  return rows;
}

let baseText;
try {
  baseText = gitShow(BASE_REF, REVIEWED_PATH);
} catch {
  // reviewed.tsv didn't exist on the base ref — nothing to compare. Pass.
  console.log('No reviewed.tsv on base ref; nothing to compare. ✓');
  process.exit(0);
}

const headText = readFileSync(resolve(ROOT, REVIEWED_PATH), 'utf8');

const baseRows = dataRows(baseText);
const headRows = new Set(dataRows(headText));

const missing = [];
for (const row of baseRows) {
  if (!headRows.has(row)) missing.push(row);
}

if (missing.length === 0) {
  const added = headRows.size - baseRows.length;
  if (added > 0) {
    console.log(`✓ All ${baseRows.length} base rows preserved; ${added} row(s) appended.`);
  } else {
    console.log(`✓ reviewed.tsv unchanged (${baseRows.length} rows).`);
  }
  process.exit(0);
}

console.error(
  `❌ ${missing.length} row(s) from base reviewed.tsv are missing or modified in this PR:`,
);
console.error('');
for (const row of missing) {
  // Truncate noisy notes to keep the log readable.
  const display = row.length > 200 ? row.slice(0, 197) + '...' : row;
  console.error(`   - ${display}`);
}
console.error('');
console.error('reviewed.tsv is the durable audit trail for human verification of');
console.error("citations. Existing rows are immutable — they can't be modified,");
console.error('removed, or reordered. New rows can be appended.');
console.error('');
console.error('If you need to correct an earlier review, append a NEW row that');
console.error("supersedes the original. Don't edit history.");
console.error('');
console.error('See audit/links/README.md for the unified-resolution-log convention.');
process.exit(1);
