"""
FasalNet AI Advisor Blueprint
Endpoints:
  - GET/POST /api/ai/market-advice : Structured multi-signal recommendation (XGBoost + Weather + RAG + LLM)
  - POST     /api/ai/chat          : Interactive natural-language agricultural advisor
  - GET/POST /api/ai/grok-test     : Isolated minimal Grok API connection health test
  - GET      /api/ai/sources       : List of verified ICAR / SAU knowledge sources in RAG
  - GET      /api/ai/health        : Health check of RAG + AI pipeline
"""

import uuid
import logging
from flask import Blueprint, request, jsonify
from services.ai_recommendation_service import (
    get_agricultural_market_advice,
    ask_ai_farmer_chat
)
from services.gemini_service import test_gemini_connection
from rag.vector_store import get_vector_store

logger = logging.getLogger("fasalnet.routes.ai_advisor")
ai_bp = Blueprint("ai_advisor", __name__, url_prefix="/api/ai")


@ai_bp.route("/gemini-test", methods=["GET", "POST"])
@ai_bp.route("/grok-test", methods=["GET", "POST"])
def gemini_test():
    """
    Isolated minimal Gemini API connection test without RAG/XGBoost/weather overhead.
    """
    req_id = str(uuid.uuid4())[:8]
    result = test_gemini_connection(request_id=req_id)
    status_code = 200 if result.get("success") else 503
    return jsonify(result), status_code


@ai_bp.route("/market-advice", methods=["GET", "POST"])
@ai_bp.route("/recommendation", methods=["GET", "POST"])
def market_advice():
    """
    Generate grounded AI agricultural recommendation combining:
    GPS/Nearby Markets -> Open-Meteo Weather -> XGBoost 7/14d Forecast -> RAG Knowledge -> LLM Advisory.
    """
    req_id = str(uuid.uuid4())[:8]
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            city = data.get("city") or data.get("market") or "Sangli"
            commodity = data.get("commodity") or "Onion"
            days = data.get("days", 7)
            lat = data.get("lat") or data.get("latitude")
            lon = data.get("lon") or data.get("longitude")
            user_query = data.get("query") or data.get("user_query")
            language = data.get("language") or data.get("lang") or "en"
        else:
            city = request.args.get("city") or request.args.get("market") or "Sangli"
            commodity = request.args.get("commodity") or "Onion"
            days = request.args.get("days", 7, type=int)
            lat = request.args.get("lat", type=float)
            lon = request.args.get("lon", type=float)
            user_query = request.args.get("query")
            language = request.args.get("language") or request.args.get("lang") or "en"

        # Validate horizon
        days = 14 if int(days) == 14 else 7

        result = get_agricultural_market_advice(
            city=city,
            commodity=commodity,
            days=days,
            lat=lat,
            lon=lon,
            user_query=user_query,
            language=language
        )

        if result.get("status") == "error":
            error_code = result.get("error_code")
            status_code = 503 if error_code == "AI_SERVICE_UNAVAILABLE" else 422
            return jsonify(result), status_code

        result["request_id"] = req_id
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"[Req {req_id}] Error in /api/ai/market-advice: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "error",
            "code": "INTERNAL_ERROR",
            "error_code": "INTERNAL_ERROR",
            "message": "AI Advisor is temporarily unavailable. Please try again in a moment.",
            "error": "AI Advisor is temporarily unavailable. Please try again in a moment.",
            "request_id": req_id
        }), 500


@ai_bp.route("/chat", methods=["POST"])
def ai_chat():
    """
    Conversational AI Farmer Assistant.
    Answers natural-language agricultural questions grounded strictly in
    known market data, XGBoost predictions, Open-Meteo weather, and ICAR guidelines.
    """
    req_id = str(uuid.uuid4())[:8]
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message") or data.get("query") or ""
        if not message.strip():
            return jsonify({
                "success": False,
                "status": "error",
                "code": "EMPTY_QUERY",
                "error_code": "EMPTY_QUERY",
                "message": "Query message is required.",
                "error": "Query message is required.",
                "request_id": req_id
            }), 400

        city = data.get("city") or data.get("market") or "Sangli"
        commodity = data.get("commodity") or "Onion"
        days = data.get("days", 7)
        lat = data.get("lat") or data.get("latitude")
        lon = data.get("lon") or data.get("longitude")
        conversation_id = data.get("conversation_id")
        chat_history = data.get("chat_history") or []
        language = data.get("language") or data.get("lang") or "en"

        days = 14 if int(days) == 14 else 7

        logger.info(f"[Req {req_id}] Incoming AI Chat: commodity='{commodity}', city='{city}', days={days}, lang='{language}', message='{message[:80]}'")

        response = ask_ai_farmer_chat(
            message=message,
            city=city,
            commodity=commodity,
            days=days,
            lat=lat,
            lon=lon,
            conversation_id=conversation_id,
            chat_history=chat_history,
            language=language
        )

        response["request_id"] = req_id

        if response.get("status") == "error" or not response.get("success", True):
            error_code = response.get("error_code") or response.get("code")
            status_code = 503 if error_code == "AI_SERVICE_UNAVAILABLE" else 422
            return jsonify(response), status_code

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"[Req {req_id}] Error in /api/ai/chat: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "error",
            "code": "INTERNAL_ERROR",
            "error_code": "INTERNAL_ERROR",
            "message": "AI Assistant is temporarily unavailable. Please try again in a moment.",
            "error": "AI Assistant is temporarily unavailable. Please try again in a moment.",
            "request_id": req_id
        }), 500


@ai_bp.route("/sources", methods=["GET"])
def get_sources():
    """
    Retrieve all verified ICAR / State Agricultural University sources in the RAG knowledge base.
    """
    try:
        store = get_vector_store()
        sources = store.get_all_sources()
        return jsonify({
            "status": "success",
            "count": len(sources),
            "sources": sources
        }), 200
    except Exception as e:
        logger.error(f"Error in /api/ai/sources: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@ai_bp.route("/health", methods=["GET"])
def health():
    """Check AI pipeline components status."""
    try:
        store = get_vector_store()
        return jsonify({
            "status": "ok",
            "module": "FasalNet RAG + LLM Agricultural Advisor",
            "rag_chunks_indexed": len(store.chunks),
            "vector_engine": "Dense/Sparse TF-IDF + Cosine Similarity",
            "numerical_model": "XGBoost Regressor (7 & 14 days)",
            "weather_provider": "Open-Meteo"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
