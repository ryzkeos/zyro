import json
import requests
from flask import Blueprint, request, jsonify, Response, current_app, stream_with_context
from middleware.auth_guard import optional_auth
from config import Config

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

MODEL_MAP = {
    "xenon-1.0": "openai/gpt-oss-120b",
    "yuruzu-1.0": "gemini-3-flash-preview",
}

# Which provider handles each model key
XENON_MODELS = {"xenon-1.0"}

DEFAULT_MODEL = "xenon-1.0"
YURUZU_BASE   = "https://generativelanguage.googleapis.com/v1beta/models"
XENON_BASE    = "https://api.groq.com/openai/v1/chat/completions"


# ── Custom Exceptions (must be defined before helper functions) ───────────────

class TerminalAPIError(Exception):
    """Error where retrying with another key won't help."""
    pass


class RetryableAPIError(Exception):
    """Error that may succeed with a different key."""
    pass


# ── Provider helpers ──────────────────────────────────────────────────────────

def _try_xenon_with_key(api_key, real_model, xenon_msgs):
    """Attempt a streaming Xenon (OpenRouter) request with one key. Raises on errors."""
    resp = requests.post(
        XENON_BASE,
        json={
            "model": real_model,
            "messages": xenon_msgs,
            "stream": True,
            "temperature": 1,
            "max_completion_tokens": 8192,
            "top_p": 1,
            "reasoning_effort": "medium",
            "stop": None,
        },
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        stream=True,
        timeout=120,
    )
    if resp.status_code in (401, 403):
        raise TerminalAPIError("Invalid XENON_API_KEY — make sure it's a Groq key (gsk_...)")
    if resp.status_code == 404:
        raise TerminalAPIError(f"OpenRouter model not found: {real_model}")
    if resp.status_code == 429:
        raise RetryableAPIError("OpenRouter rate limit on this key.")
    if not resp.ok:
        raise RetryableAPIError(f"OpenRouter API error {resp.status_code}")
    return resp


def _stream_xenon_response(resp):
    """Parse Xenon SSE (OpenAI format) and yield SSE chunks."""
    for line in resp.iter_lines():
        if not line:
            continue
        decoded = line.decode("utf-8", errors="replace")
        if not decoded.startswith("data: "):
            continue
        payload_str = decoded[6:].strip()
        if payload_str == "[DONE]":
            break
        try:
            chunk = json.loads(payload_str)
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            text = delta.get("content", "")
            if text:
                yield f"data: {json.dumps({'text': text})}\n\n"
        except (json.JSONDecodeError, IndexError, KeyError):
            continue
    yield "data: [DONE]\n\n"


def _try_yuruzu_with_key(api_key, real_model, payload):
    url = f"{YURUZU_BASE}/{real_model}:streamGenerateContent?alt=sse&key={api_key}"
    resp = requests.post(url, json=payload, stream=True, timeout=120)

    if resp.status_code in (401, 403, 404):
        try:
            err_body = resp.json()
            err_msg = err_body.get("error", {}).get("message", f"API error {resp.status_code}")
        except Exception:
            err_msg = f"API error {resp.status_code}"

        if resp.status_code in (401, 403):
            err_msg = "Invalid API key. Check YURUZU_API_KEY in backend/.env"
        elif resp.status_code == 404:
            err_msg = "Model not found or unavailable in your region."

        raise TerminalAPIError(err_msg)

    if not resp.ok:
        if resp.status_code == 429:
            raise RetryableAPIError("Rate limit reached on this key.")
        raise RetryableAPIError(f"API error {resp.status_code}")

    return resp


def _stream_yuruzu_response(resp, model_key_name):
    for line in resp.iter_lines():
        if not line:
            continue
        decoded = line.decode("utf-8", errors="replace")
        if not decoded.startswith("data: "):
            continue
        payload_str = decoded[6:].strip()
        if payload_str == "[DONE]":
            break
        try:
            chunk = json.loads(payload_str)
            candidates = chunk.get("candidates", [])
            if candidates:
                finish_reason = candidates[0].get("finishReason", "")
                if finish_reason == "SAFETY":
                    yield f"data: {json.dumps({'error': 'Response blocked by safety filter.'})}\n\n"
                    return
                text = (
                    candidates[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if text:
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except (json.JSONDecodeError, IndexError, KeyError):
            continue

    yield "data: [DONE]\n\n"


# ── Route ─────────────────────────────────────────────────────────────────────

@ai_bp.route("/chat", methods=["POST"])
@optional_auth
def chat(current_user):
    data = request.get_json() or {}
    messages = data.get("messages", [])
    system_prompt = data.get("systemPrompt", "")
    model_key = data.get("model", "xenon-1.0")
    model_key_name = model_key.replace("-", " - ").title()

    real_model = MODEL_MAP.get(model_key, MODEL_MAP[DEFAULT_MODEL])
    use_xenon = model_key in XENON_MODELS

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    def generate():
        # ── Xenon path (OpenRouter) ────────────────────────────────────────
        if use_xenon:
            xenon_keys = Config.XENON_API_KEY
            if not xenon_keys:
                yield f"data: {json.dumps({'error': 'No XENON_API_KEY configured in backend/.env'})}\n\n"
                return

            xenon_msgs = []
            if system_prompt.strip():
                xenon_msgs.append({"role": "system", "content": system_prompt})
            for m in messages:
                role = "user" if m.get("role") == "user" else "assistant"
                content = str(m.get("content", "")).strip()
                if content:
                    xenon_msgs.append({"role": role, "content": content})

            last_error = None
            for api_key in xenon_keys:
                try:
                    resp = _try_xenon_with_key(api_key, real_model, xenon_msgs)
                    yield from _stream_xenon_response(resp)
                    return
                except TerminalAPIError as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    return
                except RetryableAPIError as e:
                    last_error = e
                    continue
                except requests.exceptions.Timeout:
                    last_error = Exception("Request timed out.")
                    continue
                except requests.exceptions.ConnectionError:
                    yield f"data: {json.dumps({'error': 'Cannot connect to Groq. Check internet.'})}\n\n"
                    return
                except Exception as e:
                    last_error = e
                    continue

            err_msg = (
                f"{model_key_name}'s rate limit reached on all Xenon keys. Wait a moment and try again."
                if isinstance(last_error, RetryableAPIError)
                else f"All Xenon keys failed. Last error: {str(last_error)}"
            )
            yield f"data: {json.dumps({'error': err_msg})}\n\n"
            return

        # ── Yuruzu path ───────────────────────────────────────────
        yuruzu_keys = Config.YURUZU_API_KEY
        if not yuruzu_keys:
            yield f"data: {json.dumps({'error': 'No YURUZU_API_KEY configured in backend/.env'})}\n\n"
            return

        contents = []
        for m in messages:
            role = "user" if m.get("role") == "user" else "model"
            content = str(m.get("content", "")).strip()
            if content:
                contents.append({"role": role, "parts": [{"text": content}]})

        if not contents:
            yield f"data: {json.dumps({'error': 'No valid message content'})}\n\n"
            return

        payload = {
            "contents": contents,
            "generationConfig": {"temperature": 0.9, "maxOutputTokens": 8192, "topP": 0.95},
        }
        if system_prompt.strip():
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        last_error = None
        for api_key in yuruzu_keys:
            try:
                resp = _try_yuruzu_with_key(api_key, real_model, payload)
                yield from _stream_yuruzu_response(resp, model_key_name)
                return
            except TerminalAPIError as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                return
            except RetryableAPIError as e:
                last_error = e
                continue
            except requests.exceptions.Timeout:
                last_error = Exception("Request timed out.")
                continue
            except requests.exceptions.ConnectionError:
                yield f"data: {json.dumps({'error': 'Cannot connect to Zyro. Check internet connection.'})}\n\n"
                return
            except Exception as e:
                last_error = e
                continue

        err_msg = (
            f"{model_key_name}'s rate limit reached on all keys. Wait a moment and try again."
            if isinstance(last_error, RetryableAPIError)
            else f"All keys failed. Last error: {str(last_error)}"
        )
        yield f"data: {json.dumps({'error': err_msg})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
