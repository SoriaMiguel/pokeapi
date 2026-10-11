#!/usr/bin/env bash
set -euo pipefail

launcher_pid="${PPID}"
api_pid=""
web_pid=""

cleanup() {
  trap - INT TERM EXIT HUP

  # 1. Graceful SIGINT / SIGTERM to both main processes first.
  # For uvicorn, signalling the reloader parent allows it to properly shut down its worker.
  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then
    kill -INT "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" 2>/dev/null; then
    kill -INT "${web_pid}" 2>/dev/null || true
  fi

  # 2. Wait up to 2 seconds for clean exit
  local count=0
  while [[ ${count} -lt 20 ]]; do
    local still_running=0
    if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then still_running=1; fi
    if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" 2>/dev/null; then still_running=1; fi
    if [[ ${still_running} -eq 0 ]]; then break; fi
    sleep 0.1
    count=$((count + 1))
  done

  # 3. If anything lingers, SIGTERM/SIGKILL descendants then parents
  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then
    pkill -KILL -P "${api_pid}" 2>/dev/null || true
    kill -KILL "${api_pid}" 2>/dev/null || true
  fi

  if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" 2>/dev/null; then
    pkill -KILL -P "${web_pid}" 2>/dev/null || true
    kill -KILL "${web_pid}" 2>/dev/null || true
  fi

  exit 0
}

trap cleanup INT TERM EXIT HUP

echo "Starting Kanto Index development servers..."
echo "  UI:  http://localhost:5173"
echo "  API: http://localhost:8000"

backend/.venv/bin/uvicorn backend.main:app --reload --port 8000 &
api_pid=$!

(cd frontend && exec bun run dev -- --host 0.0.0.0) &
web_pid=$!

while true; do
  if [[ -n "${launcher_pid}" ]] && ! kill -0 "${launcher_pid}" 2>/dev/null; then
    cleanup
  fi

  if ! kill -0 "${api_pid}" 2>/dev/null; then
    cleanup
  fi

  if ! kill -0 "${web_pid}" 2>/dev/null; then
    cleanup
  fi

  sleep 0.5
done
