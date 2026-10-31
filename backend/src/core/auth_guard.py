import jwt
from functools import wraps
from flask import request, jsonify, current_app
from .models import User


def get_current_user():
    """Extract and validate JWT from httpOnly cookie. Returns User or None."""
    token = request.cookies.get(current_app.config["JWT_COOKIE_NAME"])
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
            options={
                "require_exp": True,
                "require_iat": True,
                "verify_exp": True,
                "verify_signature": True
            }
        )
        user_id = payload.get("user_id")
        if not user_id:
            return None
        user = User.query.get(user_id)
        return user
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except KeyError:
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