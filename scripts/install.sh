#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  ZYRO AI v1.6.5 — Backend Installer
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
#  Color Definitions
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'

# ─────────────────────────────────────────────────────────────────────────────
#  Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${CYAN}║${RESET}${WHITE}  ZYRO AI  ${DIM}•${RESET}${WHITE}  Backend Installer  ${DIM}•${RESET}${WHITE}  v1.6.5                         ${CYAN}║${RESET}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo -e "${CYAN}║${RESET}  ${DIM}© 2026 Arkeos, Philippines${RESET}                                    ${CYAN}║${RESET}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

print_step() {
    local step_num=$1
    local total=$2
    local desc=$3
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "  ${BOLD}[${step_num}/${total}]${RESET} ${WHITE}${desc}${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

print_success() {
    echo -e "  ${GREEN}✓${RESET} $1"
}

print_warning() {
    echo -e "  ${YELLOW}!${RESET} $1"
}

print_error() {
    echo -e "  ${RED}✗${RESET} $1"
}

print_info() {
    echo -e "  ${DIM}→${RESET} $1"
}

print_box() {
    local title=$1
    local content=$2
    echo -e "${CYAN}┌──────────────────────────────────────────────────────────────────┐${RESET}"
    echo -e "${CYAN}│${RESET} ${BOLD}${title}${RESET}"
    echo -e "${CYAN}│${RESET}"
    while IFS= read -r line; do
        echo -e "${CYAN}│${RESET} $line"
    done <<< "$content"
    echo -e "${CYAN}└──────────────────────────────────────────────────────────────────┘${RESET}"
}

print_footer() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}║${RESET}  ${WHITE}✓ Installation Complete!${RESET}                                        ${GREEN}║${RESET}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${RESET}"
    echo -e "${GREEN}║${RESET}"
    echo -e "${GREEN}║${RESET}  ${CYAN}Next Steps:${RESET}"
    echo -e "${GREEN}║${RESET}  ${WHITE}1.${RESET} cd .. && source venv/bin/activate"
    echo -e "${GREEN}║${RESET}  ${WHITE}2.${RESET} cp config/.env.example config/.env && nano config/.env"
    echo -e "${GREEN}║${RESET}  ${WHITE}3.${RESET} cd .. && bash scripts/deploy-backend.sh --dev"
    echo -e "${GREEN}║${RESET}"
    echo -e "${GREEN}║${RESET}  ${DIM}Tip: Set DATABASE_URL=sqlite:///../database/zyro.db for local dev${RESET}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Main Installation
# ═══════════════════════════════════════════════════════════════════════════════

print_header

# Detect script location and set paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
CONFIG_DIR="$BACKEND_DIR/config"

# Change to backend directory
cd "$BACKEND_DIR" || { print_error "Cannot cd to backend directory"; exit 1; }

# Detect environment
IS_TERMUX=false
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
fi

if [ "$IS_TERMUX" = false ]; then
    print_box "Standard Environment" "Running normal pip install...
No Termux-specific adjustments needed."
    echo ""
    
    print_step 1 2 "Installing setuptools & wheel"
    pip install --upgrade setuptools wheel
    print_success "Base packages installed"
    
    print_step 2 2 "Installing Python dependencies"
    pip install -r "$CONFIG_DIR/requirements.txt"
    print_success "All dependencies installed"
    
    print_footer
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
#  Termux Installation
# ═══════════════════════════════════════════════════════════════════════════════

print_box "Termux Detected" "Android environment found.
Using optimized installation path with native packages."

# ─────────────────────────────────────────────────────────────────────────────
#  Step 1: Native Packages
# ─────────────────────────────────────────────────────────────────────────────
print_step 1 4 "Installing native packages via pkg"

if pkg install -y python-cryptography python-bcrypt 2>/dev/null; then
    print_success "python-cryptography installed"
    print_success "python-bcrypt installed"
else
    print_warning "Some native packages may already be installed"
fi

# ─────────────────────────────────────────────────────────────────────────────
#  Step 2: Virtual Environment
# ─────────────────────────────────────────────────────────────────────────────
print_step 2 4 "Setting up virtual environment"

VENV_DIR="venv"
if [ -d "$VENV_DIR" ]; then
    print_info "Removing existing venv..."
    rm -rf "$VENV_DIR"
fi

if python -m venv "$VENV_DIR" --system-site-packages; then
    print_success "Virtual environment created with --system-site-packages"
else
    print_error "Failed to create venv"
    exit 1
fi

print_info "Activating..."
source "$VENV_DIR/bin/activate"
print_success "Virtual environment activated"

# ─────────────────────────────────────────────────────────────────────────────
#  Step 3: Pure Python Packages
# ─────────────────────────────────────────────────────────────────────────────
print_step 3 4 "Installing Python packages"

print_info "Upgrading pip infrastructure..."
pip install --upgrade setuptools wheel --quiet
print_success "setuptools & wheel ready"

print_info "Installing Flask and dependencies..."
pip install --no-build-isolation \
    flask==3.1.0 \
    flask-sqlalchemy==3.1.1 \
    flask-cors==5.0.0 \
    flask-limiter==3.8.0 \
    PyJWT==2.10.1 \
    python-dotenv==1.0.1 \
    gunicorn==23.0.0 \
    requests==2.31.0 \
    resend==2.10.0 \
    itsdangerous==2.2.0 \
    upstash-redis==1.1.0 2>&1 | while read -r line; do
        # Suppress verbose output, show only important lines
        if [[ "$line" == *"Successfully"* ]] || [[ "$line" == *"Requirement"* ]]; then
            print_info "$line"
        fi
    done
print_success "Core packages installed"

# ─────────────────────────────────────────────────────────────────────────────
#  Step 4: Optional Packages
# ─────────────────────────────────────────────────────────────────────────────
print_step 4 4 "Installing optional packages"

print_info "pywebpush (push notifications)..."
if pip install pywebpush==2.0.0 --no-build-isolation 2>/dev/null; then
    print_success "pywebpush installed"
else
    print_warning "pywebpush skipped — push notifications unavailable"
    print_info "    App will still work, just no web push"
fi

print_info "psycopg2-binary (PostgreSQL support)..."
if pip install psycopg2-binary==2.9.10 --no-build-isolation 2>/dev/null; then
    print_success "psycopg2 installed — PostgreSQL ready"
else
    print_warning "psycopg2 skipped — using SQLite for local dev"
    print_info "    Set DATABASE_URL=sqlite:///zyro.db in .env"
fi

# ─────────────────────────────────────────────────────────────────────────────
#  Done
# ─────────────────────────────────────────────────────────────────────────────

print_footer

echo -e "${DIM}────────────────────────────────────────────────────────────────────${RESET}"
echo -e "${DIM}  Zyro AI v1.6.5 • Models: Groq compound + Gemini 3 Flash Preview${RESET}"
echo -e "${DIM}────────────────────────────────────────────────────────────────────${RESET}"