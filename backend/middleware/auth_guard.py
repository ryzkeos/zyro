import jwt
from functools import wraps
from flask import request, jsonify, current_app
from models import User


def get_current_user():
    """Extract and validate JWT from httpOnly cookie. Returns User or None."""
    token = request.cookies.get(current_app.config["JWT_COOKIE_NAME"])
    if not token:
        return None
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        user = User.query.get(payload["user_id"])
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError):
        return None


def login_required(f):
    """Route decorator — returns 401 if not authenticated."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        return f(current_user=user, *args, **kwargs)
    return decorated


def optional_auth(f):
    """Route decorator — injects current_user=None for guests, no 401."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        return f(current_user=user, *args, **kwargs)
    return decorated
