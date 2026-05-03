#!/usr/bin/env bash
# Audit external links cited from the codebase.
#
# Extracts every http(s) URL from source files, hits each with curl, and joins
# in any human-review records from `reviewed.tsv`. Writes a dated TSV to
# `results/` with columns:
#
#   status, url, final_url, reviewed_at, reviewed_by, review_notes
#
# Curl tells us if a link loads; only a human can tell us whether the loaded
# page still cites what we claim it cites. Both columns matter.
#
# Usage:
#   ./audit/links/check.sh
#   yarn check-links
#
# Requires: bash, curl, grep, xargs, awk.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
DATE="$(date -u +%Y-%m-%d)"
DIR="$ROOT/audit/links"
OUTDIR="$DIR/results"
OUT="$OUTDIR/$DATE.tsv"
REVIEWS="$DIR/reviewed.tsv"
mkdir -p "$OUTDIR"

UA="Mozilla/5.0 (compatible; BudgetAtlas-link-audit; +https://github.com/TheBudgetAtlas/thebudgetatlas)"

URLS_FILE=$(mktemp)
RAW_FILE=$(mktemp)
trap 'rm -f "$URLS_FILE" "$RAW_FILE"' EXIT

echo "→ Extracting URLs from src/data/sources.ts (the citation registry)..."
# Only check the citation registry. Non-citation URLs in the codebase (font CDN
# preconnects, repo references, build artifacts, settings files, etc.) are
# deliberately excluded by sourcing this from one place rather than greping
# the whole tree. See src/data/sources.ts for the registry rationale.
grep -Eo 'https?://[^ )"`'"'"'<>]+' "$ROOT/src/data/sources.ts" \
  | sort -u > "$URLS_FILE"

COUNT=$(wc -l < "$URLS_FILE" | tr -d ' ')
echo "→ Found $COUNT unique URLs. Checking (curl, 20s timeout, 20× parallel)..."

check_one() {
  local url="$1"
  local status final
  status=$(curl -L -s -o /dev/null -w "%{http_code}" -m 20 -A "$UA" "$url" 2>/dev/null || echo "ERR")
  final=$(curl -L -s -o /dev/null -w "%{url_effective}" -m 20 -A "$UA" "$url" 2>/dev/null || echo "")
  # Each line is well under PIPE_BUF, so concurrent appends are atomic.
  printf '%s\t%s\t%s\n' "$status" "$url" "$final" >> "$RAW_FILE"
}

# Run with bounded concurrency. xargs -P on macOS chokes on long arg lists,
# so spawn jobs directly and wait every N to keep ~N in flight.
: > "$RAW_FILE"
N=20
running=0
while IFS= read -r url; do
  [ -z "$url" ] && continue
  check_one "$url" &
  running=$((running + 1))
  if [ "$running" -ge "$N" ]; then
    wait
    running=0
  fi
done < "$URLS_FILE"
wait

# Sort the raw curl output deterministically by URL so identical runs produce
# byte-identical TSVs and git diffs only show real changes (parallel curl
# writes finish in non-deterministic order otherwise).
LC_ALL=C sort -t$'\t' -k2,2 -o "$RAW_FILE" "$RAW_FILE"

# Join reviews (URL -> reviewed_at, reviewed_by, notes) into the raw curl output.
# reviewed.tsv format: url \t YYYY-MM-DD \t reviewer \t notes (tab-separated)
# Lines starting with # in reviewed.tsv are comments.
{
  printf 'status\turl\tfinal_url\treviewed_at\treviewed_by\treview_notes\n'
  awk -F'\t' -v REV="$REVIEWS" '
    BEGIN {
      if (REV != "" && (getline line < REV) >= 0) {
        close(REV)
        while ((getline line < REV) > 0) {
          if (line ~ /^#/ || line == "") continue
          n = split(line, parts, "\t")
          url = parts[1]
          rev_at[url]   = (n >= 2) ? parts[2] : ""
          rev_by[url]   = (n >= 3) ? parts[3] : ""
          rev_notes[url] = (n >= 4) ? parts[4] : ""
        }
        close(REV)
      }
    }
    {
      u = $2
      printf "%s\t%s\t%s\t%s\t%s\t%s\n", $1, $2, $3, rev_at[u], rev_by[u], rev_notes[u]
    }
  ' "$RAW_FILE"
} > "$OUT"

echo ""
echo "→ Status distribution:"
awk -F'\t' 'NR>1 {print $1}' "$OUT" | sort | uniq -c | sort -rn
echo ""
REVIEWED=$(awk -F'\t' 'NR>1 && $4 != "" {c++} END {print c+0}' "$OUT")
echo "→ Human-reviewed: $REVIEWED / $COUNT"
echo ""
echo "→ Hard 404s:"
awk -F'\t' 'NR>1 && $1=="404" {print "  "$2}' "$OUT" || true
echo ""
echo "→ Results: $OUT"
echo ""
echo "Status code interpretation:"
echo "  200       — loaded; verify the destination still cites the claimed content"
echo "  3xx       — followed a redirect; final URL recorded in column 3"
echo "  403/999   — bot-blocked by the server; usually fine in a real browser"
echo "  404       — page is gone; needs a replacement citation or removal"
echo "  000/ERR   — DNS/TLS/timeout; needs a manual browser check"
echo ""
echo "To record a manual review, add a row to audit/links/reviewed.tsv."
