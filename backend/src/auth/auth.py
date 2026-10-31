import re
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, make_response, current_app
from ..core.models import db, User
from ..core.auth_guard import login_required, get_current_user
from ..core.limiter import limiter

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour")
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    if username and not (3 <= len(username) <= 30):
        return jsonify({"error": "Username must be 3–30 characters"}), 400

    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(id=str(uuid.uuid4()), username=username, email=email, password=hashed)
    db.session.add(user)
    db.session.commit()

    response = make_response(jsonify({"user": user.to_dict()}), 201)
    _set_auth_cookie(response, user.id)
    return response


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute; 50 per hour")
def login():
    data = request.get_json()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode(), user.password.encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    response = make_response(jsonify({"user": user.to_dict()}), 200)
    _set_auth_cookie(response, user.id)
    return response


@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logged out"}), 200)
    response.delete_cookie(
        current_app.config["JWT_COOKIE_NAME"],
        path="/",
        httponly=True,
        secure=current_app.config["COOKIE_SECURE"],
        samesite="None" if current_app.config["COOKIE_SECURE"] else "Lax",
    )
    return response


@auth_bp.route("/me", methods=["GET"])
def me():
    """Check current session — returns user if logged in, null if guest."""
    user = get_current_user()
    if not user:
        return jsonify({"user": None}), 200
    return jsonify({"user": user.to_dict()}), 200


# ── Edit Profile ──────────────────────────────────────────────────────────────

@auth_bp.route("/profile", methods=["PATCH"])
@login_required
def edit_profile(current_user):
    """Update username and/or email."""
    data     = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()

    if not username and not email:
        return jsonify({"error": "Provide at least one field to update"}), 400

    if username and not (3 <= len(username) <= 30):
        return jsonify({"error": "Username must be 3–30 characters"}), 400

    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Invalid email format"}), 400

    if username and username != current_user.username:
        if User.query.filter(User.username == username, User.id != current_user.id).first():
            return jsonify({"error": "Username already taken"}), 409
        current_user.username = username

    if email and email != current_user.email:
        if User.query.filter(User.email == email, User.id != current_user.id).first():
            return jsonify({"error": "Email already registered"}), 409
        current_user.email = email

    db.session.commit()
    return jsonify({"user": current_user.to_dict()}), 200


# ── Change Password ───────────────────────────────────────────────────────────

@auth_bp.route("/password", methods=["PATCH"])
@login_required
def change_password(current_user):
    """Verify current password, then set new one."""
    data         = request.get_json() or {}
    current_pass = (data.get("currentPassword") or "").strip()
    new_pass     = (data.get("newPassword") or "").strip()

    if not current_pass or not new_pass:
        return jsonify({"error": "Both current and new password are required"}), 400

    if len(new_pass) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    if not bcrypt.checkpw(current_pass.encode(), current_user.password.encode()):
        return jsonify({"error": "Current password is incorrect"}), 401

    current_user.password = bcrypt.hashpw(new_pass.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200


# ── AI Instructions ───────────────────────────────────────────────────────────

@auth_bp.route("/ai-instructions", methods=["GET"])
@login_required
def get_ai_instructions(current_user):
    """Return the user's saved AI instructions."""
    return jsonify({"ai_instructions": current_user.ai_instructions or ""}), 200


@auth_bp.route("/ai-instructions", methods=["PATCH"])
@login_required
def update_ai_instructions(current_user):
    """Save the user's AI instructions."""
    data = request.get_json() or {}
    instructions = data.get("ai_instructions", "")
    if not isinstance(instructions, str):
        return jsonify({"error": "ai_instructions must be a string"}), 400
    current_user.ai_instructions = instructions[:5000]  # cap at 5000 chars
    db.session.commit()
    return jsonify({"ai_instructions": current_user.ai_instructions}), 200


# ── Delete Account ────────────────────────────────────────────────────────────

@auth_bp.route("/account", methods=["DELETE"])
@login_required
def delete_account(current_user):
    """Permanently delete user account and all data. Requires password confirmation."""
    data     = request.get_json() or {}
    password = (data.get("password") or "").strip()

    if not password:
        return jsonify({"error": "Password is required to delete account"}), 400

    if not bcrypt.checkpw(password.encode(), current_user.password.encode()):
        return jsonify({"error": "Incorrect password"}), 401

    db.session.delete(current_user)  # cascade deletes conversations + messages
    db.session.commit()

    response = make_response(jsonify({"message": "Account deleted"}), 200)
    response.delete_cookie(
        current_app.config["JWT_COOKIE_NAME"],
        path="/",
        httponly=True,
        secure=current_app.config["COOKIE_SECURE"],
        samesite="None" if current_app.config["COOKIE_SECURE"] else "Lax",
    )
    return response


# ── Helper ────────────────────────────────────────────────────────────────────

def _set_auth_cookie(response, user_id: str):
    cfg = current_app.config
    expiry = cfg["JWT_EXPIRY"]
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "user_id": user_id,
            "iat": now,
            "exp": now + expiry,
        },
        cfg["SECRET_KEY"],
        algorithm="HS256",
    )
    response.set_cookie(
        cfg["JWT_COOKIE_NAME"],
        token,
        max_age=int(expiry.total_seconds()),
        httponly=True,
        secure=cfg["COOKIE_SECURE"],
        samesite="None" if cfg["COOKIE_SECURE"] else "Lax",
        path="/",
    )
