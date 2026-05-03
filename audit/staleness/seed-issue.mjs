#!/usr/bin/env node
// Source-review staleness check.
//
// For each cited source in the registry, computes when its next human review
// is due based on tier-specific thresholds and the most recent review date
// (falling back to `addedAt` for sources that have never been reviewed). If
// the threshold has passed, the source is "overdue."
//
// Maintains a single rolling GitHub issue with the `audit:staleness` label:
//
//   - 0 overdue + no open issue          → no-op
//   - 0 overdue + open issue exists      → close it with a "queue clear" comment
//   - >0 overdue + no open issue         → create the rolling issue
//   - >0 overdue + open issue exists     → edit title + body in place
//
// The single-issue model means notifications and assignments stay attached
// across weeks of operation. Editing is non-destructive; checkboxes in the
// body are aspirational visual that resets each run.
//
// Tier thresholds:
//   original    90 days   (direct from agency / data publisher)
//   reference   180 days  (operational handbooks, agency landing pages, surveys)
//   estimate    365 days  (approximations flagged honestly)
//
// Never-reviewed sources are overdue from day one — no `addedAt` grace
// period. The audit's job is to represent how much human verification has
// actually happened. The paired discipline (any change to sources.ts also
// appends a row to reviewed.tsv in the same PR) means the queue stays
// honest: AI-proposed citations and human edits where the verification step
// got skipped both surface immediately.
//
// Usage:
//   node audit/staleness/seed-issue.mjs            # update the rolling issue
//   node audit/staleness/seed-issue.mjs --dry-run  # print what would happen
//
// Auth:
//   Requires the gh CLI authenticated. In GitHub Actions, GITHUB_TOKEN with
//   issues:write permission suffices.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SOURCES_TS = resolve(ROOT, 'src/data/sources.ts');
const REVIEWED_TSV = resolve(ROOT, 'audit/links/reviewed.tsv');
const REPO = 'TheBudgetAtlas/thebudgetatlas';
const LABEL = 'audit:staleness';

const THRESHOLDS_DAYS = {
  original: 90,
  reference: 180,
  estimate: 365,
};
const DEFAULT_THRESHOLD_DAYS = 180;

const TODAY = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const DRY_RUN = process.argv.includes('--dry-run');

// ── 1. Parse sources.ts to build id → { url, label, tier, addedAt } ──────
//
// Sources live in two structural shapes inside sources.ts:
//
//   const RAW_SOURCES = { 'foo-bar': { ... }, ... }                top-level
//   const RAW_STATE_DOR: Record<...> = { AL: { ... }, ... }        state map
//
// Top-level entries' ids are the outer record keys verbatim. State-map
// entries' ids are synthesized as `state-${kind}-${code.toLowerCase()}` to
// match how src/data/sources.ts wraps them via `withStateIds(kind, RAW_*)`.
// Track which RAW block we're inside as we scan, then synthesize ids on
// entry close so reviews can be keyed off them.
const STATE_KIND_BY_DECL = {
  RAW_SOURCES: 'top',
  RAW_STATE_DOR: 'dor',
  RAW_STATE_SNAP_AGENCY: 'snap',
  RAW_STATE_MEDICAID_AGENCY: 'medicaid',
  RAW_STATE_CHIP_AGENCY: 'chip',
};

function parseSources() {
  const text = readFileSync(SOURCES_TS, 'utf8');
  const meta = new Map();

  let block = null; // 'top' | 'dor' | 'snap' | 'medicaid' | 'chip' | null
  let pendingKey = null;
  let pendingFields = null;
  let inEntry = false;

  for (const raw of text.split('\n')) {
    const line = raw;

    // Block starts (column-0 const declaration).
    const blockMatch = /^(?:export\s+)?const\s+(RAW_\w+)\s*[:=]/.exec(line);
    if (blockMatch) {
      block = STATE_KIND_BY_DECL[blockMatch[1]] ?? null;
      pendingKey = null;
      pendingFields = null;
      inEntry = false;
      continue;
    }

    // Block end (column-0 closing brace, with or without `as const ...`).
    if (block && /^\}/.test(line) && !inEntry) {
      block = null;
      continue;
    }

    if (!block) continue;

    // Detect entry start while we're between entries.
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

    // Inside an entry — capture the four fields we care about.
    const url = /url:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (url) pendingFields.url = url[1];
    const label = /label:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (label) pendingFields.label = label[1];
    const tier = /tier:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (tier) pendingFields.tier = tier[1];
    const addedAt = /addedAt:\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (addedAt) pendingFields.addedAt = addedAt[1];

    // Entry close — commit and reset. Match `  },` or `  }` at typical indent.
    if (/^\s{2,4}\},?\s*$/.test(line)) {
      const id = block === 'top' ? pendingKey : `state-${block}-${pendingKey.toLowerCase()}`;
      meta.set(id, {
        url: pendingFields.url ?? null,
        label: pendingFields.label ?? id,
        tier: pendingFields.tier ?? null,
        addedAt: pendingFields.addedAt ?? null,
      });
      pendingKey = null;
      pendingFields = null;
      inEntry = false;
    }
  }
  return meta;
}

// ── 2. Parse reviewed.tsv to build id → latest review ISO date ───────────
function parseLatestReviews() {
  const map = new Map();
  try {
    for (const line of readFileSync(REVIEWED_TSV, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
      const [id, date] = line.split('\t');
      if (!id || !date) continue;
      const existing = map.get(id);
      if (!existing || date > existing) map.set(id, date);
    }
  } catch {
    // No reviewed.tsv yet — fine.
  }
  return map;
}

// ── 3. Compute overdue list ──────────────────────────────────────────────
// A source is overdue if it doesn't have a review row in reviewed.tsv that's
// within its tier-specific threshold. Two ways to qualify:
//
//   1. Never reviewed at all → overdue from day one (we surface this honestly
//      rather than hiding it with a soft-start). `daysSinceAdded` reports
//      how long the citation has gone unverified.
//   2. Reviewed, but the most recent review is older than the threshold →
//      overdue by the difference.
//
// The honest framing matters: the audit's job is to represent how much human
// verification has happened. Counting `addedAt` as a free pass would launder
// "we wrote this down" into "a human verified it," which it isn't.
function computeOverdue(sourceMeta, latestReviews) {
  const overdue = [];
  for (const [id, { url, label, tier, addedAt }] of sourceMeta) {
    const tierName = tier ?? 'unspecified';
    const thresholdDays = THRESHOLDS_DAYS[tier] ?? DEFAULT_THRESHOLD_DAYS;
    const latestReview = latestReviews.get(id);

    if (!latestReview) {
      // Never reviewed → overdue, with `daysSinceAdded` for triage signal.
      let daysSinceAdded = null;
      if (addedAt) {
        const addedDate = new Date(addedAt + 'T00:00:00Z');
        if (!Number.isNaN(addedDate.valueOf())) {
          daysSinceAdded = Math.floor((TODAY - addedDate) / 86400000);
        }
      }
      overdue.push({
        id,
        url,
        label,
        tier: tierName,
        thresholdDays,
        wasReviewed: false,
        addedAt,
        daysSinceAdded,
        daysOverdue: daysSinceAdded ?? 0,
      });
      continue;
    }

    // Has a review — check whether it's stale.
    const reviewDate = new Date(latestReview + 'T00:00:00Z');
    if (Number.isNaN(reviewDate.valueOf())) continue;
    const dueDate = new Date(reviewDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + thresholdDays);
    if (TODAY > dueDate) {
      const daysOverdue = Math.floor((TODAY - dueDate) / 86400000);
      overdue.push({
        id,
        url,
        label,
        tier: tierName,
        thresholdDays,
        wasReviewed: true,
        lastReview: latestReview,
        daysOverdue,
      });
    }
  }

  // Sort: never-reviewed first (most damning), then stale-reviewed by days
  // overdue, all grouped by tier (original first).
  const tierOrder = { original: 0, reference: 1, estimate: 2, unspecified: 3 };
  overdue.sort(
    (a, b) =>
      (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99) ||
      Number(b.wasReviewed === false) - Number(a.wasReviewed === false) ||
      b.daysOverdue - a.daysOverdue ||
      a.label.localeCompare(b.label),
  );
  return overdue;
}

// ── 4. Build issue title + body ──────────────────────────────────────────
function buildTitle(overdue) {
  const counts = { original: 0, reference: 0, estimate: 0, unspecified: 0 };
  for (const r of overdue) counts[r.tier]++;
  const parts = [];
  if (counts.original) parts.push(`${counts.original} original`);
  if (counts.reference) parts.push(`${counts.reference} reference`);
  if (counts.estimate) parts.push(`${counts.estimate} estimate`);
  if (counts.unspecified) parts.push(`${counts.unspecified} untiered`);
  const breakdown = parts.length ? ` (${parts.join(', ')})` : '';
  return `Source review queue: ${overdue.length} overdue${breakdown}`;
}

function buildBody(overdue, checkedUrls) {
  const byTier = { original: [], reference: [], estimate: [], unspecified: [] };
  for (const r of overdue) byTier[r.tier].push(r);

  const lines = [
    `## Overdue source reviews — ${overdue.length} total`,
    ``,
    `These citations need a human eyeball pass — open the URL, verify the destination still cites what we claim, then append a row to [\`audit/links/reviewed.tsv\`](https://github.com/${REPO}/blob/main/audit/links/reviewed.tsv) with \`kind=human\` describing what you saw. (Eyes-on-source is the whole point of the staleness sweep — that's why human-only here, even though \`kind=ai\` is fine elsewhere in the audit.)`,
    ``,
    `**Use the checkboxes to claim work in progress** — checking a box says "I'm reviewing this." Claim state is preserved across weekly regenerates, so once you check, it stays checked until your review row lands and the item drops off the list.`,
    ``,
    `If you find a problem with a citation (broken URL, drifted content, no longer backs claim), file an [\`audit:report\`](https://github.com/${REPO}/issues/new?template=source-report.yml) instead.`,
    ``,
    `### Tier review thresholds`,
    ``,
    `| Tier | Threshold | Rationale |`,
    `| --- | ---: | --- |`,
    `| Primary | 90 days | Direct from agency / data publisher; high-stakes if drifted |`,
    `| Secondary | 180 days | Operational handbooks, agency landing pages, surveys |`,
    `| Editorial | 365 days | Approximations flagged honestly; lower drift sensitivity |`,
    ``,
  ];

  const renderTier = (name, items) => {
    if (items.length === 0) return [];
    const neverReviewed = items.filter((r) => !r.wasReviewed);
    const stale = items.filter((r) => r.wasReviewed);
    const out = [`### ${name[0].toUpperCase() + name.slice(1)} (${items.length})`, ``];
    if (neverReviewed.length > 0) {
      out.push(`**Never reviewed (${neverReviewed.length})**`, ``);
      for (const r of neverReviewed) {
        const ageHint =
          r.daysSinceAdded != null ? `added ${r.daysSinceAdded} days ago` : `added unknown`;
        const mark = checkedUrls.has(r.url) ? 'x' : ' ';
        out.push(`- [${mark}] **[${r.label}](${r.url})** — ${ageHint}`);
      }
      out.push('');
    }
    if (stale.length > 0) {
      out.push(`**Stale review (${stale.length})**`, ``);
      for (const r of stale) {
        const mark = checkedUrls.has(r.url) ? 'x' : ' ';
        out.push(
          `- [${mark}] **[${r.label}](${r.url})** — last reviewed ${r.lastReview} (${r.daysOverdue} days overdue)`,
        );
      }
      out.push('');
    }
    return out;
  };

  lines.push(...renderTier('original', byTier.original));
  lines.push(...renderTier('reference', byTier.reference));
  lines.push(...renderTier('estimate', byTier.estimate));
  if (byTier.unspecified.length) lines.push(...renderTier('untiered', byTier.unspecified));

  lines.push(
    `---`,
    ``,
    `_Auto-refreshed weekly by [\`.github/workflows/audit-staleness.yml\`](https://github.com/${REPO}/blob/main/.github/workflows/audit-staleness.yml). The list shrinks as resolutions land in \`reviewed.tsv\`. Checked items persist across regenerates so claims survive the week._`,
  );

  return lines.join('\n');
}

// ── 5. gh CLI helpers ────────────────────────────────────────────────────
function sh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function findOpenStaleness() {
  const out = sh([
    'issue',
    'list',
    '--repo',
    REPO,
    '--label',
    LABEL,
    '--state',
    'open',
    '--limit',
    '5',
    '--json',
    'number,title,body',
  ]);
  const issues = JSON.parse(out || '[]');
  return issues[0] ?? null;
}

// Extract URLs that were checked (`[x]`) in the existing body, so claim-
// state ("I'm working on this") survives weekly regenerates.
function extractCheckedUrls(existingBody) {
  if (!existingBody) return new Set();
  const checked = new Set();
  const re = /^- \[x\] \*\*\[[^\]]+\]\((https?:\/\/[^)]+)\)/gim;
  let m;
  while ((m = re.exec(existingBody)) !== null) checked.add(m[1]);
  return checked;
}

// ── Main ─────────────────────────────────────────────────────────────────
const sourceMeta = parseSources();
const latestReviews = parseLatestReviews();
const overdue = computeOverdue(sourceMeta, latestReviews);

console.log(
  `→ ${sourceMeta.size} sources · ${latestReviews.size} reviewed · ${overdue.length} overdue`,
);

const existing = findOpenStaleness();

if (overdue.length === 0) {
  if (existing) {
    console.log(`→ Closing existing issue #${existing.number} (queue clear)`);
    if (!DRY_RUN) {
      sh([
        'issue',
        'comment',
        String(existing.number),
        '--repo',
        REPO,
        '--body',
        '🎉 Source review queue is clear — no citations are overdue. The next weekly check will reopen this if anything ages out.',
      ]);
      sh(['issue', 'close', String(existing.number), '--repo', REPO, '--reason', 'completed']);
    }
  } else {
    console.log('→ No overdue items, no existing issue. Nothing to do.');
  }
  process.exit(0);
}

const checkedUrls = extractCheckedUrls(existing?.body);
if (checkedUrls.size > 0) {
  console.log(`→ Preserving ${checkedUrls.size} checked claim(s) from existing body.`);
}
const title = buildTitle(overdue);
const body = buildBody(overdue, checkedUrls);

if (DRY_RUN) {
  console.log(`\n--- WOULD ${existing ? 'EDIT #' + existing.number : 'CREATE'} ---`);
  console.log(`Title: ${title}`);
  console.log(`\nBody:\n${body}`);
  process.exit(0);
}

let issueNumber;
if (existing) {
  console.log(`→ Updating existing issue #${existing.number}`);
  sh(['issue', 'edit', String(existing.number), '--repo', REPO, '--title', title, '--body', body]);
  issueNumber = String(existing.number);
} else {
  console.log(`→ Creating new staleness issue`);
  const url = sh([
    'issue',
    'create',
    '--repo',
    REPO,
    '--title',
    title,
    '--body',
    body,
    '--label',
    LABEL,
  ]);
  issueNumber = url.trim().split('/').pop();
}

// Pin the rolling issue so it stays at the top of the issues list. Pinning
// an already-pinned issue is idempotent. GitHub allows up to 3 pinned
// issues per repo; if pinning fails (e.g. quota), warn but don't fail the
// workflow — the issue still exists and will be re-pinned next run if
// quota frees up.
try {
  sh(['issue', 'pin', issueNumber, '--repo', REPO]);
  console.log(`→ Pinned #${issueNumber} at the top of issues.`);
} catch {
  console.warn(
    `⚠️  Could not pin issue #${issueNumber} (likely the 3-pinned-issues quota). ` +
      `Issue exists and will be re-pinned next run if quota frees up.`,
  );
}

console.log(`✨ Done.`);
