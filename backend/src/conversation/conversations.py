import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..core.models import db, Conversation, Message
from ..core.auth_guard import login_required
from ..core.limiter import limiter

conv_bp = Blueprint("conversations", __name__, url_prefix="/api/conversations")


@conv_bp.route("/", methods=["GET"])
@login_required
def get_conversations(current_user):
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
        id=str(uuid.uuid4()), user_id=current_user.id,
        title=title, last_updated=datetime.now(timezone.utc),
    )
    db.session.add(conv)
    db.session.commit()
    return jsonify(conv.to_dict()), 201


@conv_bp.route("/<conv_id>", methods=["DELETE"])
@login_required
def delete_conversation(current_user, conv_id):
    conv = _owned(conv_id, current_user.id)
    if not conv: return jsonify({"error": "Not found"}), 404
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"deleted": conv_id}), 200


@conv_bp.route("/<conv_id>/pin", methods=["PATCH"])
@login_required
def toggle_pin(current_user, conv_id):
    conv = _owned(conv_id, current_user.id)
    if not conv: return jsonify({"error": "Not found"}), 404
    conv.pinned = not conv.pinned
    db.session.commit()
    return jsonify(conv.to_dict()), 200


@conv_bp.route("/<conv_id>/title", methods=["PATCH"])
@login_required
def update_title(current_user, conv_id):
    conv = _owned(conv_id, current_user.id)
    if not conv: return jsonify({"error": "Not found"}), 404
    title = (request.get_json() or {}).get("title", "New Conversation").strip()[:200]
    conv.title = title
    db.session.commit()
    return jsonify(conv.to_dict()), 200


@conv_bp.route("/<conv_id>/messages", methods=["GET"])
@login_required
def get_messages(current_user, conv_id):
    conv = _owned(conv_id, current_user.id)
    if not conv: return jsonify({"error": "Not found"}), 404
    return jsonify([m.to_dict() for m in conv.messages]), 200


@conv_bp.route("/<conv_id>/messages", methods=["POST"])
@login_required
def save_message(current_user, conv_id):
    conv = _owned(conv_id, current_user.id)
    if not conv: return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    msg = Message(
        id=data.get("id") or str(uuid.uuid4()),
        conversation_id=conv_id,
        role=data.get("role", "user"),
        content=data.get("content", ""),
        is_error=data.get("isError", False),
        model=data.get("model"),
        timestamp=data.get("timestamp") or int(datetime.now(timezone.utc).timestamp() * 1000),
    )
    conv.last_updated = datetime.now(timezone.utc)
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201


@conv_bp.route("/<conv_id>/branch", methods=["POST"])
@login_required
@limiter.limit("20 per minute")
def branch_conversation(current_user, conv_id):
    data       = request.get_json() or {}
    message_id = data.get("message_id")

    conv = _owned(conv_id, current_user.id)
    if not conv:
        return jsonify({"error": "Not found"}), 404

    branch_msgs = []
    for m in conv.messages:
        branch_msgs.append(m)
        if message_id and m.id == message_id:
            break

    if not branch_msgs:
        return jsonify({"error": "No messages to branch from"}), 400

    new_conv = Conversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=f"↳ {conv.title[:80]}",
        last_updated=datetime.now(timezone.utc),
    )
    db.session.add(new_conv)

    for m in branch_msgs:
        db.session.add(Message(
            id=str(uuid.uuid4()),
            conversation_id=new_conv.id,
            role=m.role,
            content=m.content,
            is_error=m.is_error,
            model=m.model,
            timestamp=m.timestamp,
        ))

    db.session.commit()

    result = new_conv.to_dict()
    result["messages"] = [m.to_dict() for m in new_conv.messages]
    return jsonify(result), 201


def _owned(conv_id: str, user_id: str):
    return Conversation.query.filter_by(id=conv_id, user_id=user_id).first()
