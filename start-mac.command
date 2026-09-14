#!/usr/bin/env bash
set -e

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

PORT=38192
node "$NEXYRIS_ROOT/server/index.js" &
SERVER_PID=$!

trap "kill $SERVER_PID 2>/dev/null || true" EXIT

sleep 2

APP_URL="http://127.0.0.1:$PORT"
open "$APP_URL"

wait $SERVER_PID
