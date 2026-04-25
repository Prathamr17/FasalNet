"""
FasalNet – Spoilage Risk Engine
Rule-based, modular design – swap `calculate_risk()` with an ML model later.

Risk levels:
  SAFE     → produce is within comfortable window
  RISKY    → approaching threshold; book storage soon
  CRITICAL → past threshold; immediate cold storage required
"""
from dataclasses import dataclass

# ── Crop-specific thresholds (days since harvest) ──────────────────────────
CROP_RULES: dict[str, dict] = {
    "tomato":       {"risky": 3,  "critical": 5,  "temp_sensitive": True},
    "leafy greens": {"risky": 2,  "critical": 3,  "temp_sensitive": True},
    "spinach":      {"risky": 2,  "critical": 3,  "temp_sensitive": True},
    "onion":        {"risky": 30, "critical": 60, "temp_sensitive": False},
    "potato":       {"risky": 20, "critical": 45, "temp_sensitive": False},
    "mango":        {"risky": 5,  "critical": 8,  "temp_sensitive": True},
    "banana":       {"risky": 4,  "critical": 6,  "temp_sensitive": True},
    "grapes":       {"risky": 7,  "critical": 14, "temp_sensitive": True},
    "cauliflower":  {"risky": 4,  "critical": 7,  "temp_sensitive": True},
    "rice":         {"risky": 30, "critical": 60, "temp_sensitive": False},
    "wheat":        {"risky": 45, "critical": 90, "temp_sensitive": False},
    "maize":        {"risky": 20, "critical": 40, "temp_sensitive": False},
    # fallback
    "default":      {"risky": 15, "critical": 30, "temp_sensitive": False},
}


@dataclass
class RiskResult:
    risk_level:       str          # SAFE | RISKY | CRITICAL
    risk_score:       int          # 0–100
    days_until_risky: int
    days_until_critical: int
    temp_sensitive:   bool
    recommendations:  list[str]


def calculate_risk(
    crop_type: str,
    harvest_age_days: int,
    weather_temp_celsius: float | None = None,
    travel_delay_hours: int = 0,
) -> RiskResult:
    """
    Primary risk calculation function.
    Modular: replace the body with an ML inference call without changing the signature.
    """
    key = crop_type.lower().strip()
    rules = CROP_RULES.get(key, CROP_RULES["default"])

    # Base score proportional to how close we are to the critical threshold
    base_score = (harvest_age_days / rules["critical"]) * 80

    # Penalise travel delay (adds urgency)
    if travel_delay_hours > 0:
        base_score += (travel_delay_hours / 24) * 10

    # Extra penalty for temperature-sensitive crops in hot weather
    if rules["temp_sensitive"] and weather_temp_celsius and weather_temp_celsius > 30:
        base_score += (weather_temp_celsius - 30) * 1.5

    risk_score = min(100, int(base_score))

    # Determine level
    if harvest_age_days >= rules["critical"]:
        level = "CRITICAL"
    elif harvest_age_days >= rules["risky"]:
        level = "RISKY"
    else:
        level = "SAFE"

    days_to_risky    = max(0, rules["risky"]    - harvest_age_days)
    days_to_critical = max(0, rules["critical"] - harvest_age_days)

    recs = _recommendations(level, crop_type, harvest_age_days, days_to_critical)

    return RiskResult(
        risk_level=level,
        risk_score=risk_score,
        days_until_risky=days_to_risky,
        days_until_critical=days_to_critical,
        temp_sensitive=rules["temp_sensitive"],
        recommendations=recs,
    )


def _recommendations(level: str, crop: str, age: int, days_left: int) -> list[str]:
    if level == "CRITICAL":
        return [
            f"⚠️ URGENT: {crop.title()} at {age} days exceeds safe storage threshold.",
            "Contact the nearest cold storage facility immediately.",
            "Every hour of delay increases spoilage risk and price loss.",
        ]
    if level == "RISKY":
        return [
            f"Book cold storage within {days_left} days to prevent critical loss.",
            "Pre-sort and grade your produce before storage for better returns.",
            "Compare rates — you still have time to choose the best facility.",
        ]
    return [
        "Produce is within safe limits. Take time to compare storage rates.",
        "Booking now secures capacity at a lower urgency premium.",
        f"You have approximately {days_left} days before entering the risky zone.",
    ]
