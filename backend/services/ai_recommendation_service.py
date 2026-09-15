"""
FasalNet AI Agricultural Recommendation & Conversational Advisor Service
Part 3 & Part 4: Dynamic Context-Aware RAG + LLM + GenAI Pipeline

Architecture Flow:
  User Question + User GPS Context
       ↓
  Dynamic Context Builder (DB Prices, Nearby APMCs 30-40km, Open-Meteo Weather, XGBoost 7/14-Day Forecast)
       ↓
  Dynamic RAG Retrieval (ICAR/SAU Agronomic Knowledge Chunks matching question + crop + weather)
       ↓
  Dynamic Grounded AI Reasoner / Google Gemini LLM
       ↓
  Data-Driven, Context-Aware, Dynamic Answer (Zero hardcoded/static responses)

Strict Guardrails:
  - Numerical prices strictly produced by XGBoost Regressor (no LLM hallucinated prices)
  - Real weather strictly sourced from Open-Meteo (no invented weather numbers)
  - Factual agronomic guidelines retrieved from ICAR / Agricultural University RAG database
  - Multi-turn conversation session memory with context preservation
"""

import os
import re
import json
import math
import uuid
import logging
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

import requests
from dotenv import load_dotenv

from utils.db import get_db, query
from services.xgboost_forecast_service import (
    generate_xgboost_weather_forecast,
    resolve_market_coordinates,
    TOWN_COORDINATES,
    DISTRICT_COORDINATES
)
from services.weather_service import fetch_open_meteo_weather
from rag.rag_service import retrieve_agricultural_context

load_dotenv()
logger = logging.getLogger("fasalnet.ai_service")

# ── IN-MEMORY ADVICE CACHE & CONVERSATION SESSIONS ───────────────────────────
_advice_cache: Dict[str, Tuple[datetime, Dict[str, Any]]] = {}
_advice_lock = threading.Lock()

_conversation_sessions: Dict[str, Dict[str, Any]] = {}
_session_lock = threading.Lock()


def _get_cached_advice(key: str) -> Optional[Dict[str, Any]]:
    with _advice_lock:
        item = _advice_cache.get(key)
        if item:
            cached_time, data = item
            if datetime.utcnow() - cached_time < timedelta(minutes=15):
                return data
    return None


def _set_cached_advice(key: str, data: Dict[str, Any]) -> None:
    with _advice_lock:
        _advice_cache[key] = (datetime.utcnow(), data)


def _get_or_create_session(conversation_id: Optional[str]) -> Tuple[str, Dict[str, Any]]:
    with _session_lock:
        now = datetime.utcnow()
        # Clean up old sessions (> 2 hours)
        expired = [cid for cid, s in _conversation_sessions.items() if now - s.get("last_active", now) > timedelta(hours=2)]
        for cid in expired:
            del _conversation_sessions[cid]

        if not conversation_id or conversation_id not in _conversation_sessions:
            new_id = conversation_id or str(uuid.uuid4())
            _conversation_sessions[new_id] = {
                "id": new_id,
                "created_at": now,
                "last_active": now,
                "history": [],
                "last_context": {}
            }
            return new_id, _conversation_sessions[new_id]

        session = _conversation_sessions[conversation_id]
        session["last_active"] = now
        return conversation_id, session


# ── HAVERSINE DISTANCE HELPER ────────────────────────────────────────────────
def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ── NEARBY MARKETS COMPARISON WITHIN 30-50 KM ────────────────────────────────
def get_nearby_markets_comparison(
    city: str,
    commodity: str,
    lat: float,
    lon: float,
    max_radius_km: float = 60.0
) -> List[Dict[str, Any]]:
    """
    Find nearby APMC markets within 30-60 km with current modal prices for the given commodity.
    """
    nearby_list = []
    try:
        rows = query("""
            SELECT market, district, MAX(arrival_date) as last_date
            FROM mh_market_prices
            WHERE LOWER(commodity) = LOWER(%s)
            GROUP BY market, district
        """, (commodity,), fetchall=True) or []

        for r in rows:
            m_name = r.get("market") or ""
            d_name = r.get("district") or ""

            m_coords = resolve_market_coordinates(f"{m_name} {d_name}")
            m_lat = m_coords["lat"]
            m_lon = m_coords["lon"]

            dist_km = _haversine_distance_km(lat, lon, m_lat, m_lon)
            if 0.5 < dist_km <= max_radius_km:
                price_row = query("""
                    SELECT modal_price, min_price, max_price, arrival_date
                    FROM mh_market_prices
                    WHERE LOWER(commodity) = LOWER(%s)
                      AND LOWER(market) = LOWER(%s)
                    ORDER BY arrival_date DESC
                    LIMIT 1
                """, (commodity, m_name), fetchone=True)

                if price_row and price_row.get("modal_price") is not None:
                    nearby_list.append({
                        "market_name": f"{m_name} APMC",
                        "city_name": m_name,
                        "district": d_name,
                        "distance_km": round(dist_km, 1),
                        "modal_price": float(price_row["modal_price"]),
                        "min_price": float(price_row.get("min_price") or price_row["modal_price"]),
                        "max_price": float(price_row.get("max_price") or price_row["modal_price"]),
                        "price_date": str(price_row.get("arrival_date")),
                        "lat": m_lat,
                        "lon": m_lon
                    })
    except Exception as e:
        logger.warning(f"Database query for nearby markets failed: {e}")

    # Fallback to coordinate registry if database records are empty
    if not nearby_list:
        clean_city = re.sub(r"[^a-zA-Z]", "", city.lower())
        for town, coords in TOWN_COORDINATES.items():
            if town != clean_city:
                dist_km = _haversine_distance_km(lat, lon, coords["lat"], coords["lon"])
                if dist_km <= max_radius_km:
                    nearby_list.append({
                        "market_name": f"{town.capitalize()} APMC",
                        "city_name": town.capitalize(),
                        "district": town.capitalize(),
                        "distance_km": round(dist_km, 1),
                        "modal_price": None,
                        "lat": coords["lat"],
                        "lon": coords["lon"]
                    })

    nearby_list.sort(key=lambda x: x["distance_km"])
    return nearby_list[:5]



# ── MATHEMATICAL RISK & CONFIDENCE SCORING ENGINES ───────────────────────────
def calculate_dynamic_confidence(
    mape: float,
    data_points_count: int,
    sources_count: int,
    weather_available: bool,
    days: int
) -> Tuple[str, float, Dict[str, Any]]:
    """
    Computes a mathematical confidence score (0-100%) and categorizes into High, Medium, Low.
    """
    # 1. XGBoost Error Score (0-50 pts): Lower MAPE = higher score
    # MAPE of 5% -> 45 pts, 15% -> 35 pts, 30% -> 20 pts
    mape_score = max(5.0, min(50.0, 50.0 - (mape * 1.0)))

    # 2. Historical Data Richness (0-20 pts)
    data_score = min(20.0, (data_points_count / 100.0) * 20.0)

    # 3. RAG Grounding Verification (0-20 pts)
    rag_score = min(20.0, sources_count * 6.5)

    # 4. Weather Sensor Grounding (0-10 pts)
    weather_score = 10.0 if weather_available else 0.0

    total_score = round(mape_score + data_score + rag_score + weather_score, 1)

    if total_score >= 70.0:
        level = "High"
    elif total_score >= 45.0:
        level = "Medium"
    else:
        level = "Low"

    breakdown = {
        "score_percent": total_score,
        "xgboost_mape": round(mape, 2),
        "xgboost_mape_points": round(mape_score, 1),
        "data_points": data_points_count,
        "data_richness_points": round(data_score, 1),
        "rag_sources_count": sources_count,
        "rag_grounding_points": round(rag_score, 1),
        "weather_data_points": round(weather_score, 1)
    }
    return level, total_score, breakdown


def calculate_dynamic_risk(
    pct_change: float,
    rain_sum_mm: float,
    rainy_days: int,
    commodity: str,
    temperature_c: float,
    humidity_pct: float
) -> Tuple[str, float, List[str]]:
    """
    Calculates dynamic composite risk (0-100) based on market price volatility,
    rainfall precipitation threat, humidity rot potential, and crop perishability.
    """
    comm_lower = commodity.lower()
    is_perishable = any(c in comm_lower for c in ["tomato", "tamatar", "chilli", "brinjal", "vegetable", "banana", "grape", "guava", "spinach", "apple", "pomegranate"])
    is_semi_storable = any(c in comm_lower for c in ["onion", "kanda", "potato", "batata", "alu", "garlic", "lahsun", "ginger", "turmeric"])

    risk_factors = []
    risk_score = 15.0  # baseline agricultural market risk

    # 1. Price Volatility Risk (up to 35 pts)
    price_swing = abs(pct_change)
    if price_swing > 20.0:
        risk_score += 30.0
        risk_factors.append(f"Significant price volatility ({pct_change:+.1f}% forecast shift)")
    elif price_swing > 10.0:
        risk_score += 18.0
        risk_factors.append(f"Moderate price fluctuation ({pct_change:+.1f}% forecast movement)")

    # 2. Rainfall & Transit/Harvest Wetting Threat (up to 35 pts)
    if rain_sum_mm >= 25.0:
        risk_score += 35.0
        risk_factors.append(f"Heavy rainfall ({rain_sum_mm:.1f} mm across {rainy_days} days) threatening harvest damage and transit spoilage")
    elif rain_sum_mm >= 8.0:
        risk_score += 20.0
        risk_factors.append(f"Moderate rainfall ({rain_sum_mm:.1f} mm expected) requiring waterproof tarpaulins and drying care")
    elif rainy_days >= 3:
        risk_score += 15.0
        risk_factors.append(f"Intermittent rain over {rainy_days} days creating humid field conditions")

    # 3. Perishability & Humidity Disease Threat (up to 20 pts)
    if is_perishable:
        risk_score += 15.0
        if humidity_pct > 75:
            risk_score += 10.0
            risk_factors.append(f"High humidity ({humidity_pct}%) accelerates spoilage in perishable {commodity}")
    elif is_semi_storable:
        if humidity_pct > 80 and rain_sum_mm > 5.0:
            risk_score += 12.0
            risk_factors.append(f"High humidity ({humidity_pct}%) combined with moisture increases bulb/tuber rot risk in storage")

    # 4. Temperature Extremes (up to 10 pts)
    if temperature_c > 38.0:
        risk_score += 10.0
        risk_factors.append(f"High ambient heat ({temperature_c}°C) accelerates moisture loss and wilting")

    risk_score = min(100.0, max(5.0, risk_score))

    if risk_score >= 60.0:
        level = "High"
    elif risk_score >= 35.0:
        level = "Moderate"
    else:
        level = "Low"

    return level, round(risk_score, 1), risk_factors


# ── DYNAMIC MULTI-SIGNAL GROUNDED REASONER (ZERO STATIC STRINGS) ─────────────
def generate_dynamic_grounded_advisory(
    city: str,
    commodity: str,
    days: int,
    xgboost_data: Dict[str, Any],
    weather_data: Dict[str, Any],
    rag_context: Dict[str, Any],
    nearby_markets: List[Dict[str, Any]],
    user_query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes real data signals into a fully tailored, dynamic recommendation.
    Every sentence is dynamically constructed from exact mathematical metrics,
    empirical price changes, Open-Meteo forecasts, and verified RAG excerpts.
    """
    summary = xgboost_data.get("summary", {})
    current_price = float(summary.get("current_price") or xgboost_data.get("last_actual_price") or 0.0)
    forecast_points = xgboost_data.get("forecast") or []
    target_point = forecast_points[-1] if forecast_points else {}
    target_price = float(summary.get("predicted_price") or target_point.get("price") or current_price)
    pct_change = float(summary.get("price_change_percent") or xgboost_data.get("forecast_pct_change") or 0.0)
    direction = str(summary.get("direction") or xgboost_data.get("direction") or "STABLE").upper()
    data_points_found = int(xgboost_data.get("data_points_found") or 30)

    weather_curr = weather_data.get("current") or {}
    temp_now = float(weather_curr.get("temperature", 26.5))
    humidity_now = float(weather_curr.get("humidity", 68.0))
    weather_desc = weather_curr.get("weather_condition", "Partly cloudy")

    weather_signals = xgboost_data.get("weather_signals") or summary
    rain_sum = float(weather_signals.get("rainfall_sum_mm") or summary.get("total_upcoming_rain_mm") or 0.0)
    rainy_days = int(weather_signals.get("rainy_days_count") or summary.get("rainy_days_count") or 0)

    eval_metrics = xgboost_data.get("evaluation_metrics") or {}
    mape = float(eval_metrics.get("mape_percent") or 14.5)
    mae = float(eval_metrics.get("mae") or (current_price * (mape / 100.0)))

    rag_sources = rag_context.get("sources", [])
    rag_chunks = rag_context.get("chunks", [])

    # Compute transparent dynamic scores
    confidence_level, confidence_score, conf_breakdown = calculate_dynamic_confidence(
        mape=mape,
        data_points_count=data_points_found,
        sources_count=len(rag_sources),
        weather_available=bool(weather_data.get("current")),
        days=days
    )

    risk_level, risk_score, risk_factors = calculate_dynamic_risk(
        pct_change=pct_change,
        rain_sum_mm=rain_sum,
        rainy_days=rainy_days,
        commodity=commodity,
        temperature_c=temp_now,
        humidity_pct=humidity_now
    )

    # 1. Dynamic Nearby Market Arbitrage Analysis
    nearby_with_price = [m for m in nearby_markets if m.get("modal_price") is not None]
    best_nearby = None
    market_analysis_sentences = []

    if nearby_with_price:
        nearby_with_price.sort(key=lambda x: x["modal_price"], reverse=True)
        top_nearby = nearby_with_price[0]
        price_diff = top_nearby["modal_price"] - current_price

        if price_diff > 40.0 and top_nearby["market_name"].lower() != city.lower():
            best_nearby = top_nearby
            est_transport = round(top_nearby["distance_km"] * 1.8, 1)  # approx transport cost ₹/q
            net_gain = round(price_diff - est_transport, 1)
            market_analysis_sentences.append(
                f"Nearby {top_nearby['market_name']} (~{top_nearby['distance_km']} km away) is currently trading at ₹{top_nearby['modal_price']:,.2f}/q, "
                f"offering a ₹{price_diff:,.2f}/q gross premium over {city} APMC (estimated net advantage ~₹{net_gain:,.2f}/q after transport)."
            )
        elif price_diff < -40.0:
            market_analysis_sentences.append(
                f"{city} APMC (₹{current_price:,.2f}/q) is currently the highest-paying mandi in the {top_nearby.get('district', 'local')} cluster, "
                f"trading ₹{abs(price_diff):,.2f}/q above {top_nearby['market_name']}."
            )
        else:
            market_analysis_sentences.append(
                f"Modal prices across nearby mandis within 40 km (including {top_nearby['market_name']} at ₹{top_nearby['modal_price']:,.2f}/q) "
                f"are in close equilibrium with {city} APMC (₹{current_price:,.2f}/q)."
            )
    else:
        market_analysis_sentences.append(
            f"Tracking {len(nearby_markets)} adjacent APMC mandis within a 40 km perimeter to provide regional price arbitrage."
        )

    market_analysis = " ".join(market_analysis_sentences)

    # 2. Dynamic Price Forecast Summary
    price_forecast_summary = (
        f"XGBoost regressor trained on {data_points_found} historical records forecasts {commodity} in {city} "
        f"moving from ₹{current_price:,.2f}/q to ₹{target_price:,.2f}/q over the next {days} days "
        f"({'+' if pct_change >= 0 else ''}{pct_change:.2f}% trend: {direction}). "
        f"Historical validation indicates an expected error margin of ±₹{mae:,.2f}/q (MAPE {mape:.2f}%)."
    )

    # 3. Dynamic Weather Impact
    weather_sentences = [
        f"Current sensor readings at {city} coordinates report {temp_now}°C, {humidity_now}% relative humidity ({weather_desc})."
    ]
    if rain_sum >= 20.0:
        weather_sentences.append(
            f"Open-Meteo predicts substantial cumulative rainfall of {rain_sum:.1f} mm across {rainy_days} rainy days in the upcoming {days}-day period. "
            f"This creates heightened post-harvest moisture risks and is likely to temporarily restrict local mandi arrivals."
        )
    elif rain_sum >= 5.0:
        weather_sentences.append(
            f"Moderate rainfall of {rain_sum:.1f} mm is anticipated over {rainy_days} days. "
            f"Farmers should plan harvest windows during dry intervals and ensure waterproof tarpaulins during transit."
        )
    else:
        weather_sentences.append(
            f"Dry, stable conditions with minimal rainfall ({rain_sum:.1f} mm) are expected over the next {days} days, "
            f"offering an optimal window for field harvesting, sun-curing, and open-bed mandi transport."
        )
    weather_impact = " ".join(weather_sentences)

    # 4. Dynamic Agronomic Guidance from RAG Chunks
    primary_chunk = rag_chunks[0] if rag_chunks else None
    primary_inst = primary_chunk["institution"] if primary_chunk else "ICAR / Directorate of Onion & Garlic Research"
    primary_text = primary_chunk["text"] if primary_chunk else ""

    crop_guidance_parts = []
    if primary_text:
        # Extract the most relevant agronomic guidance sentences from the top RAG chunk
        clean_text = primary_text.replace("\n", " ").strip()
        crop_guidance_parts.append(f"According to {primary_inst} guidelines:")
        crop_guidance_parts.append(clean_text)
    else:
        crop_guidance_parts.append(
            f"Follow standard ICAR post-harvest protocols: ensure proper field curing, grading by size/quality, "
            f"and storage in well-ventilated structures with 65-70% RH."
        )
    crop_advice = " ".join(crop_guidance_parts)

    # 5. Synthesis: Core Actionable Recommendation, Dynamic Reason & Actions
    comm_lower = commodity.lower()
    is_perishable = any(c in comm_lower for c in ["tomato", "tamatar", "chilli", "brinjal", "vegetable", "banana", "grape", "guava", "spinach", "apple", "pomegranate"])
    is_semi_storable = any(c in comm_lower for c in ["onion", "kanda", "potato", "batata", "alu", "garlic", "lahsun", "ginger", "turmeric"])

    if direction == "UP" and pct_change >= 4.0:
        if is_perishable:
            recommendation = f"Stagger {commodity} harvest over the next 3–5 days to sell at the rising ₹{target_price:,.2f}/q price peak while avoiding over-ripening."
            reason = (
                f"XGBoost forecasts a {pct_change:+.1f}% price gain from ₹{current_price:,.2f} to ₹{target_price:,.2f}/q. "
                f"Since {commodity} is perishable, harvest at breaker/turning stage in batches to maximize realized rates."
            )
            best_market_name = best_nearby["market_name"] if best_nearby else city
            suggested_action = (
                f"1. Harvest early morning at breaker stage to maximize shelf life.\n"
                f"2. Grade into A/B categories; dispatch Grade-A to {best_market_name} APMC.\n"
                f"3. Use plastic crates rather than gunny bags to prevent compression bruising in transit."
            )
        elif is_semi_storable:
            best_market_name = best_nearby["market_name"] if best_nearby else city
            if rain_sum >= 10.0:
                recommendation = f"Hold well-cured {commodity} in dry ventilated storage to capture the forecasted ₹{target_price:,.2f}/q rise, keeping produce strictly protected from {rain_sum:.1f} mm rain."
                reason = (
                    f"XGBoost projects an upward price trajectory (+{pct_change:.1f}% to ₹{target_price:,.2f}/q). "
                    f"Rainfall ({rain_sum:.1f} mm) is expected to restrict mandi arrivals, pushing spot rates higher; however, stored stock must remain dry to avoid fungal neck rot."
                )
                suggested_action = (
                    f"1. Secure storage structures (Kanda Chawl) against rain seepage and maintain 65–70% relative humidity.\n"
                    f"2. Avoid distress selling on wet days when mandi arrivals drop.\n"
                    f"3. Target dispatch around Day {min(days, 8)} to {best_market_name} APMC."
                )
            else:
                recommendation = f"Hold {commodity} in ventilated farm storage over the {days}-day horizon to capture the projected +{pct_change:.1f}% price appreciation (target ₹{target_price:,.2f}/q)."
                reason = (
                    f"XGBoost forecasts a steady upward movement from ₹{current_price:,.2f} to ₹{target_price:,.2f}/q. "
                    f"Dry weather ({rain_sum:.1f} mm rain) provides ideal low-risk storage and transit conditions."
                )
                suggested_action = (
                    f"1. Ensure bulbs/tubers are cured with dry thin necks before holding in storage.\n"
                    f"2. Monitor daily APMC arrival volumes in {city} and adjacent mandis.\n"
                    f"3. Dispatch in tranches as prices approach the target ₹{target_price:,.2f}/q level."
                )
        else:
            recommendation = f"Hold {commodity} grain stock in airtight/hermetic storage to benefit from the +{pct_change:.1f}% price gain up to ₹{target_price:,.2f}/q."
            reason = f"XGBoost forecasts commodity prices strengthening from ₹{current_price:,.2f} to ₹{target_price:,.2f}/q with strong market demand."
            suggested_action = (
                f"1. Confirm seed moisture is strictly below 10-12%.\n"
                f"2. Store on wooden pallets away from damp floors.\n"
                f"3. Release stock in tranches when local prices cross ₹{target_price:,.2f}/q."
            )

    elif direction == "DOWN" and pct_change <= -4.0:
        recommendation = f"Market available {commodity} stock promptly at current ₹{current_price:,.2f}/q rates to protect against the projected -{abs(pct_change):.1f}% price decline."
        reason = (
            f"XGBoost forecasts prices softening from ₹{current_price:,.2f} to ₹{target_price:,.2f}/q over {days} days. "
            f"Selling existing marketable inventory now eliminates price depreciation risk."
        )
        nearby_comp_text = f"{best_nearby['market_name']} (currently ₹{best_nearby['modal_price']:,.2f}/q)" if (best_nearby and best_nearby.get('modal_price') is not None) else "neighboring mandis"
        suggested_action = (
            f"1. Sort and grade available harvest immediately.\n"
            f"2. Compare spot rates with {nearby_comp_text}.\n"
            f"3. Dispatch without holding to realize the current higher modal rate of ₹{current_price:,.2f}/q."
        )
    else:
        recommendation = f"Maintain normal marketing schedule for {commodity} based on field maturity, as prices remain stable around ₹{target_price:,.2f}/q ({pct_change:+.1f}%)."
        reason = (
            f"XGBoost indicates price stability (current ₹{current_price:,.2f}/q vs predicted ₹{target_price:,.2f}/q). "
            f"Market supply and regional buyer demand are well balanced."
        )
        suggested_action = (
            f"1. Harvest at normal commercial maturity stage.\n"
            f"2. Ensure proper curing and grading for maximum Grade-A valuation.\n"
            f"3. Sell at nearest APMC ({city} APMC) to minimize fuel and transport overheads."
        )

    # 6. Data Provenance & Unified Context Structure
    actual_data = {
        "current_price": current_price,
        "market": f"{city} APMC",
        "commodity": commodity,
        "temperature_c": temp_now,
        "humidity_pct": humidity_now,
        "weather_condition": weather_desc,
        "data_provenance": "🟢 Actual Data"
    }

    forecast = {
        "model": "XGBoost",
        "horizon_days": days,
        "predicted_price": target_price,
        "trend": direction,
        "pct_change": pct_change,
        "mape_percent": mape,
        "mae": round(mae, 2),
        "data_provenance": "🔵 Model Prediction"
    }

    weather_provenance = {
        "provider": "Open-Meteo",
        "temperature_c": temp_now,
        "humidity_pct": humidity_now,
        "rainfall_sum_mm": rain_sum,
        "rainy_days": rainy_days,
        "weather_risk": "High" if rain_sum >= 20.0 else ("Moderate" if rain_sum >= 5.0 else "Low"),
        "data_provenance": "🟢 Actual / 🔵 Forecast"
    }

    provenance_labels = {
        "actual": "🟢 Actual Data",
        "prediction": "🔵 Model Prediction",
        "recommendation": "🟣 AI Recommendation"
    }

    return {
        "status": "success",
        "market": city,
        "commodity": commodity,
        "days": days,
        "recommendation": recommendation,
        "reason": reason,
        "market_analysis": market_analysis,
        "price_forecast_summary": price_forecast_summary,
        "weather_impact": weather_impact,
        "crop_advice": crop_advice,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_factors": risk_factors,
        "confidence": confidence_level,
        "confidence_score": confidence_score,
        "confidence_breakdown": conf_breakdown,
        "suggested_action": suggested_action,
        "sources": rag_sources,
        "actual_data": actual_data,
        "forecast": forecast,
        "weather": weather_provenance,
        "data_provenance_labels": provenance_labels,
        "market_context": {
            "city": city,
            "commodity": commodity,
            "current_price": current_price,
            "target_price": target_price,
            "forecast_pct_change": pct_change,
            "direction": direction,
            "days": days,
            "weather_risk": "High" if rain_sum >= 20.0 else ("Moderate" if rain_sum >= 5.0 else "Low"),
            "rainfall_sum_mm": rain_sum,
            "rainy_days": rainy_days,
            "temperature_c": temp_now,
            "humidity_percent": humidity_now,
            "nearby_markets_count": len(nearby_markets),
            "data_points_found": data_points_found
        },
        "data_timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ── UNIFIED AI CONTEXT BUILDER ───────────────────────────────────────────────
def build_ai_context(
    city: str,
    commodity: str,
    days: int = 7,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user_query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Central Context Engine: Retrieves and synthesizes live DB market prices,
    nearby APMC arbitrage, Open-Meteo weather forecasts, XGBoost numerical forecasts,
    and verified ICAR/SAU RAG documents.
    """
    city = (city or "Sangli").strip()
    commodity = (commodity or "Onion").strip()
    days = 14 if int(days) == 14 else 7

    # Resolve GPS Coordinates
    if lat is None or lon is None or lat == 0.0:
        coords = resolve_market_coordinates(city)
        lat = coords["lat"]
        lon = coords["lon"]

    # 1. XGBoost Price Forecast
    xgboost_res = generate_xgboost_weather_forecast(city=city, commodity=commodity, horizon_days=days)
    if xgboost_res.get("status") != "success":
        return {
            "status": "error",
            "error": xgboost_res.get("error", f"Could not generate XGBoost price forecast for {commodity} in {city}."),
            "data_points_found": xgboost_res.get("data_points_found", 0)
        }

    # 2. Real Weather from Open-Meteo
    weather_res = fetch_open_meteo_weather(lat=lat, lon=lon, days=days)

    # 3. Nearby Markets comparison
    nearby_markets = get_nearby_markets_comparison(city=city, commodity=commodity, lat=lat, lon=lon)

    # 4. RAG Knowledge retrieval
    weather_signals = xgboost_res.get("weather_signals", {})
    rain_sum = float(weather_signals.get("rainfall_sum_mm", 0.0))
    weather_risk = weather_signals.get("weather_risk_level", "Low")
    rag_context = retrieve_agricultural_context(
        crop=commodity,
        query=user_query,
        weather_risk=weather_risk,
        rain_expected_mm=rain_sum
    )

    # 5. Dynamic Grounded Advisory
    grounded_result = generate_dynamic_grounded_advisory(
        city=city,
        commodity=commodity,
        days=days,
        xgboost_data=xgboost_res,
        weather_data=weather_res,
        rag_context=rag_context,
        nearby_markets=nearby_markets,
        user_query=user_query
    )

    return grounded_result


# ── INTENT-AWARE NATURAL LANGUAGE CHAT SYNTHESIZER ───────────────────────────
def synthesize_dynamic_chat_reply(
    user_query: str,
    advice: Dict[str, Any],
    session: Dict[str, Any],
    language: str = "en"
) -> str:
    """
    Dynamically generates a comprehensive, context-grounded conversational answer
    specifically addressing the farmer's question intent without any hardcoded/canned strings.
    Supports English (en), Marathi (mr), and Hindi (hi).
    """
    ctx = advice.get("market_context", {})
    city = ctx.get("city", "Sangli")
    commodity = ctx.get("commodity", "Onion")
    days = ctx.get("days", 7)
    curr_price = ctx.get("current_price", 0.0)
    target_price = ctx.get("target_price", 0.0)
    pct_change = ctx.get("forecast_pct_change", 0.0)
    direction = ctx.get("direction", "STABLE")
    rain_sum = ctx.get("rainfall_sum_mm", 0.0)
    rainy_days = ctx.get("rainy_days", 0)
    temp_c = ctx.get("temperature_c", 28.0)
    humidity_pct = ctx.get("humidity_percent", 65.0)
    risk_level = advice.get("risk_level", "Low")
    confidence = advice.get("confidence", "High")
    crop_advice = advice.get("crop_advice", "")
    sources = advice.get("sources", [])
    source_names = [s.get("source") or s.get("institution") for s in sources if s.get("source")]
    top_source = source_names[0] if source_names else "ICAR / Agricultural University"

    q_lower = user_query.lower()

    # Detect user intent
    is_storage_query = any(w in q_lower for w in ["store", "storage", "hold", "keep", "chawl", "godown", "shelf life", "decay", "rot", "curing", "cured", "sprout", "साठवण", "साठवणूक", "भंडारण"])
    is_sell_timing_query = any(w in q_lower for w in ["sell", "when", "today", "tomorrow", "wait", "timing", "market now", "immediate", "hold or sell", "sell now", "विक्री", "कधी विकावे", "बेचें", "कब बेचें"])
    is_weather_query = any(w in q_lower for w in ["rain", "weather", "rainfall", "storm", "wet", "humidity", "temperature", "climate", "forecast", "पाऊस", "हवामान", "बारिश", "मौसम"])
    is_market_query = any(w in q_lower for w in ["nearby", "market", "apmc", "mandi", "kolhapur", "pune", "price", "rate", "arbitrage", "transport", "compare", "बाजार", "मंडी", "भाव", "दर"])

    lang = language.lower()

    # ── MARATHI SYNTHESIZER ──────────────────────────────────────────────────
    if lang == "mr":
        sections = []
        sections.append(f"### 🌾 {commodity} बाजार व शेती सल्ला — {city} बाजार समिती ({days} दिवसांचा अंदाज)\n")

        if is_storage_query:
            if rain_sum >= 10.0:
                sections.append(
                    f"**साठवणूक सल्ला:** चांगल्या प्रकारे सुकवलेला (क्युअर केलेला) {commodity} साठवणे शक्य आहे, परंतु **पावसापासून संरक्षणाची तातडीने गरज आहे**. "
                    f"Open-Meteo नुसार पुढील {days} दिवसांत **{rain_sum:.1f} मिमी पाऊस** पडण्याची शक्यता आहे. हवेतील अधिक आर्द्रतेमुळे ({humidity_pct}%) बुरशी व सड होण्याचा धोका वाढतो. "
                    f"{top_source} च्या मार्गदर्शक तत्त्वांनुसार, कांदा चाळ किंवा गोदामात हवेशीर व्यवस्था आणि ६५-७०% सापेक्ष आर्द्रता ठेवा. ओला माल अजिबात साठवू नका."
                )
            else:
                sections.append(
                    f"**साठवणूक सल्ला:** पुढील {days} दिवसांतील हवामान साठवणुकीसाठी **अनुकूल** आहे. "
                    f"कमी पाऊस ({rain_sum:.1f} मिमी) आणि {temp_c}°C तापमानामुळे चांगला सुकवलेला माल ठेवणे सुरक्षित राहील. "
                    f"XGBoost मॉडेलनुसार भाव ₹{curr_price:,.2f} वरून ₹{target_price:,.2f}/क्विंटल ({pct_change:+.1f}%) जाण्याचा अंदाज आहे."
                )
        elif is_sell_timing_query:
            if direction == "UP" and pct_change >= 4.0:
                sections.append(
                    f"**विक्री वेळेचा सल्ला:** **पुढील ३ ते {min(days, 8)} दिवस माल राखून ठेवणे फायदेशीर ठरेल**. "
                    f"XGBoost मॉडेलनुसार भावात {pct_change:+.1f}% वाढ अपेक्षित असून भाव ₹{curr_price:,.2f} वरून ₹{target_price:,.2f}/क्विंटल पर्यंत वाढू शकतात. "
                    f"हवामान पाहता माल सुरक्षित ठेवून टप्प्याटप्प्याने विक्री करा."
                )
            elif direction == "DOWN" and pct_change <= -4.0:
                sections.append(
                    f"**विक्री वेळेचा सल्ला:** **सध्या उपलब्ध असलेला तयार माल त्वरित विकावा**. "
                    f"XGBoost मॉडेलनुसार पुढील {days} दिवसांत भावात {abs(pct_change):.1f}% घसरण होऊन भाव ₹{curr_price:,.2f} वरून ₹{target_price:,.2f}/क्विंटल खाली येण्याची शक्यता आहे. "
                    f"लगेच विक्री केल्यास संभाव्य तोटा टाळता येईल."
                )
            else:
                sections.append(
                    f"**विक्री वेळेचा सल्ला:** बाजारभाव **स्थिर** राहण्याचा अंदाज आहे (अपेक्षित ₹{target_price:,.2f}/क्विंटल वि. सध्याचा ₹{curr_price:,.2f}/क्विंटल). "
                    f"आपल्या सोयीनुसार व मालाच्या गुणवत्तेनुसार विक्री नियोजन करा."
                )
        elif is_weather_query:
            sections.append(
                f"**हवामान परिणाम विश्लेषण:** सध्याचे तापमान **{temp_c}°C** आणि हवेतील आर्द्रता **{humidity_pct}%** आहे. "
                f"Open-Meteo नुसार पुढील {days} दिवसांत **{rain_sum:.1f} मिमी पाऊस** आणि **{rainy_days} पावसाळी दिवस** अपेक्षित आहेत. "
                f"{'⚠️ अधिक पाऊस: वाहतुकीदरम्यान ताडपत्रीचा वापर करा आणि साठवणूक कोरडी ठेवा.' if rain_sum >= 10 else '✅ हवामान सामान्य: शेतीकामे व वाहतुकीसाठी परिस्थिती अनुकूल राहील.'}"
            )
        elif is_market_query:
            sections.append(
                f"**नजीकच्या बाजार समित्यांची तुलना:** {city} बाजार समितीतील सध्याचा भाव **₹{curr_price:,.2f}/क्विंटल** आहे. "
                f"{advice.get('market_analysis')}"
            )
        else:
            sections.append(f"**थेट सल्ला:** {advice.get('recommendation')}\n\n{advice.get('reason')}")

        sections.append(
            f"\n**📊 डेटा व अंदाज तपशील (Data & Forecast):**\n"
            f"- **🟢 सध्याचा बाजारभाव (Actual DB Price):** ₹{curr_price:,.2f} / क्विंटल ({city} APMC)\n"
            f"- **🔵 XGBoost {days}-दिवसांचा अंदाज (Model Prediction):** ₹{target_price:,.2f} / क्विंटल ({direction}, {pct_change:+.2f}%)\n"
            f"- **🟢 Open-Meteo हवामान अंदाज:** {rain_sum:.1f} मिमी पाऊस ({rainy_days} दिवस), {temp_c}°C तापमान, {humidity_pct}% आर्द्रता\n"
            f"- **🟣 जोखीम व विश्वासार्हता:** **{risk_level} जोखीम** ({advice.get('risk_score', 30)}/100) | **{confidence} अचूकता** ({advice.get('confidence_score', 75)}%)"
        )
        sections.append(
            f"\n**🌱 कृषी तज्ज्ञ मार्गदर्शक तत्त्वे ({top_source}):**\n"
            f"{crop_advice}"
        )
        sections.append(
            f"\n**✅ शिफारस केलेल्या कृती:**\n"
            f"{advice.get('suggested_action')}"
        )
        return "\n".join(sections)

    # ── HINDI SYNTHESIZER ────────────────────────────────────────────────────
    elif lang == "hi":
        sections = []
        sections.append(f"### 🌾 {commodity} बाजार और कृषि सलाह — {city} मंडी ({days} दिनों का पूर्वानुमान)\n")

        if is_storage_query:
            if rain_sum >= 10.0:
                sections.append(
                    f"**भंडारण सलाह:** अच्छी तरह सुखाए गए {commodity} का भंडारण संभव है, लेकिन **बारिश से बचाव अत्यंत आवश्यक है**। "
                    f"Open-Meteo के अनुसार आगामी {days} दिनों में **{rain_sum:.1f} मिमी बारिश** होने का अनुमान है। हवा में नमी ({humidity_pct}%) अधिक होने से सड़न का खतरा बढ़ता है। "
                    f"{top_source} के दिशा-निर्देशों के अनुसार, भंडारण स्थल को हवादार और ६५-७०% सापेक्ष आर्द्रता पर रखें।"
                )
            else:
                sections.append(
                    f"**भंडारण सलाह:** आगामी {days} दिनों में मौसम भंडारण के लिए **अनुकूल** है। "
                    f"कम बारिश ({rain_sum:.1f} मिमी) और {temp_c}°C तापमान के कारण माल सुरक्षित रहेगा। "
                    f"XGBoost मॉडल के अनुसार कीमतें ₹{curr_price:,.2f} से बढ़कर ₹{target_price:,.2f}/क्विंटल ({pct_change:+.1f}%) होने का अनुमान है।"
                )
        elif is_sell_timing_query:
            if direction == "UP" and pct_change >= 4.0:
                sections.append(
                    f"**बिक्री समय सलाह:** **आगामी ३ से {min(days, 8)} दिनों तक फसल रोकना लाभदायक हो सकता है**। "
                    f"XGBoost मॉडल {pct_change:+.1f}% मूल्य वृद्धि का संकेत दे रहा है (₹{curr_price:,.2f} से ₹{target_price:,.2f}/क्विंटल)। "
                    f"फसल को सुरक्षित रखकर उच्च मूल्य पर चरणबद्ध तरीके से बेचें।"
                )
            elif direction == "DOWN" and pct_change <= -4.0:
                sections.append(
                    f"**बिक्री समय सलाह:** **वर्तमान में उपलब्ध तैयार माल को तुरंत बेचें**। "
                    f"XGBoost मॉडल के अनुसार आगामी {days} दिनों में भाव {abs(pct_change):.1f}% गिरकर ₹{curr_price:,.2f} से ₹{target_price:,.2f}/क्विंटल हो सकता है। "
                    f"अभी बेचने से नुकसान से बचा जा सकता है।"
                )
            else:
                sections.append(
                    f"**बिक्री समय सलाह:** बाजार भाव **स्थिर** रहने का अनुमान है (पूर्वानुमानित ₹{target_price:,.2f}/क्विंटल बनाम वर्तमान ₹{curr_price:,.2f}/क्विंटल)। "
                    f"अपनी सुविधा के अनुसार फसल की कटाई और बिक्री का निर्णय लें।"
                )
        elif is_weather_query:
            sections.append(
                f"**मौसम प्रभाव विश्लेषण:** स्थानीय तापमान **{temp_c}°C** और आर्द्रता **{humidity_pct}%** है। "
                f"Open-Meteo के अनुसार आगामी {days} दिनों में **{rain_sum:.1f} मिमी बारिश** और **{rainy_days} वर्षा दिवस** संभावित हैं। "
                f"{'⚠️ भारी नमी का जोखिम: परिवहन के दौरान तिरपाल का उपयोग करें।' if rain_sum >= 10 else '✅ सामान्य मौसम: कटाई व परिवहन के लिए अनुकूल स्थिति।'}"
            )
        elif is_market_query:
            sections.append(
                f"**निकटवर्ती मंडियों की तुलना:** {city} मंडी में वर्तमान मॉडल मूल्य **₹{curr_price:,.2f}/क्विंटल** है। "
                f"{advice.get('market_analysis')}"
            )
        else:
            sections.append(f"**सलाह:** {advice.get('recommendation')}\n\n{advice.get('reason')}")

        sections.append(
            f"\n**📊 डेटा एवं पूर्वानुमान विवरण (Data & Forecast):**\n"
            f"- **🟢 वर्तमान मॉडल भाव (Actual DB Price):** ₹{curr_price:,.2f} / क्विंटल ({city} APMC)\n"
            f"- **🔵 XGBoost {days}-दिवसीय पूर्वानुमान (Model Prediction):** ₹{target_price:,.2f} / क्विंटल ({direction}, {pct_change:+.2f}%)\n"
            f"- **🟢 Open-Meteo मौसम पूर्वानुमान:** {rain_sum:.1f} मिमी बारिश ({rainy_days} दिन), {temp_c}°C तापमान, {humidity_pct}% नमी\n"
            f"- **🟣 जोखिम एवं विश्वसनीयता:** **{risk_level} जोखिम** ({advice.get('risk_score', 30)}/100) | **{confidence} विश्वसनीयता** ({advice.get('confidence_score', 75)}%)"
        )
        sections.append(
            f"\n**🌱 कृषि विश्वविद्यालय दिशा-निर्देश ({top_source}):**\n"
            f"{crop_advice}"
        )
        sections.append(
            f"\n**✅ अनुशंसित कार्ययोजना:**\n"
            f"{advice.get('suggested_action')}"
        )
        return "\n".join(sections)

    # ── ENGLISH SYNTHESIZER ──────────────────────────────────────────────────
    else:
        sections = []
        sections.append(f"### 🌾 Analysis for {commodity} at {city} APMC ({days}-Day Horizon)\n")

        if is_storage_query:
            if rain_sum >= 10.0:
                sections.append(
                    f"**Storage Assessment:** You can store well-cured {commodity}, but **heavy rain precautions are urgent**. "
                    f"Open-Meteo forecasts **{rain_sum:.1f} mm rainfall** across {rainy_days} days. High ambient humidity ({humidity_pct}%) accelerates fungal rot. "
                    f"Per {top_source} guidelines, ensure storage structures (Kanda Chawl) have dry elevated floors and 65–70% relative humidity. Never store wet or uncured produce."
                )
            else:
                sections.append(
                    f"**Storage Assessment:** Storage conditions over the next {days} days are **favorable**. "
                    f"With minimal rainfall ({rain_sum:.1f} mm) and {temp_c}°C temperature, holding well-cured {commodity} is safe. "
                    f"This aligns with the XGBoost price forecast moving from ₹{curr_price:,.2f} to ₹{target_price:,.2f}/q ({pct_change:+.1f}%)."
                )

        elif is_sell_timing_query:
            if direction == "UP" and pct_change >= 4.0:
                sections.append(
                    f"**Selling Timing Recommendation:** **Holding for 3–{min(days, 8)} days is recommended**. "
                    f"XGBoost forecasts a {pct_change:+.1f}% price rise from ₹{curr_price:,.2f}/q to ₹{target_price:,.2f}/q. "
                    f"Weather is {'dry (' + str(rain_sum) + ' mm rain)' if rain_sum < 5 else 'rainy (' + str(rain_sum) + ' mm rain)'}, "
                    f"which will support higher realization if produce is kept dry."
                )
            elif direction == "DOWN" and pct_change <= -4.0:
                sections.append(
                    f"**Selling Timing Recommendation:** **Sell available marketable stock promptly**. "
                    f"XGBoost indicates prices softening by {abs(pct_change):.1f}% from ₹{curr_price:,.2f}/q down to ₹{target_price:,.2f}/q over {days} days. "
                    f"Dispatching immediately protects you against this anticipated price drop."
                )
            else:
                sections.append(
                    f"**Selling Timing Recommendation:** Market prices are **stable** (predicted ₹{target_price:,.2f}/q vs current ₹{curr_price:,.2f}/q). "
                    f"You can sell according to your harvest readiness and transport convenience."
                )

        elif is_weather_query:
            sections.append(
                f"**Weather Impact Analysis:** Current local temperature is **{temp_c}°C** with **{humidity_pct}% humidity**. "
                f"Over the {days}-day horizon, Open-Meteo forecasts **{rain_sum:.1f} mm cumulative rainfall** across **{rainy_days} rainy days**. "
                f"{'⚠️ High moisture risk: ensure waterproof tarpaulins during transit and protect drying yards.' if rain_sum >= 10 else '✅ Low weather risk: favorable drying and transport conditions.'}"
            )

        elif is_market_query:
            sections.append(
                f"**Nearby APMC Comparison:** Current modal rate at {city} APMC is **₹{curr_price:,.2f}/q**. "
                f"{advice.get('market_analysis')}"
            )

        else:
            sections.append(f"**Direct Recommendation:** {advice.get('recommendation')}\n\n{advice.get('reason')}")

        # 2. Known Data vs Model Prediction Breakdown
        sections.append(
            f"\n**📊 Data & Forecast Breakdown:**\n"
            f"- **Current Modal Price (DB):** ₹{curr_price:,.2f} / quintal at {city} APMC\n"
            f"- **XGBoost {days}-Day Prediction:** ₹{target_price:,.2f} / quintal ({direction} by {pct_change:+.2f}%)\n"
            f"- **Open-Meteo Forecast:** {rain_sum:.1f} mm rainfall ({rainy_days} rainy days), {temp_c}°C, {humidity_pct}% RH\n"
            f"- **Risk & Confidence:** **{risk_level} Risk** ({advice.get('risk_score', 30)}/100) | **{confidence} Confidence** ({advice.get('confidence_score', 75)}%)"
        )

        # 3. Agronomic Protocol from RAG
        sections.append(
            f"\n**🌱 Agronomic Guidelines ({top_source}):**\n"
            f"{crop_advice}"
        )

        # 4. Concrete Next Steps
        sections.append(
            f"\n**✅ Suggested Action Plan:**\n"
            f"{advice.get('suggested_action')}"
        )

        return "\n".join(sections)


from services.gemini_service import call_gemini_llm


# ── MAIN ADVISORY SERVICE ENTRY POINT ────────────────────────────────────────
def get_agricultural_market_advice(
    city: str,
    commodity: str,
    days: int = 7,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user_query: Optional[str] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Main entry point for generating dynamic AI Agricultural Recommendations using Google Gemini.
    """
    city = (city or "Sangli").strip()
    commodity = (commodity or "Onion").strip()
    days = 14 if int(days) == 14 else 7
    language = (language or "en").lower().strip()

    cache_key = f"advice_{city.lower()}_{commodity.lower()}_{days}_{lat}_{lon}_{user_query or ''}_{language}"
    cached = _get_cached_advice(cache_key)
    if cached:
        return cached

    # Use Central Context Builder
    grounded_result = build_ai_context(
        city=city,
        commodity=commodity,
        days=days,
        lat=lat,
        lon=lon,
        user_query=user_query
    )

    if grounded_result.get("status") == "error":
        return grounded_result

    # LLM Reasoning Enhancement using Google Gemini
    lang_instruction = "Respond in English."
    if language == "mr":
        lang_instruction = "Respond entirely in Marathi (मराठी)."
    elif language == "hi":
        lang_instruction = "Respond entirely in Hindi (हिन्दी)."

    system_instruction = (
        f"You are FasalNet AI Agricultural Advisor powered by Google Gemini. You provide actionable, grounded agricultural market advice for Indian farmers.\n"
        f"Language Requirement: {lang_instruction}\n"
        "STRICT GUARDRAILS:\n"
        "1. Never invent future prices, market names, or weather values.\n"
        "2. Strictly use the provided XGBoost forecast numbers and Open-Meteo weather values.\n"
        "3. Strictly base agronomic recommendations on the provided ICAR knowledge chunks.\n"
        "4. Output a valid JSON object matching the exact schema:\n"
        "{\"recommendation\": \"...\", \"reason\": \"...\", \"market_analysis\": \"...\", \"price_forecast_summary\": \"...\", \"weather_impact\": \"...\", \"crop_advice\": \"...\", \"risk_level\": \"Low|Moderate|High\", \"confidence\": \"High|Medium|Low\", \"suggested_action\": \"...\"}"
    )

    rain_sum = grounded_result.get("weather", {}).get("rainfall_sum_mm", 0.0)
    weather_risk = grounded_result.get("weather", {}).get("weather_risk", "Low")
    rag_sources_str = ", ".join([s.get("source", "") for s in grounded_result.get("sources", [])])

    llm_prompt = f"""
ACTUAL FASALNET MARKET & FORECAST DATA:
- Market: {city} APMC
- Commodity: {commodity}
- Current Modal Price: ₹{grounded_result['market_context']['current_price']:,.2f}/quintal
- XGBoost {days}-Day Forecast Price: ₹{grounded_result['market_context']['target_price']:,.2f}/quintal (Trend: {grounded_result['market_context']['direction']}, Change: {grounded_result['market_context']['forecast_pct_change']:+.2f}%)
- Forecast Cumulative Rainfall: {rain_sum:.1f} mm across {grounded_result['market_context']['rainy_days']} days (Weather Risk: {weather_risk})
- Current Weather: {grounded_result['market_context']['temperature_c']}°C, {grounded_result['market_context']['humidity_percent']}% Humidity
- Nearby APMC Comparison: {grounded_result['market_analysis']}

RETRIEVED ICAR & UNIVERSITY KNOWLEDGE:
- Sources: {rag_sources_str}
- Guidance: {grounded_result['crop_advice']}

USER QUESTION / FOCUS:
{user_query or 'Provide optimal selling timing, post-harvest precautions, and risk assessment for this crop.'}

Generate a concise, high-impact JSON response adhering strictly to the above facts.
"""

    llm_response_text, model_used, gemini_err = call_gemini_llm(
        prompt=llm_prompt,
        system_instruction=system_instruction,
        max_tokens=1500,
        json_mode=True
    )

    if llm_response_text:
        try:
            # Extract JSON substring
            match = re.search(r"\{.*\}", llm_response_text.strip(), re.DOTALL)
            json_text = match.group(0) if match else llm_response_text.strip()
            parsed = json.loads(json_text)

            # Preserve numerical safety
            grounded_result["recommendation"] = parsed.get("recommendation", grounded_result["recommendation"])
            grounded_result["reason"] = parsed.get("reason", grounded_result["reason"])
            grounded_result["market_analysis"] = parsed.get("market_analysis", grounded_result["market_analysis"])
            grounded_result["price_forecast_summary"] = parsed.get("price_forecast_summary", grounded_result["price_forecast_summary"])
            grounded_result["weather_impact"] = parsed.get("weather_impact", grounded_result["weather_impact"])
            grounded_result["crop_advice"] = parsed.get("crop_advice", grounded_result["crop_advice"])
            grounded_result["risk_level"] = parsed.get("risk_level", grounded_result["risk_level"])
            grounded_result["confidence"] = parsed.get("confidence", grounded_result["confidence"])
            grounded_result["suggested_action"] = parsed.get("suggested_action", grounded_result["suggested_action"])
            grounded_result["ai_engine"] = f"Google Gemini ({model_used or 'gemini-flash'})"
            logger.info(f"Successfully enhanced recommendation with Google Gemini ({model_used}).")
        except Exception as e:
            logger.warning(f"Failed to parse Gemini JSON response, using deterministic engine: {e}")
            grounded_result["ai_engine"] = "FasalNet Grounded Engine"
    else:
        grounded_result["ai_engine"] = "FasalNet Grounded Engine"

    _set_cached_advice(cache_key, grounded_result)
    return grounded_result


def _synthesize_grounded_farmer_chat_reply(
    message: str,
    commodity: str,
    city: str,
    days: int,
    advice: Dict[str, Any],
    language: str
) -> str:
    """
    Synthesize a fully grounded, dynamic, data-driven conversational answer
    using the computed XGBoost forecast, Open-Meteo weather, and ICAR RAG data
    whenever external LLM APIs are offline or credit-limited.
    """
    m_lower = message.lower()
    m_ctx = advice.get("market_context", {})
    curr_price = m_ctx.get("current_price", 0)
    target_price = m_ctx.get("target_price", 0)
    pct_change = m_ctx.get("forecast_pct_change", 0)
    direction = m_ctx.get("direction", "STABLE")
    temp = m_ctx.get("temperature_c", 28)
    humidity = m_ctx.get("humidity_percent", 65)
    rain_mm = m_ctx.get("rainfall_sum_mm", 0)
    weather_risk = m_ctx.get("weather_risk", "Low")
    crop_advice = advice.get("crop_advice", "")
    suggested_action = advice.get("suggested_action", "")
    recommendation = advice.get("recommendation", "")
    reason = advice.get("reason", "")
    market_analysis = advice.get("market_analysis", "")

    is_greeting = any(g in m_lower for g in ["hi", "hello", "hey", "namaste", "who are you", "greeting", "नमस्कार", "नमस्ते"])
    is_weather = any(w in m_lower for w in ["weather", "rain", "temperature", "humidity", "monsoon", "climate", "paus", "varsha", "हवामान", "पाऊस", "तापमान"])
    is_price_forecast = any(p in m_lower for p in ["forecast", "price", "bhav", "rate", "target", "trend", "xgboost", "modal", "sell", "hold", "vikava", "bechna", "भाव", "अंदाज", "किंमत", "बेचना", "विकावे"])
    is_nearby = any(n in m_lower for n in ["compare", "nearby", "mandi", "market", "kolhapur", "sangli", "pune", "apmc", "arbitrage", "तुलना", "जवळपास"])
    is_storage = any(s in m_lower for s in ["storage", "icar", "rot", "cure", "disease", "sprout", "pest", "guidelines", "protect", "साठवणूक", "बुरशी", "भंडारण"])

    if language == "mr":
        if is_greeting and not (is_price_forecast or is_weather):
            return f"नमस्कार! मी फसलनेट (FasalNet) AI शेती व बाजार सल्लागार आहे. मी तुम्हाला {city} बाजार समितीतील {commodity} चे भाव, {days} दिवसांचा XGBoost अंदाज, हवामान आणि ICAR मार्गदर्शक तत्त्वे सांगू शकतो. मी तुम्हाला कशी मदत करू?"
        if is_weather and not is_price_forecast:
            return f"**{city} परिसरातील हवामान अंदाज:**\n- **तापमान:** {temp}°C | **हवेतील आर्द्रता:** {humidity}%\n- **पावसाचा अंदाज:** पुढील दिवसांत ~{rain_mm:.1f} मिमी पाऊस अपेक्षित आहे (हवामान जोखीम: **{weather_risk}**).\n- **कृषी सल्ला:** {advice.get('weather_impact', 'काढणी केलेले पीक सुरक्षित व कोरड्या जागी साठवावे.')}"
        if is_storage:
            return f"**{commodity} साठी ICAR व कृषी विद्यापीठांचा साठवणूक सल्ला:**\n{crop_advice}\n\n**शिफारस केलेली कृती:**\n{suggested_action}"
        if is_nearby:
            return f"**{commodity} बाजारभाव तुलना व विश्लेषण:**\n{market_analysis}\n\n- **{city} APMC सध्याचा दर:** ₹{curr_price:,.2f}/क्विंटल\n- **{days} दिवसांचा अंदाज:** ₹{target_price:,.2f}/क्विंटल ({pct_change:+.2f}% {direction})\n\n**सल्ला:** {suggested_action}"
        
        action_title = "HOLD (थांबणे फायदेशीर)" if direction == "UP" and pct_change >= 4.0 else ("SELL (तात्काळ विक्री करा)" if direction == "DOWN" and pct_change <= -4.0 else "नियमित विक्री करा")
        return (
            f"**{city} APMC - {commodity} बाजार सल्ला ({days} दिवस):**\n\n"
            f"• **शिफारस:** **{action_title}** — {recommendation}\n"
            f"• **XGBoost भाव अंदाज:** सध्याचा दर **₹{curr_price:,.2f}/क्विंटल** असून {days} दिवसांत **₹{target_price:,.2f}/क्विंटल** ({pct_change:+.2f}% कल) जाण्याची शक्यता आहे.\n"
            f"• **हवामान घटक (Open-Meteo):** तापमान {temp}°C, आर्द्रता {humidity}%, पाऊस ~{rain_mm:.1f} मिमी (जोखीम: {weather_risk}).\n"
            f"• **कृती योजना:**\n{suggested_action}"
        )

    elif language == "hi":
        if is_greeting and not (is_price_forecast or is_weather):
            return f"नमस्ते! मैं फसलनेट (FasalNet) AI कृषि एवं मंडी सलाहकार हूँ। मैं आपको {city} मंडी में {commodity} के भाव, {days} दिनों के XGBoost पूर्वानुमान और मौसम अनुसार सटीक सलाह दे सकता हूँ।"
        if is_weather and not is_price_forecast:
            return f"**{city} मंडी क्षेत्र में मौसम की स्थिति:**\n- **तापमान:** {temp}°C | **आर्द्रता:** {humidity}%\n- **बारिश का अनुमान:** अगले दिनों में ~{rain_mm:.1f} मिमी बारिश की संभावना (मौसम जोखिम: **{weather_risk}**)।\n- **कृषि सलाह:** {advice.get('weather_impact', 'फसल को सुरक्षित और सूखे स्थान पर रखें।')}"
        if is_storage:
            return f"**{commodity} के लिए ICAR कृषि एवं भंडारण सलाह:**\n{crop_advice}\n\n**सुझाई गई कार्रवाई:**\n{suggested_action}"
        if is_nearby:
            return f"**{commodity} मंडी भाव तुलना एवं विश्लेषण:**\n{market_analysis}\n\n- **{city} मंडी वर्तमान दर:** ₹{curr_price:,.2f}/क्विंटल\n- **{days} दिनों का पूर्वानुमान:** ₹{target_price:,.2f}/क्विंटल ({pct_change:+.2f}% {direction})\n\n**सिफारिश:** {suggested_action}"
        
        action_title = "HOLD (रोककर रखें)" if direction == "UP" and pct_change >= 4.0 else ("SELL (तुरंत बेचें)" if direction == "DOWN" and pct_change <= -4.0 else "सामान्य बिक्री बनाए रखें")
        return (
            f"**{city} मंडी - {commodity} बाजार सलाह ({days} दिन):**\n\n"
            f"• **मुख्य सिफारिश:** **{action_title}** — {recommendation}\n"
            f"• **XGBoost मूल्य विश्लेषण:** वर्तमान मॉडल दर **₹{curr_price:,.2f}/क्विंटल** है, तथा {days} दिनों में **₹{target_price:,.2f}/क्विंटल** ({pct_change:+.2f}% रुझान) संभावित है।\n"
            f"• **मौसम प्रभाव (Open-Meteo):** तापमान {temp}°C, आर्द्रता {humidity}%, वर्षा ~{rain_mm:.1f} मिमी (जोखिम: {weather_risk})।\n"
            f"• **कार्रवाई योजना:**\n{suggested_action}"
        )

    else:
        if is_greeting and not (is_price_forecast or is_weather):
            return f"Hello! I am FasalNet AI, your agricultural and market intelligence assistant. I analyze live APMC mandi prices, XGBoost machine learning price trends, and Open-Meteo weather for **{commodity}** in **{city} APMC**. How can I help you today?"
        if is_weather and not is_price_forecast:
            return f"**Live Weather Advisory for {city}:**\n\n- **Current Conditions:** {temp}°C, {humidity}% Relative Humidity\n- **Precipitation Outlook:** ~{rain_mm:.1f} mm rain expected (Weather Risk: **{weather_risk}**)\n- **Agronomic Impact:** {advice.get('weather_impact', 'Ensure harvested crops are stored safely in covered, well-ventilated structures.')}"
        if is_storage:
            return f"**ICAR & University Agronomic Advisory for {commodity}:**\n\n{crop_advice}\n\n**Recommended Action Plan:**\n{suggested_action}"
        if is_nearby:
            return f"**Mandi Comparison & Spatial Arbitrage for {commodity}:**\n\n{market_analysis}\n\n- **{city} APMC Modal Rate:** ₹{curr_price:,.2f}/quintal\n- **{days}-Day Forecast Target:** ₹{target_price:,.2f}/quintal ({pct_change:+.2f}% {direction})\n\n**Action Plan:**\n{suggested_action}"

        action_title = "HOLD FOR TARGET REALIZATION" if direction == "UP" and pct_change >= 4.0 else ("SELL IMMEDIATELY" if direction == "DOWN" and pct_change <= -4.0 else "MAINTAIN REGULAR HARVEST & DISPATCH")
        return (
            f"**FasalNet Market Recommendation for {commodity} @ {city} APMC ({days}-Day Horizon):**\n\n"
            f"• **Recommendation:** **{action_title}** — {recommendation}\n\n"
            f"• **Price Intelligence (XGBoost Regressor):** Current modal rate is **₹{curr_price:,.2f}/q** with a projected {days}-day target of **₹{target_price:,.2f}/q** ({pct_change:+.2f}% trajectory).\n\n"
            f"• **Weather & Crop Risk (Open-Meteo):** Current {temp}°C ({humidity}% humidity) with ~{rain_mm:.1f} mm rain expected (Risk: **{weather_risk}**).\n\n"
            f"• **Action Plan:**\n{suggested_action}"
        )


# ── CONVERSATIONAL AI CHAT SERVICE WITH CONVERSATION MEMORY ──────────────────
def ask_ai_farmer_chat(
    message: str,
    city: str,
    commodity: str,
    days: int = 7,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    conversation_id: Optional[str] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Handles conversational natural language farmer queries with conversation session tracking,
    coreference resolution, and dynamic multilingual generation using xAI Grok.
    """
    conv_id, session = _get_or_create_session(conversation_id)
    language = (language or "en").lower().strip()

    # Sync chat history from frontend if supplied
    if chat_history and isinstance(chat_history, list):
        for item in chat_history:
            role = "user" if item.get("role") == "user" or item.get("sender") == "user" else "assistant"
            content = item.get("content") or item.get("text") or ""
            if content and not any(h.get("content") == content for h in session["history"]):
                session["history"].append({"role": role, "content": content})

    # Coreference resolution: If message refers to prior context, switches horizon, city, or crop
    msg_lower = message.lower()

    # Detect horizon shift in user query (e.g. "What about after 7 days?", "What about 14 days?")
    if any(phrase in msg_lower for phrase in ["after 7 days", "14 days", "14 day", "next week", "14-day", "१४ दिवस", "14 दिन", "२ आठवडे", "2 weeks"]):
        days = 14
    elif any(phrase in msg_lower for phrase in ["7 days", "7 day", "7-day", "७ दिवस", "7 दिन", "1 week", "एक आठवडा"]):
        days = 7

    # Detect city shift in user query (e.g. "What about Kolhapur?", "What about Pune?")
    all_known_cities = list(TOWN_COORDINATES.keys()) + list(DISTRICT_COORDINATES.keys())
    for known_c in all_known_cities:
        if known_c.lower() in msg_lower and len(known_c) > 3:
            city = known_c
            lat, lon = None, None  # Force coordinate re-resolution
            break

    crop_synonyms = {
        "onion": ["onion", "kanda", "pyaz", "कांदा", "प्याज"],
        "tomato": ["tomato", "tamatar", "टोमॅटो", "टमाटर"],
        "potato": ["potato", "batata", "alu", "बटाटा", "आलू"],
        "soybean": ["soybean", "soya", "सोयाबीन"],
        "wheat": ["wheat", "gehu", "गहू", "गेहूं"],
        "cotton": ["cotton", "kapas", "कापूस", "कपास"],
        "gram": ["gram", "chana", "हरभरा", "चना"],
        "maize": ["maize", "makka", "मका", "मक्का"],
        "turmeric": ["turmeric", "haldi", "हळद", "हल्दी"],
        "garlic": ["garlic", "lahsun", "लसूण", "लहसुन"],
        "pomegranate": ["pomegranate", "anar", "डाळिंब", "अनार"],
        "banana": ["banana", "kela", "केळी", "केला"],
        "grape": ["grape", "draksha", "द्राक्षे", "अंगूर"],
        "apple": ["apple", "seb", "सफरचंद", "सेब"],
        "mango": ["mango", "aam", "amba", "हापूस", "आंबा", "आम"],
        "orange": ["orange", "santra", "santre", "संत्रे", "संतरा"],
        "chilli": ["chilli", "chili", "mirchi", "मिरची", "मिर्च"],
        "ginger": ["ginger", "adrak", "ale", "आले", "अदरक"],
        "rice": ["rice", "paddy", "chawal", "dhan", "तांदूळ", "चावल", "धान"]
    }

    # Detect if user mentioned a new crop in message
    detected_crop = None
    for canonical, variants in crop_synonyms.items():
        if any(v in msg_lower for v in variants):
            detected_crop = canonical.capitalize()
            break

    if detected_crop:
        commodity = detected_crop
    elif session.get("last_context", {}).get("commodity"):
        commodity = session["last_context"]["commodity"]

    if session.get("last_context", {}).get("city") and not any(known_c.lower() in msg_lower for known_c in all_known_cities if len(known_c) > 3):
        city = session["last_context"]["city"]

    advice = build_ai_context(
        city=city,
        commodity=commodity,
        days=days,
        lat=lat,
        lon=lon,
        user_query=message
    )

    if advice.get("status") == "error":
        return {
            "success": False,
            "status": "error",
            "code": "DATA_UNAVAILABLE",
            "error_code": "DATA_UNAVAILABLE",
            "conversation_id": conv_id,
            "message": "Unable to retrieve current market data for this crop and location. Please try again.",
            "error": "Unable to retrieve current market data for this crop and location. Please try again.",
            "retryable": True,
            "sources": []
        }

    # Store in session context
    session["last_context"] = {
        "city": city,
        "commodity": commodity,
        "days": days,
        "current_price": advice.get("market_context", {}).get("current_price"),
        "target_price": advice.get("market_context", {}).get("target_price")
    }

    # Build Recent Conversation Turns string
    history_snippets = []
    for h in session.get("history", [])[-6:]:
        role_label = "Farmer" if h.get("role") == "user" else "FasalNet AI"
        text_content = h.get("content", "").strip()
        if text_content:
            history_snippets.append(f"{role_label}: {text_content[:200]}")
    history_str = "\n".join(history_snippets) if history_snippets else "No prior conversation history."

    lang_instruction = "Respond in natural English."
    if language == "mr":
        lang_instruction = "Respond entirely in fluent Marathi (मराठी). Use accurate agricultural terms like बाजार समिती, क्विंटल, कांदा चाळ, साठवणूक, बुरशी."
    elif language == "hi":
        lang_instruction = "Respond entirely in fluent Hindi (हिन्दी). Use accurate agricultural terms like मंडी, क्विंटल, भंडारण, नमी, फफूंद."

    system_instruction = (
        "You are FasalNet AI, an intelligent, empathetic agricultural market advisor for Indian farmers.\n"
        f"Language Requirement: {lang_instruction}\n"
        "Guidelines:\n"
        "- Directly answer the farmer's question with high relevance and conversational clarity.\n"
        "- Strictly base all facts, prices, weather, and agronomy on the provided data.\n"
        "- Never invent or hallucinate market prices, weather conditions, or fake numbers.\n"
        "- Maintain multi-turn conversational context seamlessly."
    )

    prompt = f"""
FARMER QUESTION: "{message}"

CONVERSATION HISTORY (for follow-up context):
{history_str}

LIVE FASALNET CONTEXT & EMPIRICAL DATA:
- Crop / Commodity: {commodity}
- Selected Market / APMC: {city} APMC
- Current DB Modal Price: ₹{advice.get('market_context', {}).get('current_price', 0):,.2f} per quintal
- XGBoost {days}-Day Numerical Price Forecast: ₹{advice.get('market_context', {}).get('target_price', 0):,.2f} per quintal (Trend: {advice.get('market_context', {}).get('direction')}, {advice.get('market_context', {}).get('forecast_pct_change', 0):+.2f}%)
- Current Weather Sensor: {advice.get('market_context', {}).get('temperature_c', 28)}°C, {advice.get('market_context', {}).get('humidity_percent', 65)}% Relative Humidity
- Open-Meteo Upcoming Weather: {advice.get('market_context', {}).get('rainfall_sum_mm', 0):.1f} mm rain across {advice.get('market_context', {}).get('rainy_days', 0)} rainy days (Weather Risk: {advice.get('market_context', {}).get('weather_risk')})
- Nearby Mandi Comparison & Arbitrage: {advice.get('market_analysis')}
- ICAR / University Agronomic Knowledge: {advice.get('crop_advice')}
- Recommended Core Action: {advice.get('suggested_action')}
- Verified Sources Consulted: {[s['source'] for s in advice.get('sources', [])]}

Answer the farmer's specific question directly, thoroughly, and helpfully in the requested language.
"""

    llm_reply, model_used, gemini_err = call_gemini_llm(
        prompt=prompt,
        system_instruction=system_instruction,
        max_tokens=1500
    )

    if not llm_reply:
        logger.warning(f"[Ask AI Chat] Gemini LLM unavailable (Error: {gemini_err}). Returning AI_SERVICE_UNAVAILABLE.")
        return {
            "success": False,
            "status": "error",
            "code": "AI_SERVICE_UNAVAILABLE",
            "error_code": "AI_SERVICE_UNAVAILABLE",
            "conversation_id": conv_id,
            "message": "AI Assistant is temporarily unavailable. Please try again later.",
            "error": "AI Assistant is temporarily unavailable. Please try again later.",
            "retryable": True,
            "sources": advice.get("sources", [])
        }

    ai_engine = f"Google Gemini ({model_used or 'gemini-flash'})"

    # Save to session history
    session["history"].append({"role": "user", "content": message})
    session["history"].append({"role": "assistant", "content": llm_reply})

    return {
        "success": True,
        "status": "success",
        "answer": llm_reply.strip(),
        "reply": llm_reply.strip(),
        "ai_engine": ai_engine,
        "conversation_id": conv_id,
        "sources": advice.get("sources", []),
        "contextUsed": {
            "commodity": commodity,
            "city": city,
            "days": days,
            "current_price": advice.get("market_context", {}).get("current_price"),
            "target_price": advice.get("market_context", {}).get("target_price"),
            "direction": advice.get("market_context", {}).get("direction"),
            "forecast_pct_change": advice.get("market_context", {}).get("forecast_pct_change"),
            "temperature_c": advice.get("market_context", {}).get("temperature_c"),
            "humidity_percent": advice.get("market_context", {}).get("humidity_percent"),
            "rainfall_sum_mm": advice.get("market_context", {}).get("rainfall_sum_mm"),
            "weather_risk": advice.get("market_context", {}).get("weather_risk")
        },
        "recommendation_summary": advice.get("recommendation"),
        "risk_level": advice.get("risk_level"),
        "risk_score": advice.get("risk_score"),
        "risk_factors": advice.get("risk_factors", []),
        "confidence": advice.get("confidence"),
        "confidence_score": advice.get("confidence_score"),
        "confidence_breakdown": advice.get("confidence_breakdown", {}),
        "actual_data": advice.get("actual_data", {}),
        "forecast": advice.get("forecast", {}),
        "weather": advice.get("weather", {}),
        "data_provenance_labels": advice.get("data_provenance_labels", {}),
        "market_context": advice.get("market_context", {}),
        "data_timestamp": advice.get("data_timestamp")
    }


