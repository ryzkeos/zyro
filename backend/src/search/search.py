from flask import Blueprint, request, jsonify
from ..core.models import Message, Conversation
from ..core.auth_guard import login_required
from ..core.limiter import limiter

search_bp = Blueprint("search", __name__, url_prefix="/api/search")


@search_bp.route("/", methods=["GET"])
@login_required
@limiter.limit("30 per minute")
def search_messages(current_user):
    q = request.args.get("q", "").strip()
    q = q[:100]
    if len(q) < 2:
        return jsonify([]), 200

    results = (
        Message.query
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == current_user.id)
        .filter(Message.content.ilike(f"%{q}%"))
        .filter(Message.is_error == False)
        .order_by(Conversation.last_updated.desc())
        .limit(25)
        .all()
    )

    return jsonify([
        {
            "messageId":        msg.id,
            "conversationId":   msg.conversation.id,
            "conversationTitle": msg.conversation.title,
            "role":             msg.role,
            "snippet":          _snippet(msg.content, q),
            "timestamp":        msg.timestamp,
        }
        for msg in results
    ]), 200


def _snippet(content: str, query: str, ctx: int = 90) -> str:
    lo  = content.lower()
    idx = lo.find(query.lower())
    if idx == -1:
        return content[:ctx * 2]
    s   = max(0, idx - ctx)
    e   = min(len(content), idx + len(query) + ctx)
    out = content[s:e]
    if s > 0:       out = "…" + out
    if e < len(content): out = out + "…"
    return out
