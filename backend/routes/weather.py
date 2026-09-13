"""
backend/routes/weather.py — FasalNet Real-Time Weather & Climate API
Provides weather endpoints backed by Open-Meteo.
"""

import logging
from flask import Blueprint, request, jsonify
from services.weather_service import fetch_open_meteo_weather

log = logging.getLogger(__name__)

weather_bp = Blueprint("weather", __name__, url_prefix="/api/weather")


def _parse_coords(req):
    """Safely parse and validate latitude and longitude from request query parameters."""
    lat_str = req.args.get("lat") or req.args.get("latitude")
    lon_str = req.args.get("lon") or req.args.get("longitude") or req.args.get("lng")

    if not lat_str or not lon_str:
        return None, None, "Both 'lat' and 'lon' parameters are required."

    try:
        lat = float(lat_str)
        lon = float(lon_str)
    except (ValueError, TypeError):
        return None, None, "Latitude and longitude must be valid numerical values."

    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        return None, None, "Coordinates out of bounds: lat [-90, 90], lon [-180, 180]."

    return lat, lon, None


@weather_bp.route("/summary", methods=["GET"])
def get_weather_summary():
    """
    Get complete real-time weather + 7–14 day forecast and farm advisories.
    Query params:
      - lat / latitude (float)
      - lon / longitude (float)
      - days (int, optional, default 14, max 16)
    """
    lat, lon, err = _parse_coords(request)
    if err:
        return jsonify({"status": "error", "error": err}), 400

    days = request.args.get("days", 14)
    try:
        days = int(days)
    except ValueError:
        days = 14

    try:
        data = fetch_open_meteo_weather(lat, lon, days=days)
        return jsonify(data), 200
    except Exception as exc:
        log.exception("Error fetching weather summary for lat=%s, lon=%s", lat, lon)
        return jsonify({
            "status": "error",
            "error": "Failed to fetch real-time weather from Open-Meteo provider.",
            "detail": str(exc)
        }), 502


@weather_bp.route("/current", methods=["GET"])
def get_current_weather():
    """
    Get real-time current weather conditions.
    Query params:
      - lat / latitude (float)
      - lon / longitude (float)
    """
    lat, lon, err = _parse_coords(request)
    if err:
        return jsonify({"status": "error", "error": err}), 400

    try:
        data = fetch_open_meteo_weather(lat, lon, days=1)
        return jsonify({
            "status": "success",
            "location": data["location"],
            "current": data["current"],
            "advisories": data["advisories"],
            "timestamp": data["timestamp"]
        }), 200
    except Exception as exc:
        log.exception("Error fetching current weather for lat=%s, lon=%s", lat, lon)
        return jsonify({
            "status": "error",
            "error": "Failed to fetch current weather.",
            "detail": str(exc)
        }), 502


@weather_bp.route("/forecast", methods=["GET"])
def get_weather_forecast():
    """
    Get 7 to 14-day daily weather forecast.
    Query params:
      - lat / latitude (float)
      - lon / longitude (float)
      - days (int, optional, default 14)
    """
    lat, lon, err = _parse_coords(request)
    if err:
        return jsonify({"status": "error", "error": err}), 400

    days = request.args.get("days", 14)
    try:
        days = int(days)
    except ValueError:
        days = 14

    try:
        data = fetch_open_meteo_weather(lat, lon, days=days)
        return jsonify({
            "status": "success",
            "location": data["location"],
            "forecast": data["forecast"],
            "advisories": data["advisories"],
            "timestamp": data["timestamp"]
        }), 200
    except Exception as exc:
        log.exception("Error fetching weather forecast for lat=%s, lon=%s", lat, lon)
        return jsonify({
            "status": "error",
            "error": "Failed to fetch weather forecast.",
            "detail": str(exc)
        }), 502
