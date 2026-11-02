import os
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

_here = Path(__file__).resolve().parent
_config_dir = _here.parent.parent / "config"
load_dotenv(dotenv_path=_config_dir / ".env", override=True)

from .config import Config
from .database import init_db, start_neon_keepalive
from .limiter import limiter
from ..auth.auth import auth_bp
from ..auth.auth_email import auth_email_bp
from ..conversation.conversations import conv_bp
from ..ai.ai import ai_bp
from ..push.push import push_bp
from ..search.search import search_bp


def create_app():
    import logging
    from .project import VERSION as _VERSION
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app = Flask(__name__)
    app.config.from_object(Config)
    if app.config.get("SECRET_KEY") == "dev-secret-change-in-production" and not app.config.get("DEBUG"):
        raise RuntimeError("SECRET_KEY must be changed in production")

    # CORS with security settings
    CORS(
        app,
        origins=[app.config["FRONTEND_URL"]],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    # ── Security Headers Middleware ───────────────────────────────────────────
    @app.after_request
    def add_security_headers(response):
        cfg = app.config

        # HSTS: Strict Transport Security (only in production with HTTPS)
        if cfg.get("COOKIE_SECURE"):
            response.headers["Strict-Transport-Security"] = (
                f"max-age={cfg.get('HSTS_MAX_AGE', 31536000)}; includeSubDomains"
            )

        # X-Frame-Options: Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # X-Content-Type-Options: Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-XSS-Protection: Enable browser XSS filter (legacy but useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy: Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy: Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        # Content-Security-Policy: Prevent XSS and injection attacks
        # Note: CSP can be customized via CSP_POLICY env var
        if cfg.get("CSP_POLICY"):
            response.headers["Content-Security-Policy"] = cfg["CSP_POLICY"]

        # Cache-Control: Prevent caching of sensitive API responses
        if request.path.startswith("/api/auth") or request.path.startswith("/api/me"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response

    init_db(app)
    start_neon_keepalive(app)
    limiter.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(auth_email_bp)
    app.register_blueprint(conv_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(push_bp)
    app.register_blueprint(search_bp)
    app.logger.info("Zyro AI v%s started", _VERSION)

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({"error": "Too many requests. Slow down and try again."}), 429

    @app.route("/api/health")
    def health():
        from .project import VERSION, APP_NAME
        return {"status": "ok", "service": APP_NAME, "version": VERSION}, 200

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5004))
    app.run(host="0.0.0.0", port=port)