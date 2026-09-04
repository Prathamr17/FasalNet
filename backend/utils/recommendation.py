"""
FasalNet – Storage Recommendation Engine
Ranks cold storage facilities by combined score of:
  1. Distance   (Haversine, closer = better)
  2. Urgency    (CRITICAL bookings get distance weight halved)
  3. Capacity   (more available capacity = better fit)
  4. Price      (cheaper = better)
"""
import math


# ── Haversine distance ────────────────────────────────────────────────────
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi   = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Urgency weight per risk level ─────────────────────────────────────────
_URGENCY_WEIGHT = {"CRITICAL": 0.3, "RISKY": 0.6, "SAFE": 1.0}


def rank_storages(
    farmer_lat: float,
    farmer_lon: float,
    required_kg: float,
    risk_level: str,
    storages: list[dict],
    top_n: int = 5,
) -> list[dict]:
    """
    Return `top_n` best-matching storages, each enriched with:
      - distance_km
      - estimated_travel_hours
      - recommendation_score  (lower = better)
      - capacity_match_pct
    """
    urgency = _URGENCY_WEIGHT.get(risk_level, 1.0)
    scored = []

    for store in storages:
        # Skip unavailable / insufficient capacity
        if store.get("status") != "available":
            continue
        avail = float(store.get("available_capacity_kg", 0))
        if avail < required_kg:
            continue

        dist = _haversine_km(farmer_lat, farmer_lon,
                             float(store["lat"]), float(store["lon"]))

        capacity_score  = avail / float(store.get("total_capacity_kg", 1))
        price           = float(store.get("price_per_kg_per_day", 2.0))
        price_score     = 1 / (price + 0.01)

        # Lower composite score → better rank
        composite = (dist * urgency * 0.5) - (capacity_score * 2) - (price_score * 8)

        cap_match_pct = min(100.0, round(avail / required_kg * 100, 1))

        scored.append({
            **store,
            "distance_km":           round(dist, 1),
            "estimated_travel_hours": round(dist / 40, 1),   # assume 40 km/h avg
            "recommendation_score":   round(composite, 3),
            "capacity_match_pct":     cap_match_pct,
        })

    # Sort ascending (lower composite = better)
    scored.sort(key=lambda x: x["recommendation_score"])
    return scored[:top_n]
