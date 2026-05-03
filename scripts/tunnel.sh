#!/usr/bin/env bash
# Run the Vite dev server and expose it through the named Cloudflare tunnel
# `budget-dev`, routed to dev.thebudgetatlas.com. Stable URL, works over
# cellular, gives you HTTPS for free.
#
# Setup (one time):
#   brew install cloudflared
#   cloudflared tunnel login
#   cloudflared tunnel create budget-dev
#   cloudflared tunnel route dns budget-dev dev.thebudgetatlas.com
#
# Requires: cloudflared on PATH, ~/.cloudflared/<tunnel-id>.json present.

set -euo pipefail

PORT="${PORT:-5173}"
TUNNEL_NAME="${TUNNEL_NAME:-budget-dev}"

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
yarn start --port "$PORT" &

# Give Vite a moment to bind before cloudflared tries to forward.
sleep 1

# `--url` overrides any ingress config and forwards all tunnel traffic to
# the local Vite port. Simpler than maintaining ~/.cloudflared/config.yml
# for a single-service dev tunnel.
cloudflared tunnel --url "http://localhost:$PORT" run "$TUNNEL_NAME" &

wait
