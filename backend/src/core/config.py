import os
import secrets
import sys
from pathlib import Path
from datetime import timedelta

# Base directory for default SQLite path
# backend/src/core/config.py -> ../../../database/zyro.db
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATABASE_DIR = PROJECT_ROOT / "database"

# Known insecure default secrets that must NEVER be used
KNOWN_INSECURE_SECRETS = {
    "dev-secret-change-in-production",
    "secret",
    "password",
    "changeme",
    "default",
    "test",
    "development",
    "production",
    "admin",
}


class Config:
    # ── Database ──────────────────────────────────────────────────────────────
    # Smart detection:
    #   - If DATABASE_URL is set → use it (production or explicit override)
    #   - Otherwise → SQLite (development default)
    DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DATABASE_DIR}/zyro.db"

    # Normalize postgres:// to postgresql:// (legacy compat)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Detect SQLite for engine-specific options
    IS_SQLITE = DATABASE_URL.startswith("sqlite")

    # SQLite-specific engine options (thread safety for local development)
    SQLALCHEMY_ENGINE_OPTIONS = (
        {"connect_args": {"check_same_thread": False}} if IS_SQLITE else {}
    )

    # ── JWT / Session ─────────────────────────────────────────────────────────
    # SECURITY: SECRET_KEY must be set via environment variable
    # No default fallback - fail fast if not configured
    _raw_secret = os.getenv("SECRET_KEY", "")

    if not _raw_secret:
        # Generate a random secret for development ONLY (warn loudly)
        _raw_secret = secrets.token_hex(32)
        print("\n" + "!" * 70, file=sys.stderr)
        print("!  WARNING: SECRET_KEY not set. Generated temporary key.", file=sys.stderr)
        print("!  Set SECRET_KEY environment variable for production!", file=sys.stderr)
        print("!" * 70 + "\n", file=sys.stderr)

    if _raw_secret in KNOWN_INSECURE_SECRETS:
        raise RuntimeError(
            f"FATAL: SECRET_KEY is set to a known insecure value '{_raw_secret}'. "
            "Generate a secure key: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    SECRET_KEY = _raw_secret
    JWT_COOKIE_NAME = "zyro_token"
    JWT_EXPIRY = timedelta(days=7)

    # ── AI API Keys ───────────────────────────────────────────────────────────
    YURUZU_API_KEY = [k.strip() for k in os.getenv("YURUZU_API_KEY", "").split(",") if k.strip()]
    XENON_API_KEY = [k.strip() for k in os.getenv("XENON_API_KEY", "").split(",") if k.strip()]

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # ── Environment ───────────────────────────────────────────────────────────
    DEBUG = os.getenv("FLASK_ENV", "production") == "development"
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

    # ── Security Headers ──────────────────────────────────────────────────────
    # HSTS: 1 year, include subdomains
    HSTS_MAX_AGE = 31536000
    # Content Security Policy (relaxed for development)
    CSP_POLICY = os.getenv(
        "CSP_POLICY",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    )

    # ── Resend (email) ────────────────────────────────────────────────────────
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM = os.getenv("RESEND_FROM", "Zyro AI <noreply@zyro.app>")

    # ── Upstash Redis ─────────────────────────────────────────────────────────
    UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
    UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
    REDIS_CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", 3600))

    # ── Web Push / VAPID ──────────────────────────────────────────────────────
    VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "admin@zyro.app")