"""
FasalNet Gemini GenAI Service (Free Tier)
Handles natural-language reasoning, dynamic generation, and structured recommendations
via Google Gemini API with fallback models, categorized error handling, and safe diagnostic logging.
"""

import os
import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
import requests
from dotenv import load_dotenv

# Robustly load .env from backend directory or current working directory
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

logger = logging.getLogger("fasalnet.gemini_service")

# Supported Gemini Free Tier Models (Primary: Flash Lite for fast latency & high quota; Fallback: Flash Latest)
GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest"
]

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def get_gemini_api_key() -> str:
    """Retrieve GEMINI_API_KEY from environment without exposing raw values."""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key and os.path.exists(_env_path):
        load_dotenv(_env_path, override=True)
        key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        logger.error("GEMINI_API_KEY not configured in backend/.env")
    return key


def test_gemini_connection(request_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Minimal isolated test function that sends 'Reply exactly: FasalNet Gemini connection working'
    to Google Gemini without RAG, XGBoost, weather, or frontend overhead.
    """
    req_id = request_id or str(uuid.uuid4())[:8]
    prompt = "Reply exactly: FasalNet Gemini connection working"
    logger.info(f"[Req {req_id}] Executing isolated minimal Gemini Free Tier API connection test...")

    reply, model_used, err_code = call_gemini_llm(
        prompt=prompt,
        max_tokens=50,
        request_id=req_id
    )

    has_key = bool(get_gemini_api_key())
    if reply:
        return {
            "success": True,
            "status": "connected",
            "request_id": req_id,
            "model_used": model_used,
            "key_configured": has_key,
            "answer": reply.strip()
        }
    else:
        return {
            "success": False,
            "status": "failed",
            "request_id": req_id,
            "error_code": err_code or "AI_SERVICE_UNAVAILABLE",
            "key_configured": has_key,
            "message": "Gemini connection test failed. Please verify GEMINI_API_KEY and network access."
        }


def call_gemini_llm(
    prompt: Optional[str] = None,
    messages: Optional[List[Dict[str, str]]] = None,
    system_instruction: Optional[str] = None,
    max_tokens: int = 1500,
    temperature: float = 0.3,
    json_mode: bool = False,
    timeout_sec: int = 8,
    request_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Call Google Gemini GenAI API with multi-model fallback, timeout guardrails, and sanitized logging.

    Returns:
        (generated_text, model_used, error_code)
        error_code is a clean, sanitized string (e.g. "AI_SERVICE_UNAVAILABLE", "INVALID_API_KEY", "RATE_LIMIT_EXCEEDED").
        Raw API keys, error details, and provider JSON are NEVER exposed.
    """
    req_id = request_id or str(uuid.uuid4())[:8]
    gemini_key = get_gemini_api_key()
    if not gemini_key:
        return None, None, "NO_GEMINI_KEY"

    # Build Gemini request contents
    contents = []
    if messages:
        for msg in messages:
            role = "user" if msg.get("role") in ("user", "human") or msg.get("sender") == "user" else "model"
            content_text = msg.get("content") or msg.get("text") or ""
            if content_text:
                contents.append({
                    "role": role,
                    "parts": [{"text": content_text}]
                })
    elif prompt:
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

    if not contents:
        logger.warning(f"[Req {req_id}] Empty contents provided to Gemini.")
        return None, None, "EMPTY_INPUT"

    body: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2 if json_mode else temperature,
            "maxOutputTokens": max_tokens
        }
    }
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    if system_instruction:
        body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    last_error_code = "AI_SERVICE_UNAVAILABLE"
    t_start = time.time()

    for model_name in GEMINI_MODELS:
        url = f"{BASE_URL}/{model_name}:generateContent?key={gemini_key}"
        logger.info(f"[Req {req_id}] Invoking Gemini model '{model_name}' (json_mode={json_mode})...")

        try:
            resp = requests.post(url, json=body, timeout=timeout_sec)
            elapsed = time.time() - t_start

            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text_res = parts[0].get("text", "")
                        logger.info(f"[Req {req_id}] Success via '{model_name}' in {elapsed:.2f}s ({len(text_res)} chars).")
                        return text_res, model_name, None

            # Handle categorized errors
            if resp.status_code in (400, 401, 403):
                err_data = resp.json().get("error", {})
                status_str = err_data.get("status", "")
                if "API_KEY_INVALID" in status_str or resp.status_code == 401:
                    logger.error(f"[Req {req_id}] Gemini Error 401/403: Invalid or unauthorized API key.")
                    return None, None, "INVALID_API_KEY"
                logger.warning(f"[Req {req_id}] Gemini Error {resp.status_code} on '{model_name}': {err_data.get('message', '')[:100]}")
                last_error_code = "INVALID_REQUEST"

            elif resp.status_code == 429:
                logger.warning(f"[Req {req_id}] Gemini Rate Limit 429 on '{model_name}'. Trying fallback model...")
                last_error_code = "RATE_LIMIT_EXCEEDED"

            elif resp.status_code == 404:
                logger.warning(f"[Req {req_id}] Gemini Model '{model_name}' returned 404 (Not Found).")
                last_error_code = "MODEL_UNAVAILABLE"

            elif resp.status_code in (500, 502, 503, 504):
                logger.warning(f"[Req {req_id}] Gemini Server Error {resp.status_code} on '{model_name}'. Trying fallback model...")
                last_error_code = "AI_SERVICE_UNAVAILABLE"

            else:
                logger.warning(f"[Req {req_id}] Gemini unexpected HTTP {resp.status_code} on '{model_name}'.")
                last_error_code = "HTTP_ERROR"

        except requests.exceptions.Timeout:
            logger.warning(f"[Req {req_id}] Gemini Request Timeout after {timeout_sec}s on '{model_name}'.")
            last_error_code = "TIMEOUT"
        except requests.exceptions.RequestException as e:
            logger.warning(f"[Req {req_id}] Gemini Network Exception on '{model_name}': {e}")
            last_error_code = "NETWORK_ERROR"

    logger.error(f"[Req {req_id}] All configured Gemini models failed. Error Category: {last_error_code}")
    return None, None, last_error_code
