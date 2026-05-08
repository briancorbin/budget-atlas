#!/usr/bin/env node
/**
 * CI check: the "Running totals" row in AI_TIME_LOG.md must match the
 * sum of the Solo / With AI / Saved columns from the data rows above.
 * Catches the easy-to-miss case where someone adds a row but forgets
 * to recompute the totals.
 *
 * Tolerance: 0.01h to absorb rounding (entries like "0.17h" + "0.5h"
 * can produce a sum that's slightly off the printed total).
 *
 * Usage: `node scripts/check-ai-time-log-totals.mjs`. Wired into CI
 * as `ai-time-log-totals`.
 */

import { readFileSync } from 'node:fs';

const TOLERANCE = 0.01;

const text = readFileSync('AI_TIME_LOG.md', 'utf8');
const lines = text.split('\n');

const headerIdx = lines.findIndex((l) => /^\|\s*Date\s*\|.*PR.*Scope/i.test(l));
if (headerIdx === -1) {
  console.error('Could not find the data table header row in AI_TIME_LOG.md.');
  process.exit(1);
}

const totalsLineIdx = lines.findIndex((l) => /\|\s*Tracked rows above\s*\|/i.test(l));
if (totalsLineIdx === -1) {
  console.error('Could not find the "Tracked rows above" totals row in AI_TIME_LOG.md.');
  process.exit(1);
}

const parseHours = (cell) => {
  const m = cell.replace(/[*_~`]/g, '').trim().match(/^(-?[\d.]+)h$/);
  if (!m) return null;
  return parseFloat(m[1]);
};

const dataRows = [];
for (let i = headerIdx + 2; i < lines.length; i += 1) {
  const line = lines[i];
  if (!line.startsWith('|')) break;
  // Skip the alignment row (header separator)
  if (/^\|\s*-+/.test(line)) continue;
  // Skip if row's Date column doesn't look like a date or "(pre-PR)" — we want
  // to be permissive but stop before stray pipe-tables further down the file
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  if (cells.length < 8) continue;
  const solo = parseHours(cells[4]);
  const ai = parseHours(cells[5]);
  const saved = parseHours(cells[6]);
  if (solo === null || ai === null || saved === null) continue;
  dataRows.push({ solo, ai, saved, line: i + 1, scope: cells[2] });
}

if (dataRows.length === 0) {
  console.error('No data rows found in the AI_TIME_LOG.md table.');
  process.exit(1);
}

const sum = dataRows.reduce(
  (acc, r) => ({
    solo: acc.solo + r.solo,
    ai: acc.ai + r.ai,
    saved: acc.saved + r.saved,
  }),
  { solo: 0, ai: 0, saved: 0 },
);

const totalsCells = lines[totalsLineIdx]
  .split('|')
  .slice(1, -1)
  .map((c) => c.trim());

const declaredSolo = parseHours(totalsCells[1]);
const declaredAi = parseHours(totalsCells[2]);
const declaredSaved = parseHours(totalsCells[3]);

if (declaredSolo === null || declaredAi === null || declaredSaved === null) {
  console.error(
    `Could not parse the "Tracked rows above" totals row. Found: ${JSON.stringify(totalsCells)}`,
  );
  process.exit(1);
}

const fmt = (n) => n.toFixed(2).replace(/\.?0+$/, '') + 'h';
const off = (declared, computed) => Math.abs(declared - computed) > TOLERANCE;

const errors = [];
if (off(declaredSolo, sum.solo)) {
  errors.push(`  Solo:  declared ${fmt(declaredSolo)}, sum of rows ${fmt(sum.solo)}`);
}
if (off(declaredAi, sum.ai)) {
  errors.push(`  AI:    declared ${fmt(declaredAi)}, sum of rows ${fmt(sum.ai)}`);
}
if (off(declaredSaved, sum.saved)) {
  errors.push(`  Saved: declared ${fmt(declaredSaved)}, sum of rows ${fmt(sum.saved)}`);
}

if (errors.length === 0) {
  console.log(
    `AI_TIME_LOG.md totals match (${dataRows.length} rows; Solo ${fmt(sum.solo)}, AI ${fmt(
      sum.ai,
    )}, Saved ${fmt(sum.saved)}). ✓`,
  );
  process.exit(0);
}

console.error(`
AI time log totals don't match the sum of rows.

${errors.join('\n')}

Recompute the "Running totals" section at the bottom of AI_TIME_LOG.md
when adding or revising rows. The "Tracked rows above" row must equal
the sum of the Solo / With AI / Saved columns from the data table.

Multiplier ≈ Solo ÷ AI. Date in the section header should match today.
`);
process.exit(1);
