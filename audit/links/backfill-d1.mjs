#!/usr/bin/env node
// Seed the audit-backend D1 database from existing dated TSVs.
//
// One-shot bootstrap: reads every audit/links/results/YYYY-MM-DD.tsv and
// POSTs each as a run. Idempotent (the worker upserts), so re-running is
// safe.
//
// Usage:
//   API_BASE=https://thebudgetatlas.com \
//     AUDIT_WRITE_TOKEN=... \
//     node audit/links/backfill-d1.mjs
//
//   # Dry-run prints what would be sent without hitting the network.
//   node audit/links/backfill-d1.mjs --dry-run

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = resolve(__dirname, 'results');

const DRY_RUN = process.argv.includes('--dry-run');
const API_BASE = process.env.API_BASE ?? 'https://thebudgetatlas.com';
const TOKEN = process.env.AUDIT_WRITE_TOKEN;

if (!DRY_RUN && !TOKEN) {
  console.error('AUDIT_WRITE_TOKEN env var required (or pass --dry-run).');
  process.exit(1);
}

const dated = readdirSync(RESULTS_DIR)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.tsv$/.test(f))
  .sort();

console.log(`→ Found ${dated.length} dated TSVs to backfill.`);

for (const file of dated) {
  const runDate = file.replace('.tsv', '');
  const text = readFileSync(resolve(RESULTS_DIR, file), 'utf8');
  const results = text
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [status, url, final_url] = line.split('\t');
      return { status, url, final_url: final_url || null };
    });

  if (DRY_RUN) {
    console.log(`  ${runDate}: ${results.length} rows (dry-run)`);
    continue;
  }

  const res = await fetch(`${API_BASE}/api/audit/runs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ run_date: runDate, results }),
  });
  if (!res.ok) {
    console.error(`  ${runDate}: FAILED (${res.status} ${res.statusText})`);
    console.error(await res.text());
    process.exit(1);
  }
  const body = await res.json();
  console.log(`  ${runDate}: ${body.inserted} rows`);
}

console.log('✨ Done.');
