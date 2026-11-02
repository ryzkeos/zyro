import json
from flask import Blueprint, request, jsonify, current_app
from pywebpush import webpush, WebPushException
from ..core.models import db, PushSubscription
from ..core.auth_guard import login_required
from ..core.config import Config
from ..core.limiter import limiter

push_bp = Blueprint("push", __name__, url_prefix="/api/push")


@push_bp.route("/vapid-public-key", methods=["GET"])
def vapid_public_key():
    return jsonify({"publicKey": Config.VAPID_PUBLIC_KEY}), 200


@push_bp.route("/subscribe", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def subscribe(current_user):
    sub  = request.get_json() or {}
    endpoint = sub.get("endpoint")
    if not endpoint:
        return jsonify({"error": "Missing endpoint"}), 400
    if not PushSubscription.query.filter_by(user_id=current_user.id, endpoint=endpoint).first():
        ps = PushSubscription(
            user_id  = current_user.id,
            endpoint = endpoint,
            p256dh   = sub.get("keys", {}).get("p256dh", ""),
            auth     = sub.get("keys", {}).get("auth", ""),
        )
        db.session.add(ps)
        db.session.commit()
    return jsonify({"message": "Subscribed"}), 201


@push_bp.route("/unsubscribe", methods=["POST"])
@limiter.limit("10 per minute")
@login_required
def unsubscribe(current_user):
    endpoint = (request.get_json() or {}).get("endpoint")
    if endpoint:
        PushSubscription.query.filter_by(user_id=current_user.id, endpoint=endpoint).delete()
        db.session.commit()
    return jsonify({"message": "Unsubscribed"}), 200


def send_push(user_id: str, title: str, body: str, url: str = "/") -> None:
    """Call from anywhere to push to all of a user's devices."""
    if not Config.VAPID_PRIVATE_KEY or not Config.VAPID_PUBLIC_KEY:
        return
    subs = PushSubscription.query.filter_by(user_id=user_id).all()
    payload = json.dumps({"title": title, "body": body, "url": url})
    dead = []
    for ps in subs:
        try:
            webpush(
                subscription_info={"endpoint": ps.endpoint,
                                   "keys": {"p256dh": ps.p256dh, "auth": ps.auth}},
                data=payload,
                vapid_private_key=Config.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{Config.VAPID_CLAIMS_EMAIL}"},
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                dead.append(ps)
    for ps in dead:
        db.session.delete(ps)
    if dead:
        db.session.commit()
