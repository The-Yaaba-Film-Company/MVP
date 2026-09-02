#!/usr/bin/env bash
# Boots the real FastAPI backend for the real-backend E2E suite.
#
#   - Resets the E2E database (drop_all/create_all) so every Playwright run
#     starts deterministic.
#   - Runs uvicorn on 127.0.0.1:8001 with CORS open to the Vite dev server
#     (frontend E2E runs on :3001) and AI calls disabled (empty ANTHROPIC_API_KEY
#     overrides any .env key).
#
# Overrides:
#   MPCAMPO_BACKEND_DIR         backend repo root (default: ~/Documents/python projects/mpcampo)
#   MPCAMPO_E2E_DATABASE_URL   Postgres URL (default: local mpcampo_e2e)
set -euo pipefail

BACKEND_DIR="${MPCAMPO_BACKEND_DIR:-$HOME/Documents/python projects/mpcampo}"
VENV_PY="${MPCAMPO_VENV_PY:-$BACKEND_DIR/.venv/bin/python}"
DATABASE_URL="${MPCAMPO_E2E_DATABASE_URL:-postgresql+asyncpg://mpcampo:mpcampo@127.0.0.1:55432/mpcampo_e2e}"

export DATABASE_URL
export CORS_ORIGINS="http://localhost:3001"
export SESSION_COOKIE_SECURE="false"
export ANTHROPIC_API_KEY=""

cd "$BACKEND_DIR"
PYTHONPATH="$BACKEND_DIR" "$VENV_PY" "$BACKEND_DIR/scripts/reset_e2e_db.py"

exec env PYTHONPATH="$BACKEND_DIR" "$VENV_PY" -m uvicorn app.main:app \
  --host 127.0.0.1 --port 8001