#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${CYAN}║${RESET}${WHITE}  ZYRO AI  ${DIM}•${RESET}${WHITE}  Installer  ${DIM}•${RESET}${WHITE}  v2.0.0                             ${CYAN}║${RESET}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo -e "${CYAN}║${RESET}  ${DIM}© 2026 Arkeos, Philippines${RESET}                                    ${CYAN}║${RESET}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

print_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "  ${BOLD}[$1/$2]${RESET} ${WHITE}$3${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

print_success() { echo -e "  ${GREEN}✓${RESET} $1"; }
print_warning() { echo -e "  ${YELLOW}!${RESET} $1"; }
print_error()   { echo -e "  ${RED}✗${RESET} $1"; }
print_info()    { echo -e "  ${DIM}→${RESET} $1"; }

print_footer() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}║${RESET}  ${WHITE}✓ Installation Complete!${RESET}                                        ${GREEN}║${RESET}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo -e "${GREEN}║${RESET}"
    echo -e "${GREEN}║${RESET}  ${CYAN}Next Steps:${RESET}"
    echo -e "${GREEN}║${RESET}  ${WHITE}1.${RESET} nano .env.local"
    echo -e "${GREEN}║${RESET}  ${WHITE}2.${RESET} npm run db:push"
    echo -e "${GREEN}║${RESET}  ${WHITE}3.${RESET} bash scripts/deploy-frontend.sh --dev"
    echo -e "${GREEN}║${RESET}"
    echo -e "${GREEN}║${RESET}  ${DIM}Tip: DATABASE_URL must point to a PostgreSQL database${RESET}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_header

cd "$PROJECT_DIR" || { print_error "Cannot cd to project directory"; exit 1; }

print_step 1 5 "Checking Node.js"

if ! command -v node >/dev/null 2>&1; then
    print_error "node not found. Install Node.js 18.18 or newer"
    exit 1
fi

NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="${NODE_VERSION%%.*}"
NODE_MINOR="$(echo "$NODE_VERSION" | cut -d. -f2)"

if [ "$NODE_MAJOR" -lt 18 ] || { [ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -lt 18 ]; }; then
    print_error "Node.js $NODE_VERSION is too old. Need 18.18 or newer"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    print_error "npm not found"
    exit 1
fi

print_success "Node.js $NODE_VERSION"

print_step 2 5 "Installing dependencies"

npm install
print_success "Dependencies installed"

print_step 3 5 "Creating .env.local"

if [ -f ".env.local" ]; then
    print_info ".env.local already exists, keeping it"
else
    cp .env.example .env.local
    print_success ".env.local created from .env.example"
fi

print_step 4 5 "Generating SECRET_KEY"

CURRENT_SECRET="$(grep -E '^SECRET_KEY=' .env.local | head -n 1 | cut -d= -f2-)"

if [ -n "$CURRENT_SECRET" ]; then
    print_info "SECRET_KEY already set, keeping it"
else
    NEW_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    if grep -qE '^SECRET_KEY=' .env.local; then
        sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$NEW_SECRET|" .env.local
        rm -f .env.local.bak
    else
        echo "SECRET_KEY=$NEW_SECRET" >> .env.local
    fi
    print_success "SECRET_KEY generated"
fi

print_step 5 5 "Pushing database schema"

DB_URL="$(grep -E '^DATABASE_URL=' .env.local | head -n 1 | cut -d= -f2-)"

if [ -z "$DB_URL" ] || [[ "$DB_URL" == *"user:password@host"* ]]; then
    print_warning "DATABASE_URL is not set in .env.local, skipping db:push"
    print_info "Set it, then run: npm run db:push"
elif DATABASE_URL="$DB_URL" npm run db:push; then
    print_success "Database schema pushed"
else
    print_warning "db:push failed. Check DATABASE_URL, then run: npm run db:push"
fi

print_footer

echo -e "${DIM}────────────────────────────────────────────────────────────────────${RESET}"
echo -e "${DIM}  Zyro AI v2.0.0 • Models: Groq compound + Gemini 3 Flash Preview${RESET}"
echo -e "${DIM}────────────────────────────────────────────────────────────────────${RESET}"
