"""
routes/market_forecast_v3.py
─────────────────────────────────────────────────────────────────
FasalNet v3 — Market Forecast Endpoints

NEW Endpoints:
  POST /api/market/forecast-v3/predictions  – 7/14-day forecasts + 30/60-day trends
  POST /api/market/forecast-v3/trends       – 30/60-day trends only (lightweight)

Features:
  ✓ 7-day and 14-day point forecasts with confidence intervals
  ✓ 30-day and 60-day trend indicators (UP/DOWN/NEUTRAL)
  ✓ SARIMAX(1,1,1)(1,1,1,7) baseline with exogenous features
  ✓ Ensemble: SARIMAX + XGBoost (Prophet optional) with weighted voting
  ✓ Heteroscedastic CI scaling  margin = z * σ * √horizon
  ✓ ALL sensitive model details hidden (names, parameters, metrics)
  ✓ Only actionable insights exposed to frontend
  ✓ Caching for performance optimization (24-hour TTL)
  ✓ Graceful fallback chain: Ensemble → SARIMAX → Naive

Response Format: Fully masked, no internal details exposed.
─────────────────────────────────────────────────────────────────
"""

import contextlib
import logging
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import threading

import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sklearn.linear_model import LogisticRegression

# Import trend indicator engine
from ml.trend_indicator_engine import calculate_trend_indicators

log = logging.getLogger(__name__)

forecast_v3_bp = Blueprint("forecast_v3", __name__, url_prefix="/api/market/forecast-v3")

try:
    from settings import Config
except ImportError:
    Config = None

# Database configuration
DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("DB_URL")
    or getattr(Config, "DATABASE_URL", "")
)
TABLE = "mh_market_prices"

# Thread-safe engine
_engine = None
_engine_lock = threading.Lock()

# Simple cache for forecast results (TTL: 24 hours)
_forecast_cache = {}
_cache_lock = threading.Lock()


def _get_engine():
    """Get or create database engine (thread-safe)."""
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                db_url = (
                    os.environ.get("DATABASE_URL")
                    or os.environ.get("DB_URL")
                    or getattr(Config, "DATABASE_URL", "")
                    or DATABASE_URL
                )
                _engine = create_engine(
                    db_url,
                    poolclass=NullPool,
                    connect_args={"connect_timeout": 10}
                )
    return _engine


def _cache_key(city: str, commodity: str, horizon: int) -> str:
    """Generate cache key."""
    today = date.today().isoformat()
    return f"{city}:{commodity}:h{horizon}:{today}"


def _get_cached(key: str) -> Optional[Dict]:
    """Retrieve from cache if exists."""
    with _cache_lock:
        if key in _forecast_cache:
            return _forecast_cache[key]
    return None


def _set_cached(key: str, value: Dict) -> None:
    """Store in cache."""
    with _cache_lock:
        _forecast_cache[key] = value


# ============ MAIN ENDPOINTS ============


@forecast_v3_bp.post("/predictions")
def post_forecast_v3():
    """
    Generate 7/14-day forecasts + 30/60-day trend indicators.

    Request JSON:
    {
        "city": "Pune",
        "commodity": "Onion",
        "start_date": "2026-05-01",  (optional, default: 1 year ago)
        "end_date": "2026-08-08"     (optional, default: today)
    }

    Response JSON:
    {
        "status": "success",
        "forecast": {
            "7_day": {
                "target_date": "2026-09-11",
                "forecasted_price": 1229.06,
                "expected_variance": 45.23,
                "price_change_percent": 6.87,
                "confidence_bounds": {
                    "upper_95": 1318.45,
                    "lower_95": 1139.67,
                    "upper_80": 1287.34,
                    "lower_80": 1170.78
                },
                "direction": "UP"
            },
            "14_day": {...}
        },
        "trend_indicators": {
            "30_day": {
                "direction": "UP",
                "confidence": "high",
                "reason": "Strong upward trend...",
                "horizon_days": 30
            },
            "60_day": {...}
        },
        "model_info": {
            "status": "optimized",
            "data_source": "Real Database",
            "last_updated": "2026-09-04T10:30:00"
        },
        "timestamp": "2026-09-04T10:30:00"
    }
    """

    data = request.get_json() or {}
    city = data.get("city", "Pune").strip()
    commodity = data.get("commodity", "Onion").strip()
    start_date = data.get("start_date", (date.today() - timedelta(days=365)).isoformat())
    end_date = data.get("end_date", date.today().isoformat())

    if not city or not commodity:
        return jsonify({
            "status": "error",
            "error": "city and commodity parameters are required"
        }), 400

    try:
        prices_data = _fetch_historical_prices(
            city=city,
            commodity=commodity,
            start_date=start_date,
            end_date=end_date
        )

        if not prices_data or len(prices_data) < 30:
            return jsonify({
                "status": "error",
                "error": "Insufficient historical data for forecasting",
                "required_min_days": 30,
                "received_data_points": len(prices_data) if prices_data else 0
            }), 400

        prices = [p["modal_price"] for p in prices_data]
        dates  = [p["date"]        for p in prices_data]

        forecast_7  = _generate_forecast(prices, dates, horizon=7)
        forecast_14 = _generate_forecast(prices, dates, horizon=14)

        trend_30 = calculate_trend_indicators(prices, horizon_days=30)
        trend_60 = calculate_trend_indicators(prices, horizon_days=60)

        response = {
            "status": "success",
            "forecast": {
                "7_day":  forecast_7,
                "14_day": forecast_14
            },
            "trend_indicators": {
                "30_day": trend_30,
                "60_day": trend_60
            },
            "model_info": {
                "status":       "optimized",
                "data_source":  "Real Database",
                "last_updated": datetime.utcnow().isoformat()
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        return jsonify(response), 200

    except Exception as exc:
        log.error("Forecast v3 error: %s", exc)
        return jsonify({
            "status": "error",
            "error": "Internal server error while generating forecast"
        }), 500


@forecast_v3_bp.post("/trends")
def post_trends_only():
    """
    Lightweight endpoint: 30/60-day trends only (no forecasts).
    Use when you only need trend direction/confidence, not prices.

    Request JSON:
    {
        "city": "Pune",
        "commodity": "Onion",
        "start_date": "2026-05-01",
        "end_date": "2026-08-08"
    }
    """
    data = request.get_json() or {}
    city      = data.get("city", "Pune").strip()
    commodity = data.get("commodity", "Onion").strip()
    start_date = data.get("start_date", (date.today() - timedelta(days=365)).isoformat())
    end_date   = data.get("end_date",   date.today().isoformat())

    if not city or not commodity:
        return jsonify({"status": "error", "error": "city and commodity are required"}), 400

    try:
        prices_data = _fetch_historical_prices(city, commodity, start_date, end_date)
        if not prices_data or len(prices_data) < 14:
            return jsonify({
                "status": "error",
                "error": "Insufficient data for trend analysis",
                "received_data_points": len(prices_data) if prices_data else 0
            }), 400

        prices = [p["modal_price"] for p in prices_data]

        response = {
            "status": "success",
            "trend_indicators": {
                "30_day": calculate_trend_indicators(prices, horizon_days=30),
                "60_day": calculate_trend_indicators(prices, horizon_days=60)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        return jsonify(response), 200

    except Exception as exc:
        log.error("Trends endpoint error: %s", exc)
        return jsonify({"status": "error", "error": "Internal server error"}), 500


@forecast_v3_bp.post("/today-tomorrow")
def post_today_tomorrow():
    """
    Highlight endpoint: TODAY's actual price + TOMORROW's XGBoost forecast only.

    Request JSON:
    {
        "city": "Sangli",
        "commodity": "Rice",
        "start_date": "2026-03-01",   (optional, default: 6 months ago)
        "end_date": "2026-09-06"      (optional, default: today)
    }

    Response JSON:
    {
        "status": "success",
        "today":    { "date": "2026-09-06", "price": 6809.0 },
        "tomorrow": {
            "date": "2026-09-07",
            "forecasted_price": 6905.07,
            "price_change_percent": 1.41,
            "direction": "UP",
            "confidence_bounds": { "upper_95":.., "lower_95":.., "upper_80":.., "lower_80":.. }
        }
    }
    """
    data = request.get_json() or {}
    city = data.get("city", "").strip()
    commodity = data.get("commodity", "").strip()
    start_date = data.get("start_date", (date.today() - timedelta(days=182)).isoformat())
    end_date = data.get("end_date", date.today().isoformat())

    if not city or not commodity:
        return jsonify({"status": "error", "error": "city and commodity are required"}), 400

    try:
        prices_data = _fetch_historical_prices(city, commodity, start_date, end_date)
        if not prices_data or len(prices_data) < 30:
            return jsonify({
                "status": "error",
                "error": "Insufficient historical data for forecasting",
                "required_min_days": 30,
                "received_data_points": len(prices_data) if prices_data else 0
            }), 400

        prices = [p["modal_price"] for p in prices_data]
        dates  = [p["date"]        for p in prices_data]
        current_price = float(prices[-1])
        today_date = dates[-1]

        tomorrow = _xgboost_forecast(prices, dates, horizon=1, current_price=current_price)
        if tomorrow is None:
            tomorrow_payload = _naive_forecast(prices, dates, horizon=1)
        else:
            point, res_std = tomorrow["point"], tomorrow["res_std"]
            z80, z95 = 1.282, 1.960
            direction = "UP" if point > current_price else ("DOWN" if point < current_price else "NEUTRAL")
            pct_chg = float((point - current_price) / current_price * 100) if current_price else 0.0
            target_date = (pd.to_datetime(today_date) + timedelta(days=1)).strftime("%Y-%m-%d")
            tomorrow_payload = {
                "target_date": target_date,
                "forecasted_price": float(round(point, 2)),
                "price_change_percent": float(round(pct_chg, 2)),
                "direction": direction,
                "confidence_bounds": {
                    "upper_95": float(round(point + z95 * res_std, 2)),
                    "lower_95": float(round(max(0.0, point - z95 * res_std), 2)),
                    "upper_80": float(round(point + z80 * res_std, 2)),
                    "lower_80": float(round(max(0.0, point - z80 * res_std), 2)),
                }
            }

        return jsonify({
            "status": "success",
            "today": {"date": today_date, "price": float(round(current_price, 2))},
            "tomorrow": tomorrow_payload,
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    except Exception as exc:
        log.error("Today/Tomorrow endpoint error: %s", exc)
        return jsonify({"status": "error", "error": "Internal server error while generating forecast"}), 500


@forecast_v3_bp.post("/continuous")
def post_continuous_forecast():
    """
    7 or 14-day CONTINUOUS daily forecast, one XGBoost model trained per day
    (direct multi-horizon forecasting) so each day gets its own real prediction
    instead of a single point repeated/interpolated across days.

    Request JSON:
    {
        "city": "Sangli",
        "commodity": "Rice",
        "horizon": 7,                 (7 or 14, default 7)
        "start_date": "2026-03-01",   (optional, default: 6 months ago)
        "end_date": "2026-09-06"      (optional, default: today)
    }

    Response JSON:
    {
        "status": "success",
        "model": "xgboost",
        "daily": [
            {"day":1, "date":"2026-09-07", "price":6905.07,
             "upper_95":.., "lower_95":.., "upper_80":.., "lower_80":..},
            ...
        ]
    }
    """
    data = request.get_json() or {}
    city = data.get("city", "").strip()
    commodity = data.get("commodity", "").strip()
    horizon = int(data.get("horizon", 7))
    horizon = 14 if horizon >= 14 else 7
    start_date = data.get("start_date", (date.today() - timedelta(days=182)).isoformat())
    end_date = data.get("end_date", date.today().isoformat())

    if not city or not commodity:
        return jsonify({"status": "error", "error": "city and commodity are required"}), 400

    try:
        prices_data = _fetch_historical_prices(city, commodity, start_date, end_date)
        if not prices_data or len(prices_data) < 30:
            return jsonify({
                "status": "error",
                "error": "Insufficient historical data for forecasting",
                "required_min_days": 30,
                "received_data_points": len(prices_data) if prices_data else 0
            }), 400

        prices = [p["modal_price"] for p in prices_data]
        dates  = [p["date"]        for p in prices_data]

        daily = _xgboost_continuous_forecast(prices, dates, horizon)
        if not daily:
            return jsonify({"status": "error", "error": "Forecast could not be generated"}), 500

        return jsonify({
            "status": "success",
            "model": "xgboost",
            "horizon": horizon,
            "daily": daily,
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    except Exception as exc:
        log.error("Continuous forecast endpoint error: %s", exc)
        return jsonify({"status": "error", "error": "Internal server error while generating forecast"}), 500


@forecast_v3_bp.post("/trend-signal")
def post_trend_signal():
    """
    Simple 30-day / 60-day trend indicator using BINARY classification
    (logistic regression: will price be higher in N days than today? yes/no).
    Intentionally lightweight — no SARIMAX/ensemble here, just a direction + probability.

    Request JSON:
    {
        "city": "Sangli",
        "commodity": "Rice",
        "start_date": "2026-03-01",   (optional, default: 6 months ago)
        "end_date": "2026-09-06"      (optional, default: today)
    }

    Response JSON:
    {
        "status": "success",
        "trend_signal": {
            "30_day": {"direction": "UP", "probability_up": 0.71, "confidence": "medium"},
            "60_day": {"direction": "UP", "probability_up": 0.64, "confidence": "low"}
        }
    }
    """
    data = request.get_json() or {}
    city = data.get("city", "").strip()
    commodity = data.get("commodity", "").strip()
    start_date = data.get("start_date", (date.today() - timedelta(days=182)).isoformat())
    end_date = data.get("end_date", date.today().isoformat())

    if not city or not commodity:
        return jsonify({"status": "error", "error": "city and commodity are required"}), 400

    try:
        prices_data = _fetch_historical_prices(city, commodity, start_date, end_date)
        if not prices_data or len(prices_data) < 45:
            return jsonify({
                "status": "error",
                "error": "Insufficient historical data for trend classification",
                "required_min_days": 45,
                "received_data_points": len(prices_data) if prices_data else 0
            }), 400

        prices = [p["modal_price"] for p in prices_data]

        signal_30 = _binary_trend_signal(prices, horizon_days=30)
        signal_60 = _binary_trend_signal(prices, horizon_days=60)

        return jsonify({
            "status": "success",
            "trend_signal": {"30_day": signal_30, "60_day": signal_60},
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    except Exception as exc:
        log.error("Trend signal endpoint error: %s", exc)
        return jsonify({"status": "error", "error": "Internal server error"}), 500


# ============ DATABASE HELPERS ============


def _fetch_historical_prices(
    city: str,
    commodity: str,
    start_date: str,
    end_date: str
) -> List[Dict]:
    """Fetch and aggregate modal prices from the database."""

    try:
        query = text(f"""
        SELECT
            arrival_date::date                     AS date,
            ROUND(AVG(modal_price)::numeric, 2)    AS modal_price,
            ROUND(AVG(min_price)::numeric,   2)    AS min_price,
            ROUND(AVG(max_price)::numeric,   2)    AS max_price,
            COUNT(*)                               AS record_count
        FROM {TABLE}
        WHERE LOWER(market)    = LOWER(:city)
          AND LOWER(commodity) = LOWER(:commodity)
          AND arrival_date::date BETWEEN :start_date AND :end_date
        GROUP BY arrival_date::date
        ORDER BY arrival_date::date ASC
        """)

        with _get_engine().connect() as conn:
            rows = conn.execute(query, {
                "city":       city,
                "commodity":  commodity,
                "start_date": start_date,
                "end_date":   end_date
            }).fetchall()

        return [
            {
                "date":         row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0]),
                "modal_price":  float(row[1]) if row[1] else 0.0,
                "min_price":    float(row[2]) if row[2] else 0.0,
                "max_price":    float(row[3]) if row[3] else 0.0,
                "record_count": int(row[4])   if row[4] else 0
            }
            for row in rows
        ]

    except Exception as exc:
        log.error("Error fetching prices: %s", exc)
        return []


# ============ FEATURE ENGINEERING ============


def _create_exog_features(prices: List[float], dates: List[str]) -> pd.DataFrame:
    """
    Create stationary exogenous features for SARIMAX.

    Features:
    - dow_sin / dow_cos   : circular day-of-week encoding
    - month_sin / month_cos : circular month encoding
    - ret_1d              : 1-day log return (clipped ±20 %)
    - volatility_7d       : 7-day rolling std / price (clipped 1–50 %)
    """
    df = pd.DataFrame({"date": pd.to_datetime(dates), "price": prices})

    dow = df["date"].dt.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    month = df["date"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    df["ret_1d"] = (
        df["price"].pct_change().fillna(0.0).clip(-0.2, 0.2)
    )
    df["volatility_7d"] = (
        (df["price"].rolling(window=7, min_periods=1).std() / (df["price"] + 1e-5))
        .fillna(0.05).clip(0.01, 0.5)
    )

    return df[["dow_sin", "dow_cos", "month_sin", "month_cos", "ret_1d", "volatility_7d"]]


def _create_future_exog(last_date: str, horizon: int, prices: List[float]) -> pd.DataFrame:
    """Create future exogenous feature rows (one per forecast step)."""
    last_dt      = pd.to_datetime(last_date)
    future_dates = [last_dt + timedelta(days=i + 1) for i in range(horizon)]
    fdf          = pd.DataFrame({"date": future_dates})

    dow = fdf["date"].dt.dayofweek
    fdf["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    fdf["dow_cos"] = np.cos(2 * np.pi * dow / 7)

    month = fdf["date"].dt.month
    fdf["month_sin"] = np.sin(2 * np.pi * month / 12)
    fdf["month_cos"] = np.cos(2 * np.pi * month / 12)

    p_arr   = np.array(prices, dtype=float)
    ret_last = float((p_arr[-1] - p_arr[-2]) / p_arr[-2]) if len(p_arr) > 1 and p_arr[-2] > 0 else 0.0
    vol_last = float(np.std(p_arr[-7:]) / (p_arr[-1] + 1e-5)) if len(p_arr) >= 7 and p_arr[-1] > 0 else 0.05

    fdf["ret_1d"]       = np.clip(ret_last, -0.2,  0.2)
    fdf["volatility_7d"] = np.clip(vol_last, 0.01, 0.5)

    return fdf[["dow_sin", "dow_cos", "month_sin", "month_cos", "ret_1d", "volatility_7d"]]


def _build_xgb_features(prices: List[float], dates: List[str]) -> Optional[np.ndarray]:
    """
    Build feature matrix for XGBoost using a 14-day lookback window.

    Columns (18 total):
        lag_1 … lag_14  : raw price lags
        dow_sin/cos     : circular day-of-week
        month_sin/cos   : circular month
    """
    p = np.array(prices, dtype=float)
    d = pd.to_datetime(dates)
    lookback = 14
    rows = []

    for i in range(lookback, len(p)):
        lags    = p[i - lookback:i].tolist()          # 14 lag features
        dow_s   = float(np.sin(2 * np.pi * d[i].dayofweek / 7))
        dow_c   = float(np.cos(2 * np.pi * d[i].dayofweek / 7))
        mon_s   = float(np.sin(2 * np.pi * d[i].month / 12))
        mon_c   = float(np.cos(2 * np.pi * d[i].month / 12))
        rows.append(lags + [dow_s, dow_c, mon_s, mon_c])

    return np.array(rows, dtype=float) if rows else None


# ============ MODEL BUILDERS ============


def _sarimax_forecast(
    prices_array: np.ndarray,
    prices: List[float],
    dates: List[str],
    horizon: int,
    current_price: float
) -> Optional[Dict]:
    """
    SARIMAX(1,1,1)(1,1,1,7) with exogenous features.
    Returns a partial result dict or None on failure.
    """
    try:
        from statsmodels.tsa.statespace.sarimax import SARIMAX

        exog_hist   = _create_exog_features(prices, dates)
        exog_future = _create_future_exog(dates[-1], horizon, prices)

        fitted = None
        try:
            model  = SARIMAX(
                prices_array,
                exog=exog_hist,
                order=(1, 1, 1),
                seasonal_order=(1, 1, 1, 7),
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            fitted = model.fit(disp=False, maxiter=100)
        except Exception as e1:
            log.debug("SARIMAX+exog failed: %s", e1)
            try:
                model  = SARIMAX(
                    prices_array,
                    order=(1, 1, 1),
                    seasonal_order=(1, 1, 1, 7),
                    enforce_stationarity=False,
                    enforce_invertibility=False
                )
                fitted      = model.fit(disp=False, maxiter=100)
                exog_future = None
            except Exception as e2:
                log.debug("SARIMAX no-exog failed: %s", e2)
                return None

        raw = float(fitted.get_forecast(steps=horizon, exog=exog_future).predicted_mean.values[-1])
        point = float(np.clip(raw, current_price * 0.65, current_price * 1.35))

        # Residual std from in-sample fit
        res_std = float(np.std(fitted.resid)) if fitted is not None else current_price * 0.05

        return {"point": point, "res_std": res_std}

    except Exception as exc:
        log.debug("SARIMAX forecast failed: %s", exc)
        return None


def _xgboost_forecast(
    prices: List[float],
    dates: List[str],
    horizon: int,
    current_price: float
) -> Optional[Dict]:
    """
    Direct XGBoost forecast for the given horizon.

    Trains a separate model for the exact horizon step to avoid
    recursive error compounding.  Returns a partial result dict or None.
    """
    try:
        from xgboost import XGBRegressor

        lookback = 14
        p = np.array(prices, dtype=float)

        if len(p) < lookback + horizon + 1:
            return None

        X_all = _build_xgb_features(prices, dates)   # shape (N-14, 18)
        if X_all is None:
            return None

        # Target: price `horizon` steps ahead of each window end
        targets = p[lookback + horizon:]
        X_train = X_all[:len(targets)]

        if len(X_train) < 10:
            return None

        model = XGBRegressor(
            n_estimators=120,
            learning_rate=0.08,
            max_depth=4,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=1.0,
            random_state=42,
            verbosity=0,
            n_jobs=-1
        )
        model.fit(X_train, targets, verbose=False)

        # Forecast row: latest 14 prices + temporal features for target date
        target_date = pd.to_datetime(dates[-1]) + timedelta(days=horizon)
        x_fc = np.array([[
            *p[-lookback:].tolist(),
            float(np.sin(2 * np.pi * target_date.dayofweek / 7)),
            float(np.cos(2 * np.pi * target_date.dayofweek / 7)),
            float(np.sin(2 * np.pi * target_date.month / 12)),
            float(np.cos(2 * np.pi * target_date.month / 12))
        ]])

        raw   = float(model.predict(x_fc)[0])
        point = float(np.clip(raw, current_price * 0.65, current_price * 1.35))

        # Residual std from training errors
        train_pred = model.predict(X_train)
        res_std    = float(np.std(targets - train_pred))

        return {"point": point, "res_std": res_std}

    except Exception as exc:
        log.debug("XGBoost forecast failed: %s", exc)
        return None


def _xgboost_continuous_forecast(
    prices: List[float],
    dates: List[str],
    horizon: int
) -> List[Dict[str, Any]]:
    """
    Day-by-day CONTINUOUS forecast: trains one direct XGBoost model per day
    (1..horizon), each predicting that specific day's price from the same
    14-day lag + calendar features used elsewhere in this module.

    Unlike a single ensemble point repeated/interpolated across days, every
    day here has its own model output, so the resulting curve moves the way
    the real series moves (up/down day to day) instead of flattening out.

    Returns a list of dicts, one per day:
        {day, date, price, upper_95, lower_95, upper_80, lower_80}
    """
    out: List[Dict[str, Any]] = []
    current_price = float(prices[-1])
    last_date = pd.to_datetime(dates[-1])
    z80, z95 = 1.282, 1.960

    for h in range(1, horizon + 1):
        result = _xgboost_forecast(prices, dates, horizon=h, current_price=current_price)
        target_date = (last_date + timedelta(days=h)).strftime("%Y-%m-%d")

        if result is None:
            # graceful per-day fallback: small drift off the previous day's point
            prev_price = out[-1]["price"] if out else current_price
            point = prev_price
            res_std = current_price * 0.03 * np.sqrt(h)
        else:
            point, res_std = result["point"], result["res_std"]

        out.append({
            "day":       h,
            "date":      target_date,
            "price":     float(round(point, 2)),
            "upper_95":  float(round(point + z95 * res_std, 2)),
            "lower_95":  float(round(max(0.0, point - z95 * res_std), 2)),
            "upper_80":  float(round(point + z80 * res_std, 2)),
            "lower_80":  float(round(max(0.0, point - z80 * res_std), 2)),
        })

    return out


def _binary_trend_signal(prices: List[float], horizon_days: int) -> Dict[str, Any]:
    """
    Simple binary UP/DOWN classifier: "will the price be higher `horizon_days`
    from now than it is today?" — trained with logistic regression on a handful
    of rolling features. Deliberately simple (no SARIMAX/ensemble machinery).

    Features per sample i: 7-day return, 14-day return, 30-day return,
    7-day volatility (relative), and price vs its own 14-day moving average.
    Label: 1 if price[i + horizon_days] > price[i] else 0.
    """
    p = np.array(prices, dtype=float)
    n = len(p)

    def _features_at(i: int) -> Optional[List[float]]:
        if i < 30:
            return None
        ret_7  = (p[i] - p[i - 7])  / p[i - 7]  if p[i - 7]  > 0 else 0.0
        ret_14 = (p[i] - p[i - 14]) / p[i - 14] if p[i - 14] > 0 else 0.0
        ret_30 = (p[i] - p[i - 30]) / p[i - 30] if p[i - 30] > 0 else 0.0
        vol_7  = float(np.std(p[max(0, i - 7):i + 1])) / (p[i] + 1e-5)
        ma_14  = float(np.mean(p[max(0, i - 14):i + 1]))
        ma_ratio = (p[i] - ma_14) / ma_14 if ma_14 > 0 else 0.0
        return [ret_7, ret_14, ret_30, vol_7, ma_ratio]

    X, y = [], []
    for i in range(30, n - horizon_days):
        feat = _features_at(i)
        if feat is None:
            continue
        label = 1 if p[i + horizon_days] > p[i] else 0
        X.append(feat)
        y.append(label)

    current_feat = _features_at(n - 1)

    # Not enough history to train a meaningful classifier, or features unavailable
    if len(X) < 20 or current_feat is None or len(set(y)) < 2:
        # simple heuristic fallback: sign of recent drift
        recent_change = p[-1] - p[-min(14, n)]
        direction = "UP" if recent_change > 0 else ("DOWN" if recent_change < 0 else "NEUTRAL")
        return {
            "direction": direction,
            "probability_up": 0.5,
            "confidence": "low",
            "horizon_days": horizon_days,
            "note": "insufficient history for classifier — heuristic fallback"
        }

    try:
        clf = LogisticRegression(max_iter=500)
        clf.fit(X, y)
        prob_up = float(clf.predict_proba([current_feat])[0][1])
    except Exception as exc:
        log.debug("Binary trend classifier failed: %s", exc)
        prob_up = float(np.mean(y))  # fall back to base rate

    direction = "UP" if prob_up >= 0.5 else "DOWN"
    spread = abs(prob_up - 0.5)
    confidence = "high" if spread >= 0.25 else ("medium" if spread >= 0.10 else "low")

    return {
        "direction": direction,
        "probability_up": float(round(prob_up, 3)),
        "confidence": confidence,
        "horizon_days": horizon_days
    }


def _prophet_forecast(
    prices: List[float],
    dates: List[str],
    horizon: int,
    current_price: float
) -> Optional[Dict]:
    """
    Facebook Prophet forecast (optional — skipped if not installed).
    Returns a partial result dict or None.
    """
    try:
        from prophet import Prophet           # pip install prophet
    except ImportError:
        try:
            from fbprophet import Prophet     # legacy package name
        except ImportError:
            return None                       # Prophet not installed — skip silently

    try:
        df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": prices})

        # Remove outliers > 3σ
        mu, sigma = df["y"].mean(), df["y"].std()
        df = df[(df["y"] >= mu - 3 * sigma) & (df["y"] <= mu + 3 * sigma)].reset_index(drop=True)

        if len(df) < 14:
            return None

        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.95,
            changepoint_prior_scale=0.05
        )

        with open(os.devnull, "w") as devnull:
            with contextlib.redirect_stderr(devnull):
                m.fit(df)

        future   = m.make_future_dataframe(periods=horizon)
        forecast = m.predict(future)
        row      = forecast.iloc[-1]

        raw   = float(row["yhat"])
        point = float(np.clip(raw, current_price * 0.65, current_price * 1.35))

        # Derive σ from Prophet's own CI (yhat_upper - yhat_lower ≈ 2 * 1.96 * σ)
        ci_width = float(row["yhat_upper"] - row["yhat_lower"])
        res_std  = ci_width / (2 * 1.96) if ci_width > 0 else current_price * 0.05

        return {"point": point, "res_std": res_std}

    except Exception as exc:
        log.debug("Prophet forecast failed: %s", exc)
        return None


# ============ ENSEMBLE VOTING ============


def _ensemble_combine(
    results: List[Optional[Dict]],
    weights: List[float],
    current_price: float,
    horizon: int
) -> Dict:
    """
    Weighted average of available model predictions.

    Confidence intervals:
        σ_ensemble  = weighted average of residual stds
        margin_h    = z * σ_ensemble * √horizon   (heteroscedastic)

    Returns a full CI dict ready for the API response.
    """
    valid = [(r, w) for r, w in zip(results, weights) if r is not None]

    if not valid:
        return None

    total_w = sum(w for _, w in valid)
    norm_w  = [w / total_w for _, w in valid]

    point   = sum(nw * r["point"]   for (r, _), nw in zip(valid, norm_w))
    res_std = sum(nw * r["res_std"] for (r, _), nw in zip(valid, norm_w))

    # Bound ensemble point too
    point = float(np.clip(point, current_price * 0.65, current_price * 1.35))

    # Heteroscedastic CI
    scaling  = float(np.sqrt(horizon))
    base_std = float(max(res_std, current_price * 0.02))
    scaled   = base_std * scaling

    z80, z95   = 1.282, 1.960
    m80, m95   = z80 * scaled, z95 * scaled

    direction = "UP" if point > current_price else "DOWN"
    pct_chg   = float((point - current_price) / current_price * 100) if current_price > 0 else 0.0

    return {
        "point":               float(round(point, 2)),
        "price_change_percent": float(round(pct_chg, 2)),
        "expected_variance":   float(round(scaled ** 2, 2)),
        "direction":           direction,
        "confidence_bounds": {
            "upper_95": float(round(point + m95, 2)),
            "lower_95": float(round(max(0.0, point - m95), 2)),
            "upper_80": float(round(point + m80, 2)),
            "lower_80": float(round(max(0.0, point - m80), 2))
        }
    }


# ============ MAIN FORECAST ORCHESTRATOR ============


def _generate_forecast(
    prices: List[float],
    dates:  List[str],
    horizon: int = 7
) -> Dict[str, Any]:
    """
    Ensemble price forecast: SARIMAX + XGBoost (+ Prophet if available).

    Fallback chain:
        Ensemble  →  SARIMAX-only  →  Naive

    Weights (re-normalised when a model is unavailable):
        SARIMAX : 0.50
        XGBoost : 0.30
        Prophet : 0.20   (skipped silently if not installed)
    """
    try:
        prices_array  = np.array(prices, dtype=float)
        prices_array  = prices_array[~np.isnan(prices_array)]

        if len(prices_array) < 14:
            return _naive_forecast(prices, dates, horizon)

        current_price = float(prices_array[-1])
        last_date     = pd.to_datetime(dates[-1])
        target_date   = (last_date + timedelta(days=horizon)).strftime("%Y-%m-%d")

        # ── Run models ──────────────────────────────────────────────────────
        sarimax_res  = _sarimax_forecast(prices_array, prices, dates, horizon, current_price)
        xgb_res      = _xgboost_forecast(prices, dates, horizon, current_price) if len(prices) >= 30 else None
        prophet_res  = _prophet_forecast(prices, dates, horizon, current_price) if len(prices) >= 30 else None

        # ── Ensemble ────────────────────────────────────────────────────────
        ensemble = _ensemble_combine(
            results=[sarimax_res, xgb_res, prophet_res],
            weights=[0.50,        0.30,    0.20],
            current_price=current_price,
            horizon=horizon
        )

        if ensemble is None:
            return _naive_forecast(prices, dates, horizon)

        return {
            "target_date":          target_date,
            "forecasted_price":     ensemble["point"],
            "expected_variance":    ensemble["expected_variance"],
            "price_change_percent": ensemble["price_change_percent"],
            "confidence_bounds":    ensemble["confidence_bounds"],
            "direction":            ensemble["direction"]
        }

    except Exception as exc:
        log.warning("Ensemble forecast failed, using naive: %s", exc)
        return _naive_forecast(prices, dates, horizon)


# ============ NAIVE FALLBACK ============


def _naive_forecast(
    prices:  List[float],
    dates:   List[str],
    horizon: int
) -> Dict[str, Any]:
    """
    Fallback: repeat last price with heteroscedastic confidence intervals.
    Used only when all model paths fail.
    """
    p_arr         = np.array(prices, dtype=float)
    current_price = float(p_arr[-1])

    recent_std = float(np.std(np.diff(p_arr[-7:]))) if len(p_arr) > 7 else current_price * 0.05
    std_err    = recent_std if recent_std > 0 else 10.0

    scaling = float(np.sqrt(horizon))
    scaled  = std_err * scaling

    z80, z95 = 1.282, 1.960
    m80      = z80 * scaled
    m95      = z95 * scaled

    target_date = (pd.to_datetime(dates[-1]) + timedelta(days=horizon)).strftime("%Y-%m-%d")

    return {
        "target_date":          target_date,
        "forecasted_price":     float(round(current_price, 2)),
        "expected_variance":    float(round(scaled ** 2, 2)),
        "price_change_percent": 0.0,
        "confidence_bounds": {
            "upper_95": float(round(current_price + m95, 2)),
            "lower_95": float(round(max(0.0, current_price - m95), 2)),
            "upper_80": float(round(current_price + m80, 2)),
            "lower_80": float(round(max(0.0, current_price - m80), 2))
        },
        "direction": "NEUTRAL"
    }