#!/usr/bin/env node
/**
 * PR check: rows in audit/links/reviewed.tsv are append-only — but
 * "append-only" is enforced across the union of the live file plus
 * everything in audit/links/archive/. A row from base must still be
 * reachable somewhere in that union; what counts as "the audit trail"
 * is the union, not just the live file alone.
 *
 * Why the union: schema migrations need to rewrite the live file (e.g.
 * adding a column, padding legacy rows for tabular consistency). The
 * rotation pattern is:
 *
 *   1. Copy current reviewed.tsv → audit/links/archive/reviewed.<date>.tsv
 *   2. Rewrite reviewed.tsv with all rows in the new schema
 *   3. CI checks every prior row is still present in current OR archive
 *
 * That preserves the actual invariant we care about — "no review row
 * ever disappears from the audit trail" — while allowing legitimate
 * format migrations. Without rotation support, schema evolution would
 * require either silent edits (which the check exists to prevent) or
 * an indefinite append-only file with mixed formats forever.
 *
 * Comments (lines starting with `#`) and blank lines are NOT subject
 * to this check — header docs may need legitimate edits and aren't
 * part of the audit record. If you need to fix a typo in a real review
 * row, that requires either a follow-up "correction" row that
 * supersedes the original, or a formal rotation per the pattern above.
 *
 * Run via the CI workflow on pull_request events. Locally:
 *
 *   node scripts/check-reviewed-immutable.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEWED_PATH = 'audit/links/reviewed.tsv';
const ARCHIVE_DIR = 'audit/links/archive';

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

// Audit-trail union: the live file plus every archive file in HEAD.
// A row from the base is "preserved" if it appears anywhere in this set.
const trail = new Set(dataRows(headText));
let archiveFiles = [];
try {
  archiveFiles = readdirSync(resolve(ROOT, ARCHIVE_DIR))
    .filter((f) => f.endsWith('.tsv'))
    .map((f) => join(ARCHIVE_DIR, f));
  for (const file of archiveFiles) {
    const text = readFileSync(resolve(ROOT, file), 'utf8');
    for (const row of dataRows(text)) trail.add(row);
  }
} catch {
  // Archive directory absent — fine; rotation hasn't happened yet.
}

const baseRows = dataRows(baseText);
const missing = [];
for (const row of baseRows) {
  if (!trail.has(row)) missing.push(row);
}

if (missing.length === 0) {
  const headRowSet = new Set(dataRows(headText));
  const liveRows = headRowSet.size;
  const added = liveRows - baseRows.length;
  // Count base rows that no longer appear in the live file but are
  // reachable in archive — i.e. rows that were rotated out of the live
  // file by a schema migration. This is the honest counter to
  // "appended" — rows can leave the live file as long as they land in
  // the archive, and we want to surface that in the success message.
  let rotated = 0;
  for (const row of baseRows) if (!headRowSet.has(row)) rotated++;
  const archiveNote = archiveFiles.length
    ? ` (audit trail spans live + ${archiveFiles.length} archive file${archiveFiles.length === 1 ? '' : 's'})`
    : '';
  const parts = [];
  if (added > 0) parts.push(`${added} row(s) appended`);
  if (rotated > 0) parts.push(`${rotated} row(s) rotated to archive`);
  const summary = parts.length ? `; ${parts.join(', ')}` : '';
  console.log(`✓ All ${baseRows.length} base rows preserved${summary}.${archiveNote}`);
  process.exit(0);
}

console.error(
  `❌ ${missing.length} row(s) from base reviewed.tsv are missing from the audit trail in this PR:`,
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
console.error('removed, or reordered.');
console.error('');
console.error('If a row needs to live in a different format (schema migration), use');
console.error('the rotation pattern: copy reviewed.tsv to audit/links/archive/');
console.error('reviewed.<date>.tsv first, THEN rewrite the live file. The check');
console.error('looks in archive/ too, so rotated rows still count as preserved.');
console.error('');
console.error('If you need to correct a typo in a row, append a NEW row that');
console.error("supersedes the original. Don't edit history in place.");
console.error('');
console.error('See audit/links/README.md for the rotation pattern + unified-');
console.error('resolution-log convention.');
process.exit(1);
