import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from models import db, Conversation, Message
from middleware.auth_guard import login_required

conv_bp = Blueprint("conversations", __name__, url_prefix="/api/conversations")


@conv_bp.route("/", methods=["GET"])
@login_required
def get_conversations(current_user):
    # Only return conversations that have at least one message.
    # This prevents orphaned empty rows from appearing on the frontend
    # (e.g. from old pending convs created before this fix was applied).
    convs = (
        Conversation.query
        .filter_by(user_id=current_user.id)
        .filter(Conversation.messages.any())
        .order_by(Conversation.pinned.desc(), Conversation.last_updated.desc())
        .all()
    )
    return jsonify([c.to_dict() for c in convs]), 200


@conv_bp.route("/", methods=["POST"])
@login_required
def create_conversation(current_user):
    data  = request.get_json() or {}
    title = (data.get("title") or "New Conversation").strip()[:200]
    conv  = Conversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=title,
        last_updated=datetime.now(timezone.utc),
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201


@conv_bp.route("/<conv_id>", methods=["DELETE"])
@login_required
def delete_conversation(current_user, conv_id):
    conv = _get_owned_conv(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"deleted": conv_id}), 200


@conv_bp.route("/<conv_id>/pin", methods=["PATCH"])
@login_required
def toggle_pin(current_user, conv_id):
    conv = _get_owned_conv(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    conv.pinned = not conv.pinned
    db.session.commit()
    return jsonify(conv.to_dict()), 200


@conv_bp.route("/<conv_id>/title", methods=["PATCH"])
@login_required
def update_title(current_user, conv_id):
    conv = _get_owned_conv(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    title = (data.get("title") or "New Conversation").strip()[:200]
    conv.title = title
    db.session.commit()
    return jsonify(conv.to_dict()), 200


# ── Messages ──────────────────────────────────────────────────────────────────

@conv_bp.route("/<conv_id>/messages", methods=["GET"])
@login_required
def get_messages(current_user, conv_id):
    conv = _get_owned_conv(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    return jsonify([m.to_dict() for m in conv.messages]), 200


@conv_bp.route("/<conv_id>/messages", methods=["POST"])
@login_required
def save_message(current_user, conv_id):
    conv = _get_owned_conv(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json() or {}
    msg = Message(
        id=data.get("id") or str(uuid.uuid4()),
        conversation_id=conv_id,
        role=data.get("role", "user"),
        content=data.get("content", ""),
        is_error=data.get("isError", False),
        timestamp=data.get("timestamp") or int(datetime.now(timezone.utc).timestamp() * 1000),
    )
    conv.last_updated = datetime.now(timezone.utc)
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_owned_conv(conv_id: str, user_id: str):
    return Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
