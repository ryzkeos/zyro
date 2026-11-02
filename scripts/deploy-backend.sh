#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  ZYRO AI — v1.6.5 — Backend Deployer
#  © 2026 John Ruenz, Philippines
# ═══════════════════════════════════════════════════════════════════════════════

MODE=${1:---dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "═══════════════════════════════════════════════════════════════"
echo "  ZYRO AI — v1.6.5 — Backend Deployer"
echo "  Mode: $MODE"
echo "═══════════════════════════════════════════════════════════════"

case $MODE in
  --dev)
    echo "[1/3] Changing to backend directory..."
    cd "$BACKEND_DIR"
    echo "[2/3] Activating virtual environment..."
    if [ -d "venv" ]; then
      source venv/bin/activate
    else
      echo "  Warning: venv not found. Run install.sh first."
    fi
    echo "[3/3] Running Flask on port 5004..."
    python -m src.core.app
    ;;

  --prod)
    echo "[1/3] Changing to backend directory..."
    cd "$BACKEND_DIR"
    echo "[2/3] Activating virtual environment..."
    if [ -d "venv" ]; then
      source venv/bin/activate
    else
      echo "  Warning: venv not found. Run install.sh first."
    fi
    echo "[3/3] Running Gunicorn on port 5004..."
    gunicorn "src.core.app:app" -c config/gunicorn.conf.py
    ;;

  *)
    echo "Usage: $0 [--dev|--prod]"
    echo "  --dev   Start Flask development server"
    echo "  --prod  Start Gunicorn production server"
    exit 1
    ;;
esac