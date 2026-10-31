import jwt as pyjwt
from flask import request, current_app
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def _key_func() -> str:
    try:
        cookie_name = current_app.config.get("JWT_COOKIE_NAME", "zyro_token")
        token = request.cookies.get(cookie_name)
        if token:
            secret = current_app.config.get("SECRET_KEY", "")
            payload = pyjwt.decode(token, secret, algorithms=["HS256"])
            return f"user:{payload['user_id']}"
    except Exception:
        pass
    return get_remote_address()


limiter = Limiter(
    key_func=_key_func,
    strategy="fixed-window",
    default_limits=[],
)
