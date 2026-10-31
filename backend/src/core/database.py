import threading
from flask import Flask
from .models import db

_KEEPALIVE_INTERVAL = 240


def init_db(app: Flask) -> None:
    db.init_app(app)
    with app.app_context():
        db.create_all()


def start_neon_keepalive(app: Flask) -> None:
    url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if "postgresql" not in url and "postgres" not in url:
        return

    def _ping():
        with app.app_context():
            try:
                db.session.execute(db.text("SELECT 1"))
                db.session.commit()
            except Exception:
                db.session.rollback()
        t = threading.Timer(_KEEPALIVE_INTERVAL, _ping)
        t.daemon = True
        t.start()

    t = threading.Timer(_KEEPALIVE_INTERVAL, _ping)
    t.daemon = True
    t.start()
