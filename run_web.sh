#!/usr/bin/env bash
# Dev launcher: starts the FastAPI backend (:8000) and the Vite frontend (:5173).
# Open http://localhost:5173 in your browser.
set -e
cd "$(dirname "$0")"

PYTHON="${PYTHON:-.venv/bin/python}"
if [ ! -x "$PYTHON" ]; then
  echo "No venv found. Create one and install deps:"
  echo "  python3 -m venv --system-site-packages .venv"
  echo "  .venv/bin/pip install -r backend/requirements.txt"
  exit 1
fi

# Backend
"$PYTHON" -m uvicorn backend.main:app --reload --port 8000 &
BACK_PID=$!

# Frontend
( cd frontend && npm run dev ) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
echo "Backend  → http://localhost:8000  (PID $BACK_PID)"
echo "Frontend → http://localhost:5173  (PID $FRONT_PID)"
wait
