#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  ZYRO AI — v2.0.0 — Deployer
#  © 2026 John Ruenz, Philippines
# ═══════════════════════════════════════════════════════════════════════════════

MODE=${1:---dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════════════════════════"
echo "  ZYRO AI — v2.0.0 — Deployer"
echo "  Mode: $MODE"
echo "═══════════════════════════════════════════════════════════════"

case $MODE in
  --dev|--prod) ;;
  *)
    echo "Usage: $0 [--dev|--prod]"
    echo "  --dev   Start Next.js development server"
    echo "  --prod  Build and start Next.js production server"
    exit 1
    ;;
esac

cd "$PROJECT_DIR" || exit 1

echo "[1/3] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install || exit 1
fi
if [ ! -f ".env.local" ]; then
  echo "  Warning: .env.local not found. Run scripts/install.sh first."
fi

case $MODE in
  --dev)
    echo "[2/3] Starting development server..."
    echo "[3/3] Running Next.js on port 7004..."
    exec npm run dev
    ;;

  --prod)
    echo "[2/3] Building for production..."
    npm run build || exit 1
    echo "[3/3] Running Next.js on port 7004..."
    exec npm run start
    ;;
esac
