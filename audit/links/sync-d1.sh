#!/usr/bin/env bash
# Snapshot one D1 database into another (schema + data). Replaces the
# old sync-d1-from-prod.sh — same prod→local default, plus the missing
# combinations like prod→develop and develop→local.
#
# Usage:
#   ./audit/links/sync-d1.sh [<source>] [<destination>]
#
# Each is one of: prod, develop, local. Defaults: prod → local.
# Refuses to write to prod (no path here ever overwrites production).
#
# For --remote ops (any side that's prod or develop), wrap with op run so
# wrangler picks up the API token + account ID from .env.audit:
#   op run --env-file=.env.audit -- ./audit/links/sync-d1.sh prod develop
#
# Or via yarn (which wraps automatically):
#   yarn db:sync                       # default prod → local
#   yarn db:sync prod develop          # snapshot prod into develop
#   yarn db:sync develop local         # snapshot develop into local
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
source "$(dirname "$0")/d1-env.sh"

SRC="${1:-prod}"
DST="${2:-local}"

if [ "$SRC" = "$DST" ]; then
  echo "✘ Source and destination cannot both be '$SRC'." >&2
  exit 1
fi

if [ "$DST" = "prod" ]; then
  echo "✘ Refusing to write to prod. This script is one-way away from prod." >&2
  exit 1
fi

# Resolve source first into local vars (so the next call doesn't clobber).
resolve_d1_env "$SRC"
SRC_ARGS=("${WRANGLER_ARGS[@]}")
SRC_DB="$DB_NAME"

resolve_d1_env "$DST"
DST_ARGS=("${WRANGLER_ARGS[@]}")
DST_DB="$DB_NAME"

# If either side is --remote, we need the API token in env.
if args_have_remote "${SRC_ARGS[@]}" || args_have_remote "${DST_ARGS[@]}"; then
  require_remote_token
fi

DUMP="$(mktemp -t budget-atlas-d1-sync.XXXXXX).sql"
trap 'rm -f "$DUMP"' EXIT INT TERM

echo "→ Exporting $SRC ($SRC_DB) to $DUMP..."
npx wrangler d1 export "$SRC_DB" "${SRC_ARGS[@]}" --output="$DUMP"

echo ""
echo "→ Wiping $DST ($DST_DB) tables..."
npx wrangler d1 execute "$DST_DB" "${DST_ARGS[@]}" \
  --command="DROP TABLE IF EXISTS audit_results; DROP TABLE IF EXISTS audit_runs;"

echo ""
echo "→ Applying dump to $DST ($DST_DB)..."
npx wrangler d1 execute "$DST_DB" "${DST_ARGS[@]}" --file="$DUMP"

echo ""
echo "✨ $DST now mirrors $SRC."
