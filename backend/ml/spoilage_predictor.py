"""
FasalNet — XGBoost Spoilage Predictor
======================================
Uses the trained XGBoost regression + classification pipelines
built from spoilage_risk_synthetic_2000.csv.

Fixes applied vs original:
  1. Correct cat values (novice/moderate/expert, good/poor/fair, etc.)
  2. Separate make_preprocessor() per pipeline to avoid shared state
  3. LabelEncoder used correctly — labels decoded via inverse_transform
  4. risk_score derived from regression model (not probability hack)
  5. crop_type added as a feature (was missing from old predictor)
  6. Thread-safe singleton model loading with lock
"""

import logging
import threading
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# ── Model bundle path ──────────────────────────────────────────────────────
BUNDLE_PATH = Path(__file__).parent / "model_cache" / "spoilage_xgb_bundle.joblib"

# ── Valid categorical values (from training data) ──────────────────────────
# These must match training data exactly — wrong values → silent zeroing by OHE
VALID_VALUES = {
    "crop_type":         ["potato", "onion", "tomato", "eggplant", "leafy_greens"],
    "region":            ["maharashtra_1", "maharashtra_2", "maharashtra_3"],
    "farmer_experience": ["novice", "moderate", "expert"],
    "bin_quality":       ["good", "poor", "fair"],
    "vehicle_type":      ["refrigerated", "covered", "open"],
}

# ── Singleton ──────────────────────────────────────────────────────────────
_bundle = None
_lock   = threading.Lock()


def _load_bundle() -> dict:
    """Load the joblib bundle once and cache in memory."""
    global _bundle
    if _bundle is not None:
        return _bundle
    with _lock:
        if _bundle is not None:        # double-checked locking
            return _bundle
        if not BUNDLE_PATH.exists():
            raise FileNotFoundError(
                f"Spoilage model bundle not found at {BUNDLE_PATH}.\n"
                "Run train_spoilage_model.py to generate it."
            )
        log.info("ML: Loading spoilage XGBoost bundle from %s", BUNDLE_PATH)
        _bundle = joblib.load(BUNDLE_PATH)
        log.info("ML: Spoilage bundle loaded. Label classes: %s",
                 _bundle.get("label_classes"))
        return _bundle


# ── Input validation / normalisation ──────────────────────────────────────
def _normalise(field: str, value: str) -> str:
    """
    Lowercase + strip the value. If it's not in the training vocabulary,
    log a warning and fall back to the first valid value so OHE doesn't
    silently zero-out the entire category row.
    """
    v = value.lower().strip()
    valid = VALID_VALUES.get(field, [])
    if valid and v not in valid:
        log.warning(
            "ML: '%s' is not a known value for '%s'. Valid: %s. "
            "Falling back to '%s'.", v, field, valid, valid[0]
        )
        return valid[0]
    return v


# ── Recommendation text ────────────────────────────────────────────────────
def _recommendations(risk_level: str, crop_type: str,
                     harvest_age_hrs: float, risk_score: float) -> list:
    age_days = round(harvest_age_hrs / 24, 1)
    if risk_level == "CRITICAL":
        return [
            f"⚠️ URGENT: {crop_type.replace('_',' ').title()} at {age_days} days "
            f"has a critical risk score of {int(risk_score)}/100.",
            "Book cold storage immediately — every hour increases spoilage loss.",
            "Sort and grade produce before loading to minimise cold-chain waste.",
        ]
    if risk_level == "RISKY":
        return [
            f"Book cold storage soon — risk score is {int(risk_score)}/100.",
            "Pre-cool produce if ambient temp is above 28 °C before transport.",
            "Compare storage rates — you still have time to choose the best facility.",
        ]
    return [
        f"Produce is safe (risk score {int(risk_score)}/100). No immediate action needed.",
        "Booking now secures cold storage capacity at a lower urgency premium.",
        "Maintain ambient temp below 30 °C during transport to preserve shelf life.",
    ]


# ── Public API ─────────────────────────────────────────────────────────────
def predict_spoilage(
    crop_type:        str,
    harvest_age_hrs:  float,
    distance_km:      float  = 20.0,
    ambient_temp_c:   float  = 28.0,
    humidity_pct:     float  = 65.0,
    rainfall_48h_mm:  float  = 5.0,
    travel_time_hrs:  float  = 2.0,
    season_month:     int    = 6,
    region:           str    = "maharashtra_1",
    farmer_experience: str   = "moderate",
    bin_quality:      str    = "good",
    vehicle_type:     str    = "covered",
) -> dict:
    """
    Predict spoilage risk using the trained XGBoost pipelines.

    Returns:
        {
          risk_level:       "SAFE" | "RISKY" | "CRITICAL"
          risk_score:       0-100  (from regression model)
          confidence_pct:   0-100  (from classification probabilities)
          recommendations:  [str, ...]
          model_used:       "xgboost"
          input_used:       {the normalised input}
        }
    """
    bundle = _load_bundle()

    reg_pipeline  = bundle["reg_pipeline"]
    cls_pipeline  = bundle["cls_pipeline"]
    label_encoder = bundle["label_encoder"]

    # Normalise categoricals — fixes the "Medium"/"Good"/"Truck" silent bug
    crop_type_n         = _normalise("crop_type",         crop_type)
    region_n            = _normalise("region",            region)
    farmer_experience_n = _normalise("farmer_experience", farmer_experience)
    bin_quality_n       = _normalise("bin_quality",       bin_quality)
    vehicle_type_n      = _normalise("vehicle_type",      vehicle_type)

    input_df = pd.DataFrame([{
        "harvest_age_hrs":  float(harvest_age_hrs),
        "distance_km":      float(distance_km),
        "ambient_temp_c":   float(ambient_temp_c),
        "humidity_pct":     float(humidity_pct),
        "rainfall_48h_mm":  float(rainfall_48h_mm),
        "travel_time_hrs":  float(travel_time_hrs),
        "season_month":     int(season_month),
        "crop_type":        crop_type_n,
        "region":           region_n,
        "farmer_experience": farmer_experience_n,
        "bin_quality":      bin_quality_n,
        "vehicle_type":     vehicle_type_n,
    }])

    # Regression → risk_score (0–100)
    raw_score  = float(reg_pipeline.predict(input_df)[0])
    risk_score = round(max(0.0, min(100.0, raw_score)), 1)

    # Classification → risk_level + confidence
    cls_probs   = cls_pipeline.predict_proba(input_df)[0]
    pred_idx    = int(np.argmax(cls_probs))
    risk_level  = label_encoder.inverse_transform([pred_idx])[0]  # decode 0→CRITICAL etc.
    confidence  = round(float(cls_probs[pred_idx]) * 100, 1)

    # Build per-class probability dict for frontend
    class_probs = {
        label: round(float(p) * 100, 1)
        for label, p in zip(label_encoder.classes_, cls_probs)
    }

    return {
        "risk_level":       risk_level,
        "risk_score":       risk_score,
        "confidence_pct":   confidence,
        "class_probabilities": class_probs,    # {"CRITICAL": x, "RISKY": y, "SAFE": z}
        "recommendations":  _recommendations(risk_level, crop_type_n,
                                             harvest_age_hrs, risk_score),
        "model_used":       "xgboost",
        "input_used": {
            "crop_type":          crop_type_n,
            "harvest_age_hrs":    harvest_age_hrs,
            "distance_km":        distance_km,
            "ambient_temp_c":     ambient_temp_c,
            "humidity_pct":       humidity_pct,
            "rainfall_48h_mm":    rainfall_48h_mm,
            "travel_time_hrs":    travel_time_hrs,
            "season_month":       season_month,
            "region":             region_n,
            "farmer_experience":  farmer_experience_n,
            "bin_quality":        bin_quality_n,
            "vehicle_type":       vehicle_type_n,
        },
    }


# ── Metadata for frontend dropdowns ───────────────────────────────────────
def get_spoilage_metadata() -> dict:
    """Return valid categorical values for frontend form dropdowns."""
    return {
        "crop_types":         VALID_VALUES["crop_type"],
        "regions":            VALID_VALUES["region"],
        "farmer_experiences": VALID_VALUES["farmer_experience"],
        "bin_qualities":      VALID_VALUES["bin_quality"],
        "vehicle_types":      VALID_VALUES["vehicle_type"],
        "season_months":      list(range(1, 13)),
    }