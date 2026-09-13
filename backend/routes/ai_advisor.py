"""
FasalNet AI Advisor Blueprint
Endpoints:
  - GET/POST /api/ai/market-advice : Structured multi-signal recommendation (XGBoost + Weather + RAG + LLM)
  - POST     /api/ai/chat          : Interactive natural-language agricultural advisor
  - GET      /api/ai/sources       : List of verified ICAR / SAU knowledge sources in RAG
  - GET      /api/ai/health        : Health check of RAG + AI pipeline
"""

import logging
from flask import Blueprint, request, jsonify
from services.ai_recommendation_service import (
    get_agricultural_market_advice,
    ask_ai_farmer_chat
)
from rag.vector_store import get_vector_store

logger = logging.getLogger("fasalnet.routes.ai_advisor")
ai_bp = Blueprint("ai_advisor", __name__, url_prefix="/api/ai")


@ai_bp.route("/market-advice", methods=["GET", "POST"])
def market_advice():
    """
    Generate grounded AI agricultural recommendation combining:
    GPS/Nearby Markets -> Open-Meteo Weather -> XGBoost 7/14d Forecast -> RAG Knowledge -> LLM Advisory.
    """
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
            return jsonify(result), 422

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in /api/ai/market-advice: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": f"Internal error generating AI agricultural advice: {str(e)}"
        }), 500


@ai_bp.route("/chat", methods=["POST"])
def ai_chat():
    """
    Conversational AI Farmer Assistant.
    Answers natural-language agricultural questions grounded strictly in
    known market data, XGBoost predictions, Open-Meteo weather, and ICAR guidelines.
    """
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message") or data.get("query") or ""
        if not message.strip():
            return jsonify({
                "status": "error",
                "error": "Query message is required."
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

        if response.get("status") == "error":
            return jsonify(response), 422

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error in /api/ai/chat: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": f"Internal error in AI chat: {str(e)}"
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
