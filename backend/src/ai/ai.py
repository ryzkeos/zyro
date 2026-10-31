import json
import base64
import requests
from flask import Blueprint, request, jsonify, Response, current_app, stream_with_context
from ..core.auth_guard import optional_auth, login_required
from ..core.config import Config
from ..core.limiter import limiter
from .ai_cache import get_cached, set_cached, get_stream, set_stream

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

from ..core.project import XENON_MODEL, YURUZU_MODEL

XENON_MODELS  = {"xenon-1.0"}
YURUZU_MODELS = {"yuruzu-1.0"}
DEFAULT_MODEL = "xenon-1.0"
YURUZU_BASE   = "https://generativelanguage.googleapis.com/v1beta/models"
XENON_BASE    = "https://api.groq.com/openai/v1/chat/completions"


class TerminalAPIError(Exception):
    pass


class RetryableAPIError(Exception):
    pass


def _try_xenon(api_key, model, msgs, max_tokens=8192, temperature=0.7, stream=True):
    resp = requests.post(
        XENON_BASE,
        json={
            "model": model, "messages": msgs, "stream": stream,
            "temperature": temperature, "max_tokens": max_tokens, "top_p": 0.95,
        },
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        stream=stream, timeout=120,
    )
    if resp.status_code in (401, 403): raise TerminalAPIError("Invalid XENON_API_KEY.")
    if resp.status_code == 404:        raise TerminalAPIError(f"Model not found: {model}")
    if resp.status_code == 429:        raise RetryableAPIError("Rate limit on this key.")
    if not resp.ok:                    raise RetryableAPIError(f"API error {resp.status_code}")
    return resp


def _stream_xenon(resp):
    for line in resp.iter_lines():
        if not line:
            continue
        decoded = line.decode("utf-8", errors="replace")
        if not decoded.startswith("data: "):
            continue
        payload = decoded[6:].strip()
        if payload == "[DONE]":
            break
        try:
            text = json.loads(payload).get("choices", [{}])[0].get("delta", {}).get("content", "")
            if text:
                yield "data: " + json.dumps({"text": text}) + "\n\n"
        except (json.JSONDecodeError, IndexError, KeyError):
            continue
    yield "data: [DONE]\n\n"


def _build_yuruzu_contents(messages: list) -> list:
    contents = []
    for m in messages:
        role    = "user" if m.get("role") == "user" else "model"
        text    = str(m.get("content", "")).strip()
        image   = m.get("image")
        img_type = m.get("imageType", "image/jpeg")

        parts = []
        if image:
            try:
                if isinstance(image, str) and image.startswith("data:"):
                    header, b64data = image.split(",", 1)
                    mime = header.split(";")[0].split(":")[1]
                    parts.append({"inlineData": {"mimeType": mime, "data": b64data}})
                else:
                    raw = base64.b64decode(image)
                    b64 = base64.b64encode(raw).decode()
                    parts.append({"inlineData": {"mimeType": img_type, "data": b64}})
            except Exception:
                pass

        if text:
            parts.append({"text": text})

        if not parts:
            continue

        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"].extend(parts)
        else:
            contents.append({"role": role, "parts": parts})

    return contents


def _try_yuruzu(api_key, model, payload, stream=True):
    method = "streamGenerateContent" if stream else "generateContent"
    qs     = "?alt=sse" if stream else "?"
    url    = f"{YURUZU_BASE}/{model}:{method}{qs}&key={api_key}"
    resp   = requests.post(url, json=payload, stream=stream, timeout=120)

    if resp.status_code in (401, 403): raise TerminalAPIError("Invalid YURUZU_API_KEY.")
    if resp.status_code == 404:        raise TerminalAPIError("Yuruzu model not found or unavailable.")
    if not resp.ok:
        if resp.status_code == 429: raise RetryableAPIError("Rate limit on this key.")
        if resp.status_code == 503: raise RetryableAPIError("Yuruzu service unavailable.")
        try:
            err_body = resp.json()
            err_msg  = err_body.get("error", {}).get("message", f"API error {resp.status_code}")
        except Exception:
            err_msg = f"API error {resp.status_code}"
        raise TerminalAPIError(f"Yuruzu error: {err_msg}")
    return resp


def _stream_yuruzu(resp):
    for line in resp.iter_lines():
        if not line:
            continue
        decoded = line.decode("utf-8", errors="replace")
        if not decoded.startswith("data: "):
            continue
        payload = decoded[6:].strip()
        if payload == "[DONE]":
            break
        try:
            chunk    = json.loads(payload)
            feedback = chunk.get("promptFeedback", {})
            if feedback.get("blockReason"):
                yield "data: " + json.dumps({"error": f"Prompt blocked: {feedback['blockReason']}"}) + "\n\n"
                yield "data: [DONE]\n\n"
                return
            candidates = chunk.get("candidates", [])
            if not candidates:
                continue
            cand   = candidates[0]
            finish = cand.get("finishReason", "")
            if finish in ("SAFETY", "RECITATION"):
                yield "data: " + json.dumps({"error": f"Response blocked by Yuruzu: {finish}"}) + "\n\n"
                yield "data: [DONE]\n\n"
                return
            parts = cand.get("content", {}).get("parts", [])
            for part in parts:
                text = part.get("text", "")
                if text:
                    yield "data: " + json.dumps({"text": text}) + "\n\n"
        except (json.JSONDecodeError, IndexError, KeyError):
            continue
    yield "data: [DONE]\n\n"


@ai_bp.route("/chat", methods=["POST"])
@optional_auth
@limiter.limit("40 per minute")
def chat(current_user):
    data          = request.get_json() or {}
    messages      = data.get("messages", [])
    system_prompt = data.get("systemPrompt", "")
    model_key     = data.get("model", DEFAULT_MODEL)
    stream_id     = data.get("stream_id", "")
    real_model    = XENON_MODEL if model_key in XENON_MODELS else YURUZU_MODEL
    use_xenon     = model_key in XENON_MODELS
    user_id       = current_user.id if current_user else "guest"

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    has_image = any(m.get("image") for m in messages)

    if not has_image:
        cached = get_cached(model_key, system_prompt, messages, user_id)
        if cached:
            def _replay():
                for i in range(0, len(cached), 512):
                    yield "data: " + json.dumps({"text": cached[i:i+512]}) + "\n\n"
                yield "data: [DONE]\n\n"
            return Response(stream_with_context(_replay()), mimetype="text/event-stream",
                            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    def generate():
        if use_xenon:
            keys = Config.XENON_API_KEY
            if not keys:
                yield "data: " + json.dumps({"error": "No XENON_API_KEY configured."}) + "\n\n"
                return

            xenon_msgs = []
            if system_prompt.strip():
                xenon_msgs.append({"role": "system", "content": system_prompt})
            for m in messages:
                c = str(m.get("content", "")).strip()
                if c:
                    xenon_msgs.append({
                        "role": "user" if m.get("role") == "user" else "assistant",
                        "content": c,
                    })

            last_error = None
            for key in keys:
                accumulated = []
                stream_complete = False
                try:
                    resp = _try_xenon(key, real_model, xenon_msgs)
                    for chunk in _stream_xenon(resp):
                        yield chunk
                        try:
                            inner = json.loads(chunk[6:])
                            if "text" in inner:
                                accumulated.append(inner["text"])
                        except Exception:
                            pass
                    stream_complete = True
                    full = "".join(accumulated)
                    if not full:
                        yield "data: " + json.dumps({"error": "Xenon returned an empty response."}) + "\n\n"
                        return
                    if stream_complete:
                        if not has_image:
                            set_cached(model_key, system_prompt, messages, full, user_id)
                        if stream_id:
                            set_stream(stream_id, full)
                    return
                except TerminalAPIError as e:
                    yield "data: " + json.dumps({"error": str(e)}) + "\n\n"
                    return
                except RetryableAPIError as e:
                    last_error = e
                    continue
                except requests.exceptions.Timeout:
                    last_error = Exception("Request timed out.")
                    continue
                except requests.exceptions.ConnectionError:
                    yield "data: " + json.dumps({"error": "Cannot connect to Xenon backend."}) + "\n\n"
                    return
                except Exception as e:
                    last_error = e
                    continue
            yield "data: " + json.dumps({"error": "Xenon rate limit reached. Try again shortly."}) + "\n\n"
            return

        keys = Config.YURUZU_API_KEY
        if not keys:
            yield "data: " + json.dumps({"error": "No YURUZU_API_KEY configured."}) + "\n\n"
            return

        contents = _build_yuruzu_contents(messages)
        if not contents:
            yield "data: " + json.dumps({"error": "No valid message content."}) + "\n\n"
            return

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.9,
                "maxOutputTokens": 8192,
                "topP": 0.95,
            },
        }
        if system_prompt.strip():
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        last_error = None
        for key in keys:
            accumulated = []
            stream_complete = False
            try:
                resp = _try_yuruzu(key, real_model, payload)
                for chunk in _stream_yuruzu(resp):
                    yield chunk
                    try:
                        inner = json.loads(chunk[6:])
                        if "text" in inner:
                            accumulated.append(inner["text"])
                    except Exception:
                        pass
                stream_complete = True
                full = "".join(accumulated)
                if full:
                    if stream_complete:
                        if not has_image:
                            set_cached(model_key, system_prompt, messages, full, user_id)
                        if stream_id:
                            set_stream(stream_id, full)
                    return
                yield "data: " + json.dumps({"error": "Yuruzu returned an empty response. Check your prompt or quota."}) + "\n\n"
                return
            except TerminalAPIError as e:
                yield "data: " + json.dumps({"error": str(e)}) + "\n\n"
                return
            except RetryableAPIError as e:
                last_error = e
                continue
            except requests.exceptions.Timeout:
                last_error = Exception("Request timed out.")
                continue
            except requests.exceptions.ConnectionError:
                yield "data: " + json.dumps({"error": "Cannot connect to Yuruzu backend."}) + "\n\n"
                return
            except Exception as e:
                yield "data: " + json.dumps({"error": f"Yuruzu error: {str(e)}"}) + "\n\n"
                return
        yield "data: " + json.dumps({"error": "Yuruzu rate limit reached on all keys. Try again shortly."}) + "\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@ai_bp.route("/resume/<stream_id>", methods=["GET"])
@optional_auth
def resume_stream(current_user, stream_id):
    text = get_stream(stream_id)
    if not text:
        return jsonify({"error": "Stream not found or expired."}), 404
    return jsonify({"text": text}), 200


@ai_bp.route("/auto-title", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
def auto_title(current_user):
    messages = (request.get_json() or {}).get("messages", [])
    if not messages:
        return jsonify({"error": "No messages"}), 400

    exchange = "\n".join(
        m.get("role", "").upper() + ": " + str(m.get("content", ""))[:300]
        for m in messages[:4]
    )
    prompt = (
        "Generate a short title (4-7 words) for this conversation. "
        "Reply with ONLY the title, no quotes, no punctuation at end:\n\n" + exchange
    )

    for key in Config.XENON_API_KEY:
        try:
            resp  = _try_xenon(key, XENON_MODEL,
                               [{"role": "user", "content": prompt}],
                               max_tokens=20, temperature=0.3, stream=False)
            title = resp.json()["choices"][0]["message"]["content"].strip()
            return jsonify({"title": title[:100]}), 200
        except Exception:
            continue

    for key in Config.YURUZU_API_KEY:
        try:
            resp  = _try_yuruzu(
                key, YURUZU_MODEL,
                {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 20, "temperature": 0.3},
                },
                stream=False,
            )
            title = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            return jsonify({"title": title[:100]}), 200
        except Exception:
            continue

    return jsonify({"error": "Could not generate title"}), 500


@ai_bp.route("/cache-status", methods=["GET"])
@login_required
def cache_status(current_user):
    import os, importlib

    url   = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip()
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()

    if not url:
        return jsonify({"redis": False, "error": "UPSTASH_REDIS_REST_URL not in environment"}), 200
    if not token:
        return jsonify({"redis": False, "error": "UPSTASH_REDIS_REST_TOKEN not in environment"}), 200

    try:
        from upstash_redis import Redis
        r = Redis(url=url, token=token)
        r.set("zyro:health", "1")
        val = r.get("zyro:health")
        r.delete("zyro:health")
        ok = val in ("1", 1, b"1")
        return jsonify({
            "redis": ok,
            "error": None if ok else f"SET/GET mismatch: got {repr(val)}",
        }), 200
    except ImportError:
        return jsonify({"redis": False, "error": "upstash_redis not installed — run: pip install upstash-redis==1.1.0"}), 200
    except Exception as e:
        return jsonify({"redis": False, "error": str(e)}), 200