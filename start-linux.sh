#!/usr/bin/env bash
set -e

# Resolve application directory dynamically
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
export NEXYRIS_ROOT="$DIR"

echo "======================================================="
echo "        NEXYRIS LOCAL - PORTABLE AI STUDIO"
echo "    Your AI. Your Models. Your Drive. Your Data."
echo "======================================================="
echo "Portable Root: $NEXYRIS_ROOT"

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required to run Nexyris Local."
    exit 1
fi

if [ ! -d "$NEXYRIS_ROOT/node_modules" ]; then
    echo "[INFO] First-time launch: installing portable dependencies..."
    (cd "$NEXYRIS_ROOT" && npm install --omit=dev)
fi

PORT=38192
node "$NEXYRIS_ROOT/server/index.js" &
SERVER_PID=$!

trap "kill $SERVER_PID 2>/dev/null || true" EXIT

sleep 2

# Open in default browser or Chromium app mode
APP_URL="http://127.0.0.1:$PORT"
if command -v xdg-open &> /dev/null; then
    xdg-open "$APP_URL"
elif command -v google-chrome &> /dev/null; then
    google-chrome --app="$APP_URL"
fi

wait $SERVER_PID
