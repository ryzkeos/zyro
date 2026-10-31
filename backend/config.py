import os
from datetime import timedelta

class Config:
    # Database — SQLite locally, PostgreSQL in production
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///zyro.db")
    
    # Fix Render's postgres:// → postgresql:// (SQLAlchemy requirement)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT / Session
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    JWT_COOKIE_NAME = "zyro_token"
    JWT_EXPIRY = timedelta(days=7)

    # Gemini API keys (yuruzu-1.0 model)
    YURUZU_API_KEY = [
        key.strip()
        for key in os.getenv("YURUZU_API_KEY", "").split(",")
        if key.strip()
    ]

    # OpenRouter/Groq API keys (xenon-1.0 model)
    XENON_API_KEY = [
        key.strip()
        for key in os.getenv("XENON_API_KEY", "").split(",")
        if key.strip()
    ]

    # CORS — frontend origin
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Environment
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false" if os.getenv("FLASK_ENV", "development") == "development" else "true").lower() == "true"
