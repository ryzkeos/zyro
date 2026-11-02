#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  ZYRO AI — v1.6.5 — Frontend Deployer
#  © 2026 John Ruenz, Philippines
# ═══════════════════════════════════════════════════════════════════════════════

MODE=${1:---dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/frontend"
CONFIG_DIR="$FRONTEND_DIR/config"

echo "═══════════════════════════════════════════════════════════════"
echo "  ZYRO AI — v1.6.5 — Frontend Deployer"
echo "  Mode: $MODE"
echo "═══════════════════════════════════════════════════════════════"

case $MODE in
  --dev)
    echo "[1/3] Checking dependencies..."
    cd "$CONFIG_DIR"
    if [ ! -d "node_modules" ]; then
      echo "  Installing dependencies..."
      npm install
    fi
    echo "[2/3] Starting development server..."
    echo "[3/3] Running Vite on port 7004..."
    npm run dev
    ;;

  --prod)
    echo "[1/3] Checking dependencies..."
    cd "$CONFIG_DIR"
    if [ ! -d "node_modules" ]; then
      echo "  Installing dependencies..."
      npm install
    fi
    echo "[2/3] Building for production..."
    npm run build
    echo "[3/3] Build complete!"
    echo "      Output: $FRONTEND_DIR/dist/"
    echo "      Deploy with: cd $FRONTEND_DIR && npx serve dist"
    ;;

  *)
    echo "Usage: $0 [--dev|--prod]"
    echo "  --dev   Start Vite development server"
    echo "  --prod  Build for production"
    exit 1
    ;;
esac