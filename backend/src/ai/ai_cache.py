import hashlib
import json
import os
from typing import Optional

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    url   = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
    if not url or not token:
        return None
    try:
        from upstash_redis import Redis
        _client = Redis(url=url, token=token)
        _client.ping()
    except Exception:
        _client = None
    return _client


def _prompt_key(model: str, system_prompt: str, messages: list, user_id: str) -> str:
    safe = [{"role": m.get("role", ""), "content": str(m.get("content", ""))} for m in messages]
    raw = json.dumps({"m": model, "s": system_prompt, "msgs": safe, "u": user_id},
                     sort_keys=True, ensure_ascii=False)
    return "zyro:ai:" + hashlib.sha256(raw.encode()).hexdigest()


def get_cached(model: str, system_prompt: str, messages: list, user_id: str) -> Optional[str]:
    r = _get_client()
    if not r:
        return None
    try:
        val = r.get(_prompt_key(model, system_prompt, messages, user_id))
        return val if isinstance(val, str) else None
    except Exception:
        return None


def set_cached(model: str, system_prompt: str, messages: list, reply: str, user_id: str) -> None:
    r = _get_client()
    if not r:
        return
    try:
        ttl = int(os.environ.get("REDIS_CACHE_TTL", 3600))
        r.setex(_prompt_key(model, system_prompt, messages, user_id), ttl, reply)
    except Exception:
        pass


_STREAM_TTL = 600


def get_stream(stream_id: str) -> Optional[str]:
    r = _get_client()
    if not r:
        return None
    try:
        val = r.get(f"zyro:stream:{stream_id}")
        return val if isinstance(val, str) else None
    except Exception:
        return None


def set_stream(stream_id: str, text: str) -> None:
    r = _get_client()
    if not r:
        return
    try:
        r.setex(f"zyro:stream:{stream_id}", _STREAM_TTL, text)
    except Exception:
        pass


def ping_cache() -> bool:
    r = _get_client()
    if not r:
        return False
    try:
        r.ping()
        return True
    except Exception:
        return False