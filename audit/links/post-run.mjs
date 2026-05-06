#!/usr/bin/env node
// Post a single TSV run to the audit-backend API.
//
// Used by check.sh after a nightly audit completes (and by manual
// re-runs). Reads a TSV file, parses it into the API's JSON shape, and
// POSTs to /api/audit/runs with bearer auth.
//
// Usage:
//   AUDIT_WRITE_TOKEN=... node post-run.mjs <tsv-path> <YYYY-MM-DD>
//
// Exits 0 on 2xx, non-zero otherwise so check.sh can `if … then`.

import { readFileSync } from 'node:fs';

const [, , tsvPath, runDate] = process.argv;
if (!tsvPath || !runDate) {
  console.error('usage: post-run.mjs <tsv-path> <YYYY-MM-DD>');
  process.exit(2);
}

const TOKEN = process.env.AUDIT_WRITE_TOKEN;
const API_BASE = process.env.API_BASE ?? 'https://thebudgetatlas.com';
if (!TOKEN) {
  console.error('AUDIT_WRITE_TOKEN required');
  process.exit(2);
}

const text = readFileSync(tsvPath, 'utf8');
const results = text
  .split('\n')
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    const [status, url, final_url] = line.split('\t');
    return { status, url, final_url: final_url || null };
  });

const res = await fetch(`${API_BASE}/api/audit/runs`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ run_date: runDate, results }),
});
if (!res.ok) {
  console.error(`POST failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}
const body = await res.json();
console.log(`  inserted ${body.inserted} rows for ${body.run_date}`);
