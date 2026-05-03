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
//   primary    90 days   (direct from agency / data publisher)
//   secondary  180 days  (operational handbooks, agency landing pages, surveys)
//   editorial  365 days  (approximations flagged honestly)
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
  primary: 90,
  secondary: 180,
  editorial: 365,
};
const DEFAULT_THRESHOLD_DAYS = 180;

const TODAY = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const DRY_RUN = process.argv.includes('--dry-run');

// ── 1. Parse sources.ts to build URL → { label, tier, addedAt } ──────────
function parseSources() {
  const text = readFileSync(SOURCES_TS, 'utf8');
  const meta = new Map();
  let pendingLabel = null;
  let labelOnNextLine = false;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (labelOnNextLine) {
      const m = line.match(/^['"`]([^'"`]+)['"`]/);
      if (m) {
        pendingLabel = m[1];
        labelOnNextLine = false;
        continue;
      }
    }

    let m = line.match(/^label:\s*['"`]([^'"`]+)['"`]/);
    if (m) {
      pendingLabel = m[1];
      continue;
    }
    if (/^label:\s*$/.test(line)) {
      labelOnNextLine = true;
      continue;
    }
    m = line.match(/label:\s*['"`]([^'"`]+)['"`]/);
    if (m) pendingLabel = m[1];

    const urlMatch = line.match(/url:\s*['"`]([^'"`]+)['"`]/);
    if (urlMatch) {
      const url = urlMatch[1];
      const tier = line.match(/tier:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null;
      const addedAt = line.match(/addedAt:\s*['"`]([^'"`]+)['"`]/)?.[1] ?? null;
      meta.set(url, { label: pendingLabel ?? url, tier, addedAt });
    }

    const lastUrl = [...meta.keys()].pop();
    if (!lastUrl) continue;
    const existing = meta.get(lastUrl);
    if (!existing) continue;

    const tierLine = line.match(/^tier:\s*['"`]([^'"`]+)['"`]/);
    if (tierLine && !existing.tier) {
      meta.set(lastUrl, { ...existing, tier: tierLine[1] });
    }
    const addedAtLine = line.match(/^addedAt:\s*['"`]([^'"`]+)['"`]/);
    if (addedAtLine && !existing.addedAt) {
      meta.set(lastUrl, { ...meta.get(lastUrl), addedAt: addedAtLine[1] });
    }
  }
  return meta;
}

// ── 2. Parse reviewed.tsv to build URL → latest review ISO date ──────────
function parseLatestReviews() {
  const map = new Map();
  try {
    for (const line of readFileSync(REVIEWED_TSV, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || line.startsWith('url\t')) continue;
      const [url, date] = line.split('\t');
      if (!url || !date) continue;
      const existing = map.get(url);
      if (!existing || date > existing) map.set(url, date);
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
  for (const [url, { label, tier, addedAt }] of sourceMeta) {
    const tierName = tier ?? 'unspecified';
    const thresholdDays = THRESHOLDS_DAYS[tier] ?? DEFAULT_THRESHOLD_DAYS;
    const latestReview = latestReviews.get(url);

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
  // overdue, all grouped by tier (primary first).
  const tierOrder = { primary: 0, secondary: 1, editorial: 2, unspecified: 3 };
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
  const counts = { primary: 0, secondary: 0, editorial: 0, unspecified: 0 };
  for (const r of overdue) counts[r.tier]++;
  const parts = [];
  if (counts.primary) parts.push(`${counts.primary} primary`);
  if (counts.secondary) parts.push(`${counts.secondary} secondary`);
  if (counts.editorial) parts.push(`${counts.editorial} editorial`);
  if (counts.unspecified) parts.push(`${counts.unspecified} untiered`);
  const breakdown = parts.length ? ` (${parts.join(', ')})` : '';
  return `Source review queue: ${overdue.length} overdue${breakdown}`;
}

function buildBody(overdue) {
  const byTier = { primary: [], secondary: [], editorial: [], unspecified: [] };
  for (const r of overdue) byTier[r.tier].push(r);

  const lines = [
    `## Overdue source reviews — ${overdue.length} total`,
    ``,
    `These citations need a human eyeball pass — open the URL, verify the destination still cites what we claim, then append a row to [\`audit/links/reviewed.tsv\`](https://github.com/${REPO}/blob/main/audit/links/reviewed.tsv) describing what you saw. **No AI assistance.**`,
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
        out.push(`- [ ] **[${r.label}](${r.url})** — ${ageHint}`);
      }
      out.push('');
    }
    if (stale.length > 0) {
      out.push(`**Stale review (${stale.length})**`, ``);
      for (const r of stale) {
        out.push(
          `- [ ] **[${r.label}](${r.url})** — last reviewed ${r.lastReview} (${r.daysOverdue} days overdue)`,
        );
      }
      out.push('');
    }
    return out;
  };

  lines.push(...renderTier('primary', byTier.primary));
  lines.push(...renderTier('secondary', byTier.secondary));
  lines.push(...renderTier('editorial', byTier.editorial));
  if (byTier.unspecified.length) lines.push(...renderTier('untiered', byTier.unspecified));

  lines.push(
    `---`,
    ``,
    `_Auto-refreshed weekly by [\`.github/workflows/audit-staleness.yml\`](https://github.com/${REPO}/blob/main/.github/workflows/audit-staleness.yml). Checkboxes are aspirational visual — they reset when the issue body regenerates. The list shrinks as resolutions land in \`reviewed.tsv\`._`,
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
    'number,title',
  ]);
  const issues = JSON.parse(out || '[]');
  return issues[0] ?? null;
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

const title = buildTitle(overdue);
const body = buildBody(overdue);

if (DRY_RUN) {
  console.log(`\n--- WOULD ${existing ? 'EDIT #' + existing.number : 'CREATE'} ---`);
  console.log(`Title: ${title}`);
  console.log(`\nBody:\n${body}`);
  process.exit(0);
}

if (existing) {
  console.log(`→ Updating existing issue #${existing.number}`);
  sh(['issue', 'edit', String(existing.number), '--repo', REPO, '--title', title, '--body', body]);
} else {
  console.log(`→ Creating new staleness issue`);
  sh(['issue', 'create', '--repo', REPO, '--title', title, '--body', body, '--label', LABEL]);
}
console.log(`✨ Done.`);
