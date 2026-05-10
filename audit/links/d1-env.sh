#!/usr/bin/env bash
# Shared helpers for the D1 sync / schema-apply scripts. Sourced, not
# executed directly. Sets two globals for the requested env: WRANGLER_ARGS
# (array of flags to pass to wrangler) and DB_NAME (the database name as
# wrangler resolves it from wrangler.jsonc).
#
# Recognised envs:
#   prod    → --remote against budget-atlas-audit (top-level binding)
#   develop → --remote --env develop against budget-atlas-audit-develop
#   local   → --local --persist-to=.wrangler/state against budget-atlas-audit
#
# Usage:
#   source "$(dirname "$0")/d1-env.sh"
#   resolve_d1_env prod    # sets WRANGLER_ARGS and DB_NAME
#   require_remote_token   # fails fast with a helpful message if the env
#                          # vars needed for --remote ops aren't set

resolve_d1_env() {
  local env="$1"
  case "$env" in
    prod)
      WRANGLER_ARGS=(--remote)
      DB_NAME="budget-atlas-audit"
      ;;
    develop)
      WRANGLER_ARGS=(--remote --env develop)
      DB_NAME="budget-atlas-audit-develop"
      ;;
    local)
      WRANGLER_ARGS=(--local --persist-to=.wrangler/state)
      DB_NAME="budget-atlas-audit"
      ;;
    *)
      echo "✘ Unknown D1 env: '$env' (expected: prod, develop, local)" >&2
      return 1
      ;;
  esac
}

# Returns 0 if the given args array contains --remote, 1 otherwise.
args_have_remote() {
  local arg
  for arg in "$@"; do
    [ "$arg" = "--remote" ] && return 0
  done
  return 1
}

# Verify CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID are set. The OAuth
# token from `wrangler login` doesn't have access to the D1 --remote
# endpoints; you need a real API token, which lives in 1Password and is
# loaded into the env by `op run --env-file=.env.audit -- ...`.
require_remote_token() {
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    echo "✘ CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must both be set for --remote ops." >&2
    echo "   Wrap with: op run --env-file=.env.audit -- <command>" >&2
    return 1
  fi
}
