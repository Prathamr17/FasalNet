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
@market_bp.get("/arima-forecast")
def arima_forecast():
    """
    GET /api/market/arima-forecast?city=Pune&commodity=Onion&days=7
    Returns ARIMA price forecast for `days` (7 or 30) into the future.
    Also returns last 14 actual data points for chart continuity.
    """
    city      = request.args.get("city", "").strip()
    commodity = request.args.get("commodity", "").strip()
    days_raw  = request.args.get("days", 7)
    try:
        days = int(days_raw)
    except (ValueError, TypeError):
        days = 7
    if not city or not commodity:
        return jsonify({"error": "city and commodity params required"}), 400
    days = 14 if days == 14 else 7

    # Extract root town for multi-tier matching (e.g. 'Sangli' from 'Sangli(Phale...) APMC')
    clean = re.sub(r'\(.*?\)', ' ', city)
    clean = re.sub(r'\b(apmc|market|committee|produce|agriculture|phale|bhajipura|bhajipala)\b', ' ', clean, flags=re.IGNORECASE)
    root_tokens = [t.strip() for t in re.findall(r'[a-zA-Z]+', clean) if len(t) > 2]
    root_town = root_tokens[0] if root_tokens else city

    engine = get_engine()
    rows = []

    try:
        with engine.connect() as conn:
            # 1. Exact match on market and commodity
            q_exact = text(f"""
                SELECT arrival_date::date AS date,
                       ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
                       ROUND(AVG(min_price)::numeric,2)   AS avg_min,
                       ROUND(AVG(max_price)::numeric,2)   AS avg_max
                FROM {TABLE}
                WHERE LOWER(TRIM(market)) = LOWER(TRIM(:city))
                  AND LOWER(TRIM(commodity)) = LOWER(TRIM(:commodity))
                GROUP BY date ORDER BY date ASC
            """)
            exact_rows = rows_to_list(conn.execute(q_exact, {"city": city, "commodity": commodity}))

            # 2. If exact match has fewer than 10 points, try root town variant match
            if len(exact_rows) >= 10:
                rows = exact_rows
            else:
                q_root = text(f"""
                    SELECT arrival_date::date AS date,
                           ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
                           ROUND(AVG(min_price)::numeric,2)   AS avg_min,
                           ROUND(AVG(max_price)::numeric,2)   AS avg_max
                    FROM {TABLE}
                    WHERE (LOWER(market) = LOWER(:city) OR LOWER(market) LIKE LOWER(:root_like))
                      AND LOWER(TRIM(commodity)) = LOWER(TRIM(:commodity))
                    GROUP BY date ORDER BY date ASC
                """)
                root_rows = rows_to_list(conn.execute(q_root, {"city": city, "root_like": f"%{root_town}%", "commodity": commodity}))
                rows = root_rows if len(root_rows) > len(exact_rows) else exact_rows

                # 3. If still fewer than 5 points, check district-level data for this market
                if len(rows) < 5:
                    dist_row = conn.execute(text(f"SELECT DISTINCT district FROM {TABLE} WHERE LOWER(market) LIKE :root_like LIMIT 1"), {"root_like": f"%{root_town}%"}).fetchone()
                    if dist_row and dist_row[0]:
                        q_dist = text(f"""
                            SELECT arrival_date::date AS date,
                                   ROUND(AVG(modal_price)::numeric,2) AS avg_modal,
                                   ROUND(AVG(min_price)::numeric,2)   AS avg_min,
                                   ROUND(AVG(max_price)::numeric,2)   AS avg_max
                            FROM {TABLE}
                            WHERE LOWER(district) = LOWER(:district)
                              AND LOWER(TRIM(commodity)) = LOWER(TRIM(:commodity))
                            GROUP BY date ORDER BY date ASC
                        """)
                        dist_rows = rows_to_list(conn.execute(q_dist, {"district": dist_row[0], "commodity": commodity}))
                        if len(dist_rows) > len(rows):
                            rows = dist_rows

    except Exception as exc:
        log.error("arima-forecast DB error: %s", exc)
        return jsonify({"error": str(exc)}), 500

    if len(rows) < 5:
        return jsonify({
            "error": f"Insufficient historical data for reliable ARIMA forecast for {commodity} in {city}. Please select another crop or market.",
            "rows_found": len(rows),
        }), 422

    # Build daily series, take up to 180 days ending at the maximum available date
    df = pd.DataFrame(rows)
    df["date"]      = pd.to_datetime(df["date"])
    df["avg_modal"] = pd.to_numeric(df["avg_modal"], errors="coerce")
    df["avg_min"]   = pd.to_numeric(df["avg_min"],   errors="coerce")
    df["avg_max"]   = pd.to_numeric(df["avg_max"],   errors="coerce")
    df = df.set_index("date").sort_index()

    max_d = df.index.max()
    min_d = max(df.index.min(), max_d - timedelta(days=180))
    df = df.loc[min_d:max_d]

    full_idx = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full_idx)
    for col in ["avg_modal", "avg_min", "avg_max"]:
        df[col] = df[col].interpolate(method="linear", limit=14).ffill().bfill()

    last_date = df.index[-1]

    # ARIMA forecast using AIC model selection
    fc_modal = _arima_predict(df["avg_modal"].values, days)
    fc_min   = _arima_predict(df["avg_min"].values,   days)
    fc_max   = _arima_predict(df["avg_max"].values,   days)

    forecast_points = []
    for i in range(days):
        fc_date = last_date + timedelta(days=i + 1)
        forecast_points.append({
            "date":      fc_date.strftime("%Y-%m-%d"),
            "price":     round(float(fc_modal[i]), 2),
            "min_price": round(float(fc_min[i]),   2),
            "max_price": round(float(fc_max[i]),   2),
        })

    # Return last 14 actual points for chart context
    actual_context = []
    for ts, row in df.tail(14).iterrows():
        actual_context.append({
            "date":      ts.strftime("%Y-%m-%d"),
            "price":     round(float(row["avg_modal"]), 2) if not np.isnan(row["avg_modal"]) else None,
            "min_price": round(float(row["avg_min"]),   2) if not np.isnan(row["avg_min"])   else None,
            "max_price": round(float(row["avg_max"]),   2) if not np.isnan(row["avg_max"])   else None,
        })

    return jsonify({
        "city":              city,
        "commodity":         commodity,
        "days":              days,
        "last_actual_date":  last_date.strftime("%Y-%m-%d"),
        "last_actual_price": round(float(df["avg_modal"].iloc[-1]), 2),
        "actual_context":    actual_context,
        "forecast":          forecast_points,
    })


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