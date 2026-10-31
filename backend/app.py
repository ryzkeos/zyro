import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from config import Config
from models import db
from routes.auth import auth_bp
from routes.conversations import conv_bp
from routes.ai import ai_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS — allow frontend origin with credentials (cookies)
    CORS(app,
         origins=[app.config["FRONTEND_URL"]],
         supports_credentials=True,
         allow_headers=["Content-Type"],
         methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

    # Init DB
    db.init_app(app)
    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(conv_bp)
    app.register_blueprint(ai_bp)

    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "Zyro Backend"}, 200

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=app.config["DEBUG"])
