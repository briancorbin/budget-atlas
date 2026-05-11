#!/usr/bin/env bash
# Run the Vite dev server and expose it through the named Cloudflare tunnel
# `budget-local`, routed to local.thebudgetatlas.com. Stable URL, works over
# cellular, gives you HTTPS for free. The "local" naming distinguishes this
# from `develop` (the long-lived staging Worker at develop.thebudgetatlas.com).
#
# Setup (one time):
#   brew install cloudflared
#   cloudflared tunnel login
#   cloudflared tunnel create budget-local
#   cloudflared tunnel route dns budget-local local.thebudgetatlas.com
#
# Requires: cloudflared on PATH, ~/.cloudflared/<tunnel-id>.json present.

set -euo pipefail

PORT="${PORT:-5173}"
TUNNEL_NAME="${TUNNEL_NAME:-budget-local}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install with: brew install cloudflared" >&2
  exit 1
fi

# Kill the whole process group on Ctrl+C so the tunnel doesn't outlive Vite
# (or vice-versa). Without this, one process exits and the other keeps
# running in the background.
trap 'kill 0' SIGINT SIGTERM EXIT

# Start Vite bound to localhost — only the tunnel sees it; we don't want it
# on the LAN at the same time.
# --strictPort is required here: if Vite drifts to the next free port,
# cloudflared would silently forward to a dead one. Fail loud instead.
yarn start --port "$PORT" --strictPort &

# Give Vite a moment to bind before cloudflared tries to forward.
sleep 1

# `--url` overrides any ingress config and forwards all tunnel traffic to
# the local Vite port. Simpler than maintaining ~/.cloudflared/config.yml
# for a single-service dev tunnel.
cloudflared tunnel --url "http://localhost:$PORT" run "$TUNNEL_NAME" &

wait
