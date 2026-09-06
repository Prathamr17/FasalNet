# FasalNet Backend Updates v3

## 📋 Overview

This guide provides all necessary backend changes to implement v3 requirements:

1. **Forecast Horizons**: 7-day and 14-day only (remove 30-day from frontend)
2. **Trend Indicators**: 30-day and 60-day UP/DOWN signals with confidence
3. **Confidentiality**: Hide model names, parameters, and internal metrics

---

## 🔄 Architecture Changes

### Current State (v10+)
- Routes: auth, farmer, booking, operator, customer, delivery, otp, ml, market_data
- ML models: Price prediction, classification, market recommendation, spoilage
- Market intelligence: ARIMA forecasts

### v3 Changes
- **New endpoint**: `/api/market/forecast-v3/predictions` (7/14-day forecasts + 30/60-day trends)
- **Lightweight endpoint**: `/api/market/forecast-v3/trends` (30/60-day trends only)
- **Updated config**: New horizon settings, confidentiality flags
- **New engine**: `trend_indicator_engine` for 30/60-day trend predictions
- **Masked responses**: Hide model details, expose only actionable insights

---

## 📝 File Changes Summary

1. `backend/ml/trend_indicator_engine.py` (NEW)
2. `backend/routes/market_forecast_v3.py` (NEW)
3. `backend/app.py` (Updated to register `forecast_v3_bp`)
4. `backend/settings.py` (Updated with V3 forecast config)

---

## 🧪 Response Format Example

```json
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
    "14_day": {
      "target_date": "2026-09-18",
      "forecasted_price": 1245.56,
      "expected_variance": 52.67,
      "price_change_percent": 8.34,
      "confidence_bounds": {
        "upper_95": 1350.89,
        "lower_95": 1140.23,
        "upper_80": 1310.12,
        "lower_80": 1181.00
      },
      "direction": "UP"
    }
  },
  "trend_indicators": {
    "30_day": {
      "direction": "UP",
      "confidence": "high",
      "reason": "Strong upward trend expected over the next 30 days based on historical seasonality pattern.",
      "horizon_days": 30
    },
    "60_day": {
      "direction": "DOWN",
      "confidence": "medium",
      "reason": "Moderate downward trend expected over the next 60 days based on moving average momentum.",
      "horizon_days": 60
    }
  },
  "model_info": {
    "status": "optimized",
    "data_source": "Real Database",
    "last_updated": "2026-09-04T10:30:00"
  },
  "timestamp": "2026-09-04T10:30:00"
}
```
