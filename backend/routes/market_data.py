"""
routes/market_data.py  — FasalNet Market Intelligence (v12)
ARIMA forecast endpoint added; min/max prices in trend; cities in sync-status.
"""

import logging
import os
import re
import threading
import warnings
from datetime import date, timedelta, datetime

import numpy as np
import pandas as pd
from flask import Blueprint, jsonify, request
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

warnings.filterwarnings("ignore")
log = logging.getLogger(__name__)

try:
    from settings import Config
except ImportError:
    Config = None

market_bp = Blueprint("market", __name__, url_prefix="/api/market")

DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("DB_URL")
    or getattr(Config, "DATABASE_URL", "")
    or "postgresql://neondb_owner:npg_hNsGgVLf62uB@ep-gentle-feather-anbhl1fl-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)
TABLE = "mh_market_prices"

_engine = None
_engine_lock = threading.Lock()


def get_engine():
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = create_engine(
                    DATABASE_URL, poolclass=NullPool,
                    connect_args={"connect_timeout": 10},
                )
    return _engine


def rows_to_list(rows) -> list[dict]:
    cols = list(rows.keys())
    result = []
    for row in rows:
        d = dict(zip(cols, row))
        for k, v in d.items():
            if hasattr(v, "isoformat"):
                d[k] = v.isoformat()
            elif hasattr(v, "__float__") and not isinstance(v, (int, bool)):
                d[k] = float(v)
        result.append(d)
    return result


_sync_state = {"last_sync": None, "last_inserted": 0, "in_progress": False}


@market_bp.get("/cities")
def get_cities():
    try:
        with get_engine().connect() as conn:
            rows = conn.execute(
                text(f"SELECT DISTINCT market FROM {TABLE} ORDER BY market")
            ).fetchall()
        return jsonify([r[0] for r in rows if r[0]])
    except Exception as exc:
        log.error("market/cities error: %s", exc)
        return jsonify([]), 200


@market_bp.get("/commodities")
def get_commodities():
    city = request.args.get("city", "")
    try:
        q = f"SELECT DISTINCT commodity FROM {TABLE}"
        params: dict = {}
        if city:
            q += " WHERE LOWER(market) = LOWER(:city)"
            params["city"] = city
        q += " ORDER BY commodity"
        with get_engine().connect() as conn:
            rows = conn.execute(text(q), params).fetchall()
        return jsonify([r[0] for r in rows if r[0]])
    except Exception as exc:
        log.error("market/commodities error: %s", exc)
        return jsonify([]), 200


@market_bp.get("/summary")
def get_summary():
    cities_raw = request.args.get("cities", "")
    cities     = [c.strip() for c in cities_raw.split(",") if c.strip()]
    if not cities:
        return jsonify({"error": "cities param required"}), 400
    commodity = request.args.get("commodity", "")
    start = request.args.get("start", (date.today() - timedelta(days=30)).isoformat())
    end   = request.args.get("end",   date.today().isoformat())
    params: dict = {f"city{i}": c for i, c in enumerate(cities)}
    params.update({"start": start, "end": end})
    city_where = " OR ".join(f"LOWER(market) = LOWER(:city{i})" for i in range(len(cities)))
    where = f"({city_where}) AND arrival_date BETWEEN :start AND :end"
    if commodity:
        where += " AND LOWER(commodity) = LOWER(:commodity)"
        params["commodity"] = commodity
    q = text(f"""
        SELECT arrival_date::date AS date, market, commodity,
               ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
               ROUND(AVG(min_price)::numeric,2)   AS avg_min,
               ROUND(AVG(max_price)::numeric,2)   AS avg_max,
               COUNT(*)                           AS record_count
        FROM {TABLE} WHERE {where}
        GROUP BY date, market, commodity ORDER BY date ASC, market, commodity
    """)
    try:
        with get_engine().connect() as conn:
            data = rows_to_list(conn.execute(q, params))
        return jsonify({"count": len(data), "data": data})
    except Exception as exc:
        log.error("market/summary error: %s", exc)
        return jsonify({"error": str(exc)}), 500


@market_bp.get("/trend")
def get_trend():
    cities_raw = request.args.get("cities", "")
    cities     = [c.strip() for c in cities_raw.split(",") if c.strip()]
    if not cities:
        return jsonify({"error": "cities param required"}), 400
    commodity = request.args.get("commodity", "")
    start = request.args.get("start", (date.today() - timedelta(days=90)).isoformat())
    end   = request.args.get("end",   date.today().isoformat())
    params: dict = {f"city{i}": c for i, c in enumerate(cities)}
    params.update({"start": start, "end": end})
    city_where = " OR ".join(f"LOWER(market) = LOWER(:city{i})" for i in range(len(cities)))
    where = f"({city_where}) AND arrival_date BETWEEN :start AND :end"
    if commodity:
        where += " AND LOWER(commodity) = LOWER(:commodity)"
        params["commodity"] = commodity
    q = text(f"""
        SELECT arrival_date::date AS date, market,
               ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
               ROUND(AVG(min_price)::numeric,2)   AS avg_min,
               ROUND(AVG(max_price)::numeric,2)   AS avg_max
        FROM {TABLE} WHERE {where}
        GROUP BY date, market ORDER BY date ASC, market
    """)
    try:
        with get_engine().connect() as conn:
            rows = rows_to_list(conn.execute(q, params))
        series: dict = {}
        for row in rows:
            mkt = row["market"]
            if mkt not in series:
                series[mkt] = []
            series[mkt].append({
                "date":      row["date"],
                "price":     float(row["avg_modal"])  if row["avg_modal"]  is not None else None,
                "min_price": float(row["avg_min"])    if row["avg_min"]    is not None else None,
                "max_price": float(row["avg_max"])    if row["avg_max"]    is not None else None,
            })
        return jsonify({"commodity": commodity, "series": series, "cities": list(series.keys())})
    except Exception as exc:
        log.error("market/trend error: %s", exc)
        return jsonify({"error": str(exc)}), 500


# ─── ARIMA Forecast ──────────────────────────────────────────────────────────
@market_bp.route("/xgboost-forecast", methods=["GET", "POST"])
def xgboost_forecast():
    """
    GET or POST /api/market/xgboost-forecast?city=Sangli&commodity=Onion&days=7
    Returns XGBoost weather-enriched price forecast for 7 or 14 days.
    """
    from services.xgboost_forecast_service import generate_xgboost_weather_forecast

    if request.method == "POST":
        data = request.get_json() or {}
        city = data.get("city", "").strip()
        commodity = data.get("commodity", "").strip()
        days = int(data.get("days", data.get("horizon", 7)))
    else:
        city = request.args.get("city", "").strip()
        commodity = request.args.get("commodity", "").strip()
        days_raw = request.args.get("days", request.args.get("horizon", 7))
        try:
            days = int(days_raw)
        except (ValueError, TypeError):
            days = 7

    if not city or not commodity:
        return jsonify({"status": "error", "error": "city and commodity params are required"}), 400

    horizon = 14 if days >= 14 else 7
    result = generate_xgboost_weather_forecast(city, commodity, horizon)
    if result.get("status") == "error":
        return jsonify(result), 422
    return jsonify(result), 200


@market_bp.get("/arima-forecast")
def arima_forecast():
    """Backwards compatibility alias forwarding to XGBoost Weather forecast."""
    return xgboost_forecast()


def _arima_predict(series: np.ndarray, steps: int) -> np.ndarray:
    """Fit optimal ARIMA model using AIC selection, fallback to EWM trend drift."""
    clean_series = series[~np.isnan(series)]
    if len(clean_series) < 3:
        base = float(clean_series[-1]) if len(clean_series) else 1000.0
        return np.full(steps, base, dtype=float)

    # Use the most relevant recent 60 points for high-speed, accurate fitting
    fit_data = clean_series[-60:]
    best_model_fit = None
    best_aic = float("inf")

    try:
        from statsmodels.tsa.arima.model import ARIMA  # type: ignore
        for order in [(1, 1, 1), (1, 1, 0), (0, 1, 1), (2, 1, 1)]:
            try:
                model = ARIMA(fit_data, order=order, enforce_stationarity=False, enforce_invertibility=False)
                fit = model.fit(method_kwargs={"maxiter": 30, "disp": False})
                if fit.aic < best_aic:
                    best_aic = fit.aic
                    best_model_fit = fit
            except Exception:
                continue

        if best_model_fit is not None:
            fc = best_model_fit.forecast(steps=steps)
            return np.clip(np.array(fc, dtype=float), 0, None)
    except (ImportError, Exception):
        pass

    # Robust exponential-smoothing / linear trend drift fallback
    recent = fit_data[-min(14, len(fit_data)):]
    trend = float(np.diff(recent).mean()) if len(recent) > 1 else 0.0
    base = float(clean_series[-1])
    return np.array([max(0.0, base + trend * (i + 1)) for i in range(steps)], dtype=float)


@market_bp.get("/heatmap")
def get_heatmap():
    city  = request.args.get("city", "")
    start = request.args.get("start", (date.today() - timedelta(days=30)).isoformat())
    end   = request.args.get("end",   date.today().isoformat())
    if not city:
        return jsonify({"error": "city param required"}), 400
    q = text(f"""
        SELECT arrival_date::date AS date, commodity,
               ROUND(AVG(modal_price)::numeric,2) AS avg_modal
        FROM {TABLE}
        WHERE LOWER(market) = LOWER(:city) AND arrival_date BETWEEN :start AND :end
        GROUP BY date, commodity ORDER BY date ASC, commodity
    """)
    try:
        with get_engine().connect() as conn:
            rows = rows_to_list(conn.execute(q, {"city": city, "start": start, "end": end}))
        dates       = sorted({r["date"] for r in rows})
        commodities = sorted({r["commodity"] for r in rows})
        matrix: dict = {c: {} for c in commodities}
        for row in rows:
            matrix[row["commodity"]][row["date"]] = float(row["avg_modal"] or 0)
        return jsonify({"city": city, "dates": dates, "commodities": commodities, "matrix": matrix})
    except Exception as exc:
        log.error("market/heatmap error: %s", exc)
        return jsonify({"error": str(exc)}), 500


@market_bp.get("/compare")
def get_compare():
    cities_raw = request.args.get("cities", "")
    cities     = [c.strip() for c in cities_raw.split(",") if c.strip()]
    commodity  = request.args.get("commodity", "")
    start = request.args.get("start", (date.today() - timedelta(days=30)).isoformat())
    end   = request.args.get("end",   date.today().isoformat())
    if not cities:
        return jsonify({"error": "cities required"}), 400
    params: dict = {f"city{i}": c for i, c in enumerate(cities)}
    params.update({"start": start, "end": end})
    city_where = " OR ".join(f"LOWER(market) = LOWER(:city{i})" for i in range(len(cities)))
    where = f"({city_where}) AND arrival_date BETWEEN :start AND :end"
    if commodity:
        where += " AND LOWER(commodity) = LOWER(:commodity)"
        params["commodity"] = commodity
    q = text(f"""
        SELECT market,
               ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
               ROUND(MIN(min_price)::numeric,2)   AS min_price,
               ROUND(MAX(max_price)::numeric,2)   AS max_price,
               COUNT(DISTINCT commodity)          AS commodity_count
        FROM {TABLE} WHERE {where} GROUP BY market ORDER BY avg_modal DESC
    """)
    try:
        with get_engine().connect() as conn:
            data = rows_to_list(conn.execute(q, params))
        return jsonify({"count": len(data), "data": data})
    except Exception as exc:
        log.error("market/compare error: %s", exc)
        return jsonify({"error": str(exc)}), 500


@market_bp.post("/refresh")
def manual_refresh():
    if _sync_state["in_progress"]:
        return jsonify({"status": "running", "message": "Sync already in progress."}), 202
    body  = request.get_json(silent=True) or {}
    start = body.get("start", (date.today() - timedelta(days=7)).isoformat())
    end   = body.get("end",   date.today().isoformat())

    def _run():
        _sync_state["in_progress"] = True
        try:
            from fetcher import sync as fetcher_sync
            result = fetcher_sync(DATABASE_URL, start_date=start, end_date=end)
            _sync_state["last_sync"]     = datetime.now().isoformat()
            _sync_state["last_inserted"] = result.get("rows_inserted", 0)
        except Exception as exc:
            log.error("Manual refresh error: %s", exc)
        finally:
            _sync_state["in_progress"] = False

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"status": "started", "start": start, "end": end}), 202


@market_bp.get("/sync-status")
def sync_status():
    try:
        with get_engine().connect() as conn:
            row = conn.execute(text(f"""
                SELECT COUNT(*) AS total_rows,
                       MIN(arrival_date)::date AS oldest,
                       MAX(arrival_date)::date AS newest
                FROM {TABLE}
            """)).fetchone()
            city_rows = conn.execute(text(
                f"SELECT DISTINCT market FROM {TABLE} ORDER BY market LIMIT 60"
            )).fetchall()
        db_info = {
            "total_rows": int(row[0]),
            "oldest":     str(row[1]) if row[1] else None,
            "newest":     str(row[2]) if row[2] else None,
            "cities":     [r[0] for r in city_rows if r[0]],
        }
    except Exception:
        db_info = {}
    return jsonify({**_sync_state, **db_info})