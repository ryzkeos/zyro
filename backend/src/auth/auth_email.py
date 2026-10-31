import resend
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import Blueprint, request, jsonify, current_app
from ..core.models import db, User
from ..core.auth_guard import login_required

auth_email_bp = Blueprint("auth_email", __name__, url_prefix="/api/auth")

_SALT_VERIFY  = "zyro-email-verify-2026"
_SALT_RESET   = "zyro-password-reset-2026"
_VERIFY_EXPIRY = 86400
_RESET_EXPIRY  = 3600


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])


def _send_email(to: str, subject: str, html: str) -> str:
    api_key = current_app.config.get("RESEND_API_KEY", "")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured.")
    resend.api_key = api_key
    params = {
        "from": current_app.config.get("RESEND_FROM", "Zyro AI <onboarding@resend.dev>"),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    result = resend.Emails.send(params)
    if isinstance(result, dict):
        status = result.get("statusCode") or result.get("status_code")
        if status and int(status) >= 400:
            raise RuntimeError(f"Resend error {status}: {result.get('message', 'Unknown error')}")
        email_id = result.get("id", "")
        if not email_id:
            raise RuntimeError(f"Resend returned no email ID: {result}")
        return email_id
    raise RuntimeError(f"Unexpected Resend response: {result}")


def _verify_email_html(url: str, username: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'IBM Plex Mono',monospace">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:48px 16px">
    <table width="480" style="background:#111;border:1px solid #222;padding:48px">
      <tr><td>
        <p style="color:#555;font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 24px">Zyro AI</p>
        <h1 style="color:#d8d8d8;font-size:18px;font-weight:700;letter-spacing:.1em;margin:0 0 16px;text-transform:uppercase">Verify your email</h1>
        <p style="color:#888;font-size:13px;line-height:1.75;margin:0 0 32px">
          Hi {username}, click the button below within 24 hours to activate your Zyro account.
        </p>
        <a href="{url}" style="display:inline-block;padding:14px 32px;background:#d8d8d8;color:#000;
           text-decoration:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700">
          Verify Email
        </a>
        <p style="color:#444;font-size:11px;margin:32px 0 0;line-height:1.6">
          If you didn't create a Zyro account, ignore this email.<br>
          Link expires in 24 hours.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _reset_email_html(url: str, username: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'IBM Plex Mono',monospace">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:48px 16px">
    <table width="480" style="background:#111;border:1px solid #222;padding:48px">
      <tr><td>
        <p style="color:#555;font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 24px">Zyro AI</p>
        <h1 style="color:#d8d8d8;font-size:18px;font-weight:700;letter-spacing:.1em;margin:0 0 16px;text-transform:uppercase">Reset your password</h1>
        <p style="color:#888;font-size:13px;line-height:1.75;margin:0 0 32px">
          Hi {username}, click the button below within 1 hour to set a new password.
        </p>
        <a href="{url}" style="display:inline-block;padding:14px 32px;background:#d8d8d8;color:#000;
           text-decoration:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700">
          Reset Password
        </a>
        <p style="color:#444;font-size:11px;margin:32px 0 0;line-height:1.6">
          If you didn't request a reset, ignore this email.<br>
          Link expires in 1 hour.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


@auth_email_bp.route("/send-verification", methods=["POST"])
@login_required
def send_verification(current_user):
    if current_user.email_verified:
        return jsonify({"message": "Already verified"}), 200
    token = _serializer().dumps(current_user.email, salt=_SALT_VERIFY)
    url   = f"{current_app.config['FRONTEND_URL']}?verify_token={token}"
    try:
        _send_email(current_user.email, "Verify your Zyro email",
                    _verify_email_html(url, current_user.username))
    except Exception as e:
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500
    return jsonify({"message": "Verification email sent"}), 200


@auth_email_bp.route("/verify-email", methods=["POST"])
def verify_email():
    token = (request.get_json() or {}).get("token", "")
    try:
        email = _serializer().loads(token, salt=_SALT_VERIFY, max_age=_VERIFY_EXPIRY)
    except SignatureExpired:
        return jsonify({"error": "Verification link expired. Please request a new one."}), 400
    except BadSignature:
        return jsonify({"error": "Invalid verification link."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404
    user.email_verified = True
    db.session.commit()
    return jsonify({"message": "Email verified successfully."}), 200


@auth_email_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    email = (request.get_json() or {}).get("email", "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user:
        token = _serializer().dumps(email, salt=_SALT_RESET)
        url   = f"{current_app.config['FRONTEND_URL']}?reset_token={token}"
        try:
            _send_email(email, "Reset your Zyro password",
                        _reset_email_html(url, user.username))
        except Exception:
            pass
    return jsonify({"message": "If that email exists, a reset link was sent."}), 200


@auth_email_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data     = request.get_json() or {}
    token    = data.get("token", "")
    password = (data.get("password") or "").strip()

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    try:
        email = _serializer().loads(token, salt=_SALT_RESET, max_age=_RESET_EXPIRY)
    except SignatureExpired:
        return jsonify({"error": "Reset link expired. Please request a new one."}), 400
    except BadSignature:
        return jsonify({"error": "Invalid reset link."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    import bcrypt
    user.password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    return jsonify({"message": "Password updated successfully."}), 200
