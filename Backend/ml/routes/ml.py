"""
FasalNet v9 — ML Prediction Routes
===================================
Endpoints:
  POST /api/predict/price          – predict modal price (₹/quintal)
  POST /api/predict/price-class    – classify price as Low/Medium/High
  POST /api/predict/market         – market recommendation (best price by location)
  POST /api/predict/spoilage       – XGBoost spoilage risk (SAFE/RISKY/CRITICAL)  ← NEW
  GET  /api/predict/metadata       – dropdown values for all models
  GET  /api/predict/spoilage/meta  – dropdown values for spoilage form             ← NEW
"""

import os
import logging
import threading

import joblib
import numpy as np
import pandas as pd
import requests

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

# Spoilage predictor — uses XGBoost pipelines trained on our CSV
from ml.spoilage_predictor import predict_spoilage, get_spoilage_metadata

log = logging.getLogger(__name__)

ml_bp = Blueprint("ml", __name__, url_prefix="/api/predict")

# ─────────────────────────────────────────────────────────────
#  Google Drive config (price / market models)
# ─────────────────────────────────────────────────────────────
DRIVE_FILE_IDS = {
    "crop_price_model":          os.getenv("GDRIVE_PRICE_MODEL_ID",    ""),
    "crop_price_classification": os.getenv("GDRIVE_CLASSIFY_MODEL_ID", ""),
    "market_recommendation":     os.getenv("GDRIVE_MARKET_MODEL_ID",   ""),
}

MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "model_cache")
os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

_models: dict = {}
_locks:  dict = {k: threading.Lock() for k in DRIVE_FILE_IDS}


def _gdrive_download_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"


def _download_model(key: str) -> str:
    file_id    = DRIVE_FILE_IDS.get(key, "")
    cache_path = os.path.join(MODEL_CACHE_DIR, f"{key}.pkl")

    if os.path.exists(cache_path):
        log.info("ML: Using cached model → %s", cache_path)
        return cache_path

    if not file_id:
        raise RuntimeError(
            f"No Google Drive file ID configured for model '{key}'. "
            f"Set env var GDRIVE_{{KEY}}_MODEL_ID or place the .pkl at {cache_path}"
        )

    log.info("ML: Downloading model '%s' from Google Drive …", key)
    session = requests.Session()
    resp    = session.get(_gdrive_download_url(file_id), stream=True, timeout=120)

    for chunk in resp.iter_content(chunk_size=32768):
        if b"confirm" in chunk.lower():
            try:
                token = chunk.split(b"confirm=")[1].split(b"&")[0].decode()
                resp  = session.get(
                    _gdrive_download_url(file_id) + f"&confirm={token}",
                    stream=True, timeout=120,
                )
            except Exception:
                pass
            break

    resp.raise_for_status()
    with open(cache_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=32768):
            if chunk:
                f.write(chunk)

    log.info("ML: Saved '%s.pkl' → %s", key, cache_path)
    return cache_path


def _load_model(key: str) -> dict:
    if key in _models:
        return _models[key]
    with _locks[key]:
        if key in _models:
            return _models[key]
        local_path = os.path.join(MODEL_CACHE_DIR, f"{key}.pkl")
        if not os.path.exists(local_path):
            local_path = _download_model(key)
        log.info("ML: Loading model bundle '%s' …", key)
        bundle = joblib.load(local_path)
        _models[key] = bundle
        log.info("ML: Model '%s' ready.", key)
        return bundle


# ─────────────────────────────────────────────────────────────
#  Shared preprocessing helper (price/market models)
# ─────────────────────────────────────────────────────────────
def _preprocess(bundle: dict, raw: dict) -> pd.DataFrame:
    encoders        = bundle["encoders"]
    feature_columns = bundle["feature_columns"]
    row = dict(raw)

    CAT_COLS = ["State", "District Name", "Market Name", "Commodity", "Variety", "Grade"]
    for col in CAT_COLS:
        if col in encoders and col in row:
            enc = encoders[col]
            val = str(row[col])
            row[col] = int(enc.transform([val])[0]) if val in enc.classes_ else 0

    for freq_col in ["Commodity_Freq", "Market_Freq", "District_Freq"]:
        if freq_col not in row:
            row[freq_col] = 10000

    df = pd.DataFrame([row])
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    return df[feature_columns]


# ─────────────────────────────────────────────────────────────
#  Static metadata (price/market dropdowns)
# ─────────────────────────────────────────────────────────────
INDIA_STATES = [
    "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa",
    "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
    "Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
    "Uttar Pradesh","Uttarakhand","West Bengal",
]
COMMODITIES = [
    "Tomato","Onion","Potato","Rice","Wheat","Maize","Soybean",
    "Cotton","Sugarcane","Groundnut","Banana","Mango","Grapes",
    "Cauliflower","Cabbage","Spinach","Bitter Gourd","Brinjal",
    "Ladyfinger","Peas","Garlic","Ginger","Turmeric","Chilli",
    "Arhar (Tur/Red Gram)","Moong","Urad","Gram","Sunflower",
]
VARIETIES = ["Local","Hybrid","Dara","FAQ","Other"]
GRADES    = ["FAQ","Grade A","Grade B","Other"]
MONTHS    = list(range(1, 13))

DISTRICTS_BY_STATE = {
    "Maharashtra": ["Pune","Mumbai","Nashik","Nagpur","Aurangabad","Kolhapur",
                    "Sangli","Satara","Ahmednagar","Solapur","Thane","Amravati"],
    "Karnataka":   ["Bengaluru Urban","Mysuru","Hubli-Dharwad","Belagavi",
                    "Mangaluru","Davanagere","Ballari","Shivamogga"],
    "Gujarat":     ["Ahmedabad","Surat","Vadodara","Rajkot","Gandhinagar",
                    "Bhavnagar","Junagadh","Anand"],
    "Uttar Pradesh": ["Lucknow","Agra","Kanpur","Varanasi","Allahabad",
                      "Meerut","Mathura","Bareilly","Auraiya"],
    "Punjab":      ["Amritsar","Ludhiana","Jalandhar","Patiala","Bathinda",
                    "Mohali","Hoshiarpur"],
    "Rajasthan":   ["Jaipur","Jodhpur","Udaipur","Kota","Ajmer","Bikaner","Alwar"],
    "Tamil Nadu":  ["Chennai","Coimbatore","Madurai","Salem","Tiruchirappalli",
                    "Dindigul","Vellore"],
    "West Bengal": ["Kolkata","Howrah","North 24 Parganas","South 24 Parganas",
                    "Murshidabad","Bardhaman"],
    "Telangana":   ["Hyderabad","Warangal","Karimnagar","Nizamabad","Khammam","Rangareddy"],
    "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Tirupati","Kurnool","Nellore"],
}
_default_districts = ["District 1","District 2","District 3"]
for _s in INDIA_STATES:
    if _s not in DISTRICTS_BY_STATE:
        DISTRICTS_BY_STATE[_s] = _default_districts


# ─────────────────────────────────────────────────────────────
#  Route: Metadata (price/market dropdowns)
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/metadata", methods=["GET"])
def get_metadata():
    return jsonify({
        "states":      INDIA_STATES,
        "districts":   DISTRICTS_BY_STATE,
        "commodities": COMMODITIES,
        "varieties":   VARIETIES,
        "grades":      GRADES,
        "months":      MONTHS,
        "month_names": [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December",
        ],
    }), 200


# ─────────────────────────────────────────────────────────────
#  Route: Spoilage Metadata (dropdown values for the form)
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/spoilage/meta", methods=["GET"])
def spoilage_meta():
    """Return valid dropdown values for the spoilage prediction form."""
    return jsonify(get_spoilage_metadata()), 200


# ─────────────────────────────────────────────────────────────
#  Route: Spoilage Prediction  ← NEW (replaces old rule-based endpoint)
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/spoilage", methods=["POST"])
@jwt_required()
def predict_spoilage_route():
    """
    Predict spoilage risk using XGBoost regression + classification pipelines.

    Body JSON:
        crop_type         (str)   required  — "potato"|"onion"|"tomato"|"eggplant"|"leafy_greens"
        harvest_age_hrs   (float) required  — hours since harvest
        distance_km       (float) optional  default 20
        ambient_temp_c    (float) optional  default 28
        humidity_pct      (float) optional  default 65
        rainfall_48h_mm   (float) optional  default 5
        travel_time_hrs   (float) optional  default 2
        season_month      (int)   optional  default 6
        region            (str)   optional  default "maharashtra_1"
        farmer_experience (str)   optional  — "novice"|"moderate"|"expert"
        bin_quality       (str)   optional  — "good"|"poor"|"fair"
        vehicle_type      (str)   optional  — "refrigerated"|"covered"|"open"

    Returns:
        risk_level, risk_score, confidence_pct, class_probabilities,
        recommendations, model_used, input_used
    """
    data = request.get_json(silent=True) or {}

    # Validate required fields
    missing = [f for f in ["crop_type", "harvest_age_hrs"] if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        result = predict_spoilage(
            crop_type         = str(data["crop_type"]),
            harvest_age_hrs   = float(data["harvest_age_hrs"]),
            distance_km       = float(data.get("distance_km",      20.0)),
            ambient_temp_c    = float(data.get("ambient_temp_c",   28.0)),
            humidity_pct      = float(data.get("humidity_pct",     65.0)),
            rainfall_48h_mm   = float(data.get("rainfall_48h_mm",  5.0)),
            travel_time_hrs   = float(data.get("travel_time_hrs",  2.0)),
            season_month      = int(data.get("season_month",       6)),
            region            = str(data.get("region",             "maharashtra_1")),
            farmer_experience = str(data.get("farmer_experience",  "moderate")),
            bin_quality       = str(data.get("bin_quality",        "good")),
            vehicle_type      = str(data.get("vehicle_type",       "covered")),
        )
        return jsonify(result), 200

    except FileNotFoundError as exc:
        log.error("ML: Spoilage model not found: %s", exc)
        return jsonify({
            "error": "Spoilage model not trained yet.",
            "detail": str(exc),
            "hint": "Run: python backend/ml/train_spoilage_model.py",
        }), 503

    except Exception as exc:
        log.exception("ML: Spoilage prediction error")
        return jsonify({"error": "Spoilage prediction failed.", "detail": str(exc)}), 500


# ─────────────────────────────────────────────────────────────
#  Route: Price Prediction
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/price", methods=["POST"])
@jwt_required()
def predict_price():
    data = request.get_json(silent=True) or {}
    required = ["state", "district", "market", "commodity", "variety", "grade", "month"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        bundle = _load_model("crop_price_model")
    except Exception as exc:
        return jsonify({"error": "Price model unavailable.", "detail": str(exc)}), 503

    try:
        import datetime
        today = datetime.date.today()
        raw = {
            "State":         data["state"],
            "District Name": data["district"],
            "Market Name":   data.get("market", data["district"]),
            "Commodity":     data["commodity"],
            "Variety":       data.get("variety", "Local"),
            "Grade":         data.get("grade",   "FAQ"),
            "Year":          int(data.get("year",  today.year)),
            "Month":         int(data["month"]),
            "Day":           int(data.get("day",   15)),
            "DayOfWeek":     int(data.get("day_of_week", 2)),
        }
        df    = _preprocess(bundle, raw)
        model = bundle["model"]
        scaler = bundle.get("scaler")
        X     = scaler.transform(df) if bundle.get("uses_scaling") and scaler else df
        pred  = float(model.predict(X)[0])
        return jsonify({
            "prediction": round(pred, 2),
            "unit":       "₹ per Quintal",
            "model":      bundle.get("model_name", "ML Model"),
            "metrics":    bundle.get("metrics", {}),
            "input":      raw,
        }), 200
    except Exception as exc:
        log.exception("ML: Price prediction error")
        return jsonify({"error": "Prediction failed.", "detail": str(exc)}), 500


# ─────────────────────────────────────────────────────────────
#  Route: Price Classification
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/price-class", methods=["POST"])
@jwt_required()
def predict_price_class():
    data = request.get_json(silent=True) or {}
    required = ["state", "district", "commodity", "month"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        bundle = _load_model("crop_price_classification")
    except Exception as exc:
        return jsonify({"error": "Classification model unavailable.", "detail": str(exc)}), 503

    try:
        import datetime
        today = datetime.date.today()
        raw = {
            "State":         data["state"],
            "District Name": data["district"],
            "Market Name":   data.get("market", data["district"]),
            "Commodity":     data["commodity"],
            "Variety":       data.get("variety", "Local"),
            "Grade":         data.get("grade",   "FAQ"),
            "Year":          int(data.get("year",  today.year)),
            "Month":         int(data["month"]),
            "Day":           int(data.get("day",   15)),
            "DayOfWeek":     int(data.get("day_of_week", 2)),
        }
        df             = _preprocess(bundle, raw)
        model          = bundle["model"]
        scaler         = bundle.get("scaler")
        target_encoder = bundle.get("target_encoder")
        X              = scaler.transform(df) if bundle.get("uses_scaling") and scaler else df
        pred_idx       = int(model.predict(X)[0])
        label          = (
            target_encoder.inverse_transform([pred_idx])[0]
            if target_encoder else str(pred_idx)
        )
        probs = {}
        if hasattr(model, "predict_proba"):
            p       = model.predict_proba(X)[0]
            classes = target_encoder.classes_ if target_encoder else [str(i) for i in range(len(p))]
            probs   = {str(c): round(float(v), 3) for c, v in zip(classes, p)}
        return jsonify({
            "prediction":    label,
            "probabilities": probs,
            "model":         bundle.get("model_name", "ML Classifier"),
            "accuracy":      bundle.get("accuracy"),
            "input":         raw,
        }), 200
    except Exception as exc:
        log.exception("ML: Classification error")
        return jsonify({"error": "Classification failed.", "detail": str(exc)}), 500


# ─────────────────────────────────────────────────────────────
#  Route: Market Recommendation
# ─────────────────────────────────────────────────────────────
@ml_bp.route("/market", methods=["POST"])
@jwt_required()
def recommend_market():
    data = request.get_json(silent=True) or {}
    if not data.get("commodity"):
        return jsonify({"error": "Field 'commodity' is required."}), 400

    try:
        bundle = _load_model("market_recommendation")
    except Exception as exc:
        return jsonify({"error": "Market model unavailable.", "detail": str(exc)}), 503

    try:
        import datetime
        today     = datetime.date.today()
        commodity = data["commodity"]
        variety   = data.get("variety", "Local")
        grade     = data.get("grade",   "FAQ")
        month     = int(data.get("month", today.month))
        state     = data.get("state",    "Maharashtra")

        markets_to_check = data.get("markets") or [
            {"name": d, "district": d, "state": state}
            for d in DISTRICTS_BY_STATE.get(state, ["Pune","Mumbai","Nashik"])[:6]
        ]

        model   = bundle["model"]
        results = []
        for mkt in markets_to_check:
            raw = {
                "State":         mkt.get("state", state),
                "District Name": mkt.get("district", mkt["name"]),
                "Market Name":   mkt["name"],
                "Commodity":     commodity,
                "Variety":       variety,
                "Grade":         grade,
                "Year":          today.year,
                "Month":         month,
                "Day":           15,
                "DayOfWeek":     2,
            }
            df   = _preprocess(bundle, raw)
            pred = float(model.predict(df)[0])
            results.append({
                "market":          mkt["name"],
                "district":        mkt.get("district", mkt["name"]),
                "state":           mkt.get("state", state),
                "predicted_price": round(pred, 2),
            })

        results.sort(key=lambda x: x["predicted_price"], reverse=True)
        for i, r in enumerate(results):
            r["rank"] = i + 1

        return jsonify({
            "commodity":       commodity,
            "recommendations": results,
            "best_market":     results[0] if results else None,
            "model":           bundle.get("model_name", "XGBoost"),
            "metrics":         bundle.get("metrics", {}),
        }), 200
    except Exception as exc:
        log.exception("ML: Market recommendation error")
        return jsonify({"error": "Recommendation failed.", "detail": str(exc)}), 500