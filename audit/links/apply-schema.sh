#!/usr/bin/env bash
# Apply worker/schema.sql to a target D1 database (creates tables if they
# don't already exist; safe to re-run because the schema uses
# CREATE TABLE IF NOT EXISTS).
#
# Usage:
#   ./audit/links/apply-schema.sh <env>           # env: prod, develop, local
#
# For --remote ops (prod, develop), wrap with op run so wrangler picks up
# the API token + account ID from .env.audit:
#   op run --env-file=.env.audit -- ./audit/links/apply-schema.sh develop
#
# Or via yarn (which wraps automatically):
#   yarn db:apply-schema develop
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
source "$(dirname "$0")/d1-env.sh"

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  cat >&2 <<EOF
Usage: $0 <env>
  env: prod, develop, local
Examples:
  $0 develop                                                # locally signed in to wrangler
  op run --env-file=.env.audit -- $0 develop                # explicit token wrap
  yarn db:apply-schema develop                              # easiest
EOF
  exit 1
fi

resolve_d1_env "$TARGET"

if args_have_remote "${WRANGLER_ARGS[@]}"; then
  require_remote_token
fi

# Soft guard before clobbering prod. Schema is idempotent, but typos happen.
if [ "$TARGET" = "prod" ]; then
  echo "⚠️  About to apply schema to PRODUCTION D1 ($DB_NAME)."
  read -r -p "    Type 'yes' to proceed: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

echo "→ Applying worker/schema.sql to $TARGET ($DB_NAME)..."
npx wrangler d1 execute "$DB_NAME" "${WRANGLER_ARGS[@]}" --file=worker/schema.sql

echo ""
echo "✨ Schema applied to $TARGET."
