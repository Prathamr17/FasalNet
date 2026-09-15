import os
import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("fasalnet.grok_service")

XAI_API_ENDPOINT = "https://api.x.ai/v1/chat/completions"

# Memory tracking of key cooldowns (slot_idx -> cooldown_expiry_timestamp)
_KEY_COOLDOWNS: Dict[int, float] = {}
KEY_COOLDOWN_DURATION_SEC = 300  # 5 minutes cooldown for exhausted keys


def _get_key_slots() -> List[Tuple[int, str]]:
    """Retrieve available XAI API key slots without exposing raw values."""
    slots = []
    for idx in (1, 2, 3):
        key = (os.environ.get(f"XAI_API_KEY_{idx}") or "").strip()
        if key:
            slots.append((idx, key))
            
    # Fallback to general XAI_API_KEY if specific slots are not set
    if not slots:
        single_key = (os.environ.get("XAI_API_KEY") or "").strip()
        if single_key:
            slots.append((1, single_key))
            
    return slots


def reset_key_cooldowns():
    """Reset all key cooldowns (used for testing or explicit reload)."""
    global _KEY_COOLDOWNS
    _KEY_COOLDOWNS.clear()


def _call_gemini_fallback(
    prompt: Optional[str] = None,
    messages: Optional[List[Dict[str, str]]] = None,
    system_instruction: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.3,
    json_mode: bool = False,
    timeout_sec: int = 6,
    request_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Seamlessly call Google Gemini GenAI as an active intelligent fallback
    when xAI credits are exhausted or rate-limited.
    """
    req_id = request_id or str(uuid.uuid4())[:8]
    gemini_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not gemini_key:
        return None, None, "NO_GEMINI_KEY"

    # Prioritize fast, high-quota lightweight flash models
    gemini_models = ["gemini-flash-lite-latest", "gemini-flash-latest"]
    
    contents = []
    if messages:
        for msg in messages:
            role = "user" if msg.get("role") in ("user", "human") else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content") or msg.get("text") or ""}]
            })
    elif prompt:
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

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

    for g_model in gemini_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
        try:
            logger.info(f"[Req {req_id}] Calling GenAI fallback '{g_model}'...")
            resp = requests.post(url, json=body, timeout=timeout_sec)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text_res = parts[0].get("text", "")
                        logger.info(f"[Req {req_id}] Success via GenAI fallback '{g_model}'.")
                        return text_res, g_model, None
            else:
                logger.warning(f"[Req {req_id}] GenAI fallback '{g_model}' returned HTTP {resp.status_code}.")
        except Exception as e:
            logger.warning(f"[Req {req_id}] GenAI fallback '{g_model}' request failed: {e}")
            continue

    return None, None, "GEMINI_UNAVAILABLE"


def test_grok_connection(request_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Minimal isolated test function that sends 'Reply with exactly: FasalNet Grok connection working'
    to Grok without RAG, XGBoost, weather, or frontend overhead.
    """
    req_id = request_id or str(uuid.uuid4())[:8]
    prompt = "Reply with exactly: FasalNet Grok connection working"
    logger.info(f"[Req {req_id}] Executing isolated minimal Grok API connection test...")
    
    reply, model_used, err_code = call_grok_llm(
        prompt=prompt,
        max_tokens=50,
        request_id=req_id
    )
    
    slots = [idx for idx, _ in _get_key_slots()]
    if reply:
        return {
            "success": True,
            "status": "connected",
            "request_id": req_id,
            "model_used": model_used,
            "key_slots_configured": slots,
            "answer": reply.strip()
        }
    else:
        return {
            "success": False,
            "status": "failed",
            "request_id": req_id,
            "error_code": err_code or "AI_SERVICE_UNAVAILABLE",
            "key_slots_configured": slots,
            "message": "xAI Grok connection test failed (all configured keys exhausted or unavailable)."
        }


def call_grok_llm(
    prompt: Optional[str] = None,
    messages: Optional[List[Dict[str, str]]] = None,
    system_instruction: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.3,
    json_mode: bool = False,
    timeout_sec: int = 25,
    request_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Call xAI Grok API with 3-key failover, correlation request ID, cooldown tracking, and safe logging.
    
    Returns:
        (generated_text, model_used, error_code)
        error_code is a clean, sanitized string (e.g. "AI_SERVICE_UNAVAILABLE" or "NO_KEYS_CONFIGURED").
        Raw API keys, error details, and provider JSON are NEVER exposed.
    """
    req_id = request_id or str(uuid.uuid4())[:8]
    all_key_slots = _get_key_slots()
    if not all_key_slots:
        logger.error(f"[Req {req_id}] No xAI API keys configured in environment.")
        return None, None, "NO_KEYS_CONFIGURED"

    now = time.time()
    
    # Filter available key slots based on active cooldowns
    available_slots = [(idx, k) for idx, k in all_key_slots if _KEY_COOLDOWNS.get(idx, 0) < now]
    if not available_slots:
        logger.info(f"[Req {req_id}] All Grok key slots are currently on cooldown ({len(all_key_slots)} configured). Skipping to GenAI fallback...")

    target_model = os.environ.get("XAI_MODEL", "grok-4.6").strip() or "grok-4.6"
    models_to_try = [target_model]
    for m in ["grok-4.6", "grok-3", "grok-2-1212", "grok-beta"]:
        if m not in models_to_try:
            models_to_try.append(m)

    # Format message payload
    formatted_messages = []
    if system_instruction:
        formatted_messages.append({"role": "system", "content": system_instruction})

    if messages:
        for msg in messages:
            role = msg.get("role") or msg.get("sender") or "user"
            if role in ("assistant", "ai"):
                role = "assistant"
            elif role in ("system",):
                role = "system"
            else:
                role = "user"
            formatted_messages.append({"role": role, "content": msg.get("content") or msg.get("text") or ""})
    elif prompt:
        formatted_messages.append({"role": "user", "content": prompt})

    payload_base = {
        "messages": formatted_messages,
        "temperature": 0.2 if json_mode else temperature,
        "max_tokens": max_tokens
    }
    if json_mode:
        payload_base["response_format"] = {"type": "json_object"}

    # Key Slot Iteration with Failover (Key 1 -> Key 2 -> Key 3)
    attempt_num = 0
    for slot_idx, api_key in available_slots:
        attempt_num += 1
        logger.info(f"[Req {req_id}] Attempt #{attempt_num} | Key Slot #{slot_idx} (loaded=True) | Target: {target_model} | Endpoint: {XAI_API_ENDPOINT}")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # Try active models for this key
        for model_name in models_to_try:
            payload = dict(payload_base)
            payload["model"] = model_name

            try:
                resp = requests.post(
                    XAI_API_ENDPOINT,
                    headers=headers,
                    json=payload,
                    timeout=timeout_sec
                )

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        reply_content = choices[0].get("message", {}).get("content", "")
                        # Clear any previous cooldown on success
                        _KEY_COOLDOWNS.pop(slot_idx, None)
                        logger.info(f"[Req {req_id}] Success on Key Slot #{slot_idx} with model '{model_name}'.")
                        return reply_content, model_name, None

                # Handle provider quota / credit limit / rate limit
                if resp.status_code == 403:
                    # Access denied / Spending limit / Quota exhausted
                    logger.warning(f"[Req {req_id}] Provider Status 403 on Key Slot #{slot_idx} (Error Category: PROVIDER_CREDIT_LIMIT). Placing slot on {KEY_COOLDOWN_DURATION_SEC}s cooldown.")
                    _KEY_COOLDOWNS[slot_idx] = time.time() + KEY_COOLDOWN_DURATION_SEC
                    break  # Skip to next key slot immediately

                elif resp.status_code == 429:
                    # Rate limit exceeded
                    logger.warning(f"[Req {req_id}] Provider Status 429 on Key Slot #{slot_idx} (Error Category: RATE_LIMIT). Placing slot on 60s cooldown.")
                    _KEY_COOLDOWNS[slot_idx] = time.time() + 60
                    break  # Skip to next key slot

                elif resp.status_code == 400:
                    # Model not found or bad argument
                    logger.warning(f"[Req {req_id}] Provider Status 400 on Key Slot #{slot_idx} for model '{model_name}' (Error Category: INVALID_MODEL_OR_ARGUMENT). Trying fallback model...")
                    continue

                elif resp.status_code in (500, 502, 503, 504):
                    logger.warning(f"[Req {req_id}] Provider Status {resp.status_code} server error on Key Slot #{slot_idx} (Error Category: SERVER_ERROR). Failing over to next key slot.")
                    break

                else:
                    logger.warning(f"[Req {req_id}] Provider Status {resp.status_code} on Key Slot #{slot_idx} (Error Category: HTTP_ERROR). Failing over to next key slot.")
                    break

            except requests.exceptions.Timeout:
                logger.warning(f"[Req {req_id}] Request Timeout after {timeout_sec}s on Key Slot #{slot_idx} (Error Category: TIMEOUT). Failing over to next key slot.")
                break
            except requests.exceptions.RequestException as req_err:
                logger.warning(f"[Req {req_id}] Network Exception on Key Slot #{slot_idx} (Error Category: NETWORK_EXCEPTION): {req_err}. Failing over to next key slot.")
                break

        # Slight backoff before attempting next key slot
        time.sleep(0.3)

    # If Grok keys failed or were exhausted, automatically invoke Gemini GenAI active fallback
    if os.environ.get("GEMINI_API_KEY"):
        logger.info(f"[Req {req_id}] Grok unavailable. Engaging Gemini GenAI active fallback...")
        g_reply, g_model, g_err = _call_gemini_fallback(
            prompt=prompt,
            messages=messages,
            system_instruction=system_instruction,
            max_tokens=max_tokens,
            temperature=temperature,
            json_mode=json_mode,
            timeout_sec=timeout_sec,
            request_id=req_id
        )
        if g_reply:
            return g_reply, f"{g_model} (Active)", None

    logger.error(f"[Req {req_id}] All configured AI key slots failed or exhausted (Error Category: ALL_KEYS_UNAVAILABLE).")
    return None, None, "AI_SERVICE_UNAVAILABLE"


