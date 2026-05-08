#!/usr/bin/env node
/**
 * CI check: every PR must either modify AI_TIME_LOG.md (the pre-merge
 * ritual — append a row for the work being shipped) or include the
 * marker `[skip-time-log]` in any commit message in the PR (escape
 * hatch for trivial / dependabot / non-author PRs).
 *
 * Skips entirely on push-to-main (this is a PR-only convention).
 *
 * Reads AUDIT_BASE_REF from the environment (set by the CI workflow
 * to `origin/<base>` on PRs).
 */

import { execSync } from 'node:child_process';

const baseRef = process.env.AUDIT_BASE_REF;
const eventName = process.env.GITHUB_EVENT_NAME;

if (eventName === 'push') {
  console.log('Push event — AI time log check skipped (PR-only convention).');
  process.exit(0);
}

if (!baseRef) {
  console.error('AUDIT_BASE_REF not set; cannot determine PR diff range.');
  process.exit(1);
}

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

let changedFiles;
try {
  changedFiles = sh(`git diff --name-only ${baseRef}...HEAD`).split('\n').filter(Boolean);
} catch (err) {
  console.error(`Failed to compute diff against ${baseRef}:`, err.message);
  process.exit(1);
}

if (changedFiles.includes('AI_TIME_LOG.md')) {
  console.log('AI_TIME_LOG.md modified in this PR. ✓');
  process.exit(0);
}

let commitMessages;
try {
  commitMessages = sh(`git log ${baseRef}..HEAD --format=%B`);
} catch (err) {
  console.error(`Failed to read commit messages in ${baseRef}..HEAD:`, err.message);
  process.exit(1);
}

if (commitMessages.includes('[skip-time-log]')) {
  console.log('[skip-time-log] marker found in a commit message. ✓');
  process.exit(0);
}

console.error(`
AI time log row missing.

This PR doesn't add a row to AI_TIME_LOG.md. The pre-merge ritual is:
update AI_TIME_LOG.md with a row for this PR's work as part of the
deliverable, not stitched in post-merge.

To resolve, pick one:

  1. Append a row to AI_TIME_LOG.md with this PR's solo / AI / saved
     numbers (newest at the top, above the most recent existing row).
     The PR's "## AI time log" section in the description is the
     running estimate; the row is the final state at merge.

  2. If this PR doesn't warrant a time-log row (typo fix, Dependabot
     bump, non-author contribution), include "[skip-time-log]" in any
     commit message in the PR. The check passes when the marker is
     anywhere in the commit history of the PR.

Convention codified in CLAUDE.md (§ AI process conventions) and
AI_TIME_LOG.md (preamble).
`);
process.exit(1);
