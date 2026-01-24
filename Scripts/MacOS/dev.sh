#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

MVN_PID=""
NPM_PID=""

cleanup() {
  if [[ -n "${NPM_PID}" ]] && kill -0 "${NPM_PID}" 2>/dev/null; then
    kill "${NPM_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${MVN_PID}" ]] && kill -0 "${MVN_PID}" 2>/dev/null; then
    kill "${MVN_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting Spring Boot (backend)..."
mvn spring-boot:run &
MVN_PID=$!

cd "$ROOT_DIR/frontend"

if [[ ! -d "node_modules" ]]; then
  echo "Installing frontend dependencies..."
  npm install
fi

echo "Starting Vite (frontend)..."
LOG_FILE="$(mktemp)"

npm run dev 2>&1 | tee "$LOG_FILE" &
NPM_PID=$!

URL=""
for _ in {1..60}; do
  URL="$(grep -Eo 'http://(localhost|127\.0\.0\.1):[0-9]+' "$LOG_FILE" | head -n 1 || true)"
  if [[ -n "$URL" ]]; then
    echo "Opening $URL"
    open "$URL"
    break
  fi
  sleep 1
done

wait "$NPM_PID"
