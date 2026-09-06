"""
ml/trend_indicator_engine.py
─────────────────────────────────────────────────────────────────
FasalNet v3 — Trend Indicator Engine

Generates 30/60-day trend predictions (UP/DOWN/NEUTRAL) without
exposing model details. Uses 4 independent signals with weighted
aggregation.

Signals:
1. Seasonal Decomposition (30% weight) — Historical seasonality
2. Moving Average Momentum (25% weight) — SMA7 vs SMA30 crossover
3. Volatility-Adjusted Trend (25% weight) — Trend adjusted by vol
4. Cyclical Pattern Detection (20% weight) — ACF lag-7 cyclicity

Output Format (JSON):
{
    "direction": "UP" | "DOWN" | "NEUTRAL",
    "confidence": "high" | "medium" | "low",
    "reason": "string explaining the prediction",
    "horizon_days": 30 or 60
}

NO MODEL DETAILS EXPOSED — only actionable insights.
─────────────────────────────────────────────────────────────────
"""

import logging
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
from enum import Enum
import warnings

warnings.filterwarnings('ignore')
log = logging.getLogger(__name__)


class TrendDirection(Enum):
    """Trend direction enumeration."""
    UP = "UP"
    DOWN = "DOWN"
    NEUTRAL = "NEUTRAL"


class ConfidenceLevel(Enum):
    """Confidence level enumeration."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


def calculate_trend_indicators(
    prices: List[float],
    horizon_days: int = 30
) -> Dict[str, Any]:
    """
    Calculate trend indicator for 30 or 60 days.

    Args:
        prices: Historical price list (must have at least 30 values)
        horizon_days: Forecast horizon (30 or 60)

    Returns:
        Dictionary:
        {
            "direction": "UP" | "DOWN" | "NEUTRAL",
            "confidence": "high" | "medium" | "low",
            "reason": "string",
            "horizon_days": 30 or 60
        }

    Example:
        >>> prices = [100, 105, 103, 108, 110, ...]  # 30+ values
        >>> trend = calculate_trend_indicators(prices, horizon_days=30)
        >>> print(trend["direction"])  # "UP"
    """

    # Validate input
    if not prices or len(prices) < 30:
        return {
            "direction": "NEUTRAL",
            "confidence": "low",
            "reason": "Insufficient historical data to predict trend.",
            "horizon_days": horizon_days
        }

    try:
        prices_array = np.array(prices, dtype=float)

        # Validate prices
        if np.isnan(prices_array).any():
            prices_array = prices_array[~np.isnan(prices_array)]

        if len(prices_array) < 30:
            return {
                "direction": "NEUTRAL",
                "confidence": "low",
                "reason": "Insufficient valid historical data.",
                "horizon_days": horizon_days
            }

        # Calculate 4 signals
        signals = []
        signal_labels = []

        # Signal 1: Seasonal trend (30% weight)
        seasonal_signal = _get_seasonal_signal(prices_array)
        signals.append(seasonal_signal)
        signal_labels.append(("seasonal", seasonal_signal))

        # Signal 2: Moving average momentum (25% weight)
        momentum_signal = _get_momentum_signal(prices_array)
        signals.append(momentum_signal)
        signal_labels.append(("momentum", momentum_signal))

        # Signal 3: Volatility-adjusted trend (25% weight)
        volatility_signal = _get_volatility_signal(prices_array)
        signals.append(volatility_signal)
        signal_labels.append(("volatility", volatility_signal))

        # Signal 4: Cyclical pattern (20% weight)
        cyclical_signal = _get_cyclical_signal(prices_array)
        signals.append(cyclical_signal)
        signal_labels.append(("cyclical", cyclical_signal))

        # Aggregate signals with weights
        weights = np.array([0.30, 0.25, 0.25, 0.20])
        weighted_avg = np.average(signals, weights=weights)
        signal_std = np.std(signals)
        signal_agreement = 1.0 - min(signal_std, 1.0)

        # Determine direction
        if weighted_avg > 0.15:
            direction = TrendDirection.UP
        elif weighted_avg < -0.15:
            direction = TrendDirection.DOWN
        else:
            direction = TrendDirection.NEUTRAL

        # Determine confidence
        signal_strength = abs(weighted_avg)
        if signal_agreement > 0.70 and signal_strength > 0.3:
            confidence = ConfidenceLevel.HIGH
        elif signal_agreement > 0.40 or signal_strength > 0.5:
            confidence = ConfidenceLevel.MEDIUM
        else:
            confidence = ConfidenceLevel.LOW

        # Generate reasoning
        reason = _generate_reason(
            direction, confidence, horizon_days, signal_labels
        )

        return {
            "direction": direction.value,
            "confidence": confidence.value,
            "reason": reason,
            "horizon_days": horizon_days
        }

    except Exception as e:
        log.warning(f"Error in trend calculation: {e}")
        return {
            "direction": "NEUTRAL",
            "confidence": "low",
            "reason": "Unable to calculate trend at this time.",
            "horizon_days": horizon_days
        }


# ============ SIGNAL CALCULATION METHODS ============


def _get_seasonal_signal(prices: np.ndarray) -> float:
    """
    Signal 1: Seasonal decomposition trend.

    Detects seasonal component and extrapolates forward.
    Returns value in range [-1, 1].
    """
    try:
        from statsmodels.tsa.seasonal import seasonal_decompose

        # Use weekly seasonality (7-day period)
        period = min(7, max(4, len(prices) // 10))

        if len(prices) < period * 3:
            return 0.0

        # Decompose
        decomposition = seasonal_decompose(
            prices,
            model="additive",
            period=period,
            extrapolate="fill_value"
        )

        # Analyze seasonal component
        seasonal_component = decomposition.seasonal[-period:]
        recent_seasonal_avg = np.mean(seasonal_component)

        # Normalize by std of prices
        price_std = np.std(prices)
        if price_std > 0:
            seasonal_strength = recent_seasonal_avg / price_std
            return float(np.clip(seasonal_strength, -1.0, 1.0))

        return 0.0

    except Exception as e:
        log.debug(f"Seasonal signal calculation failed: {e}")
        return 0.0


def _get_momentum_signal(prices: np.ndarray) -> float:
    """
    Signal 2: Moving average momentum.

    Compares short-term (7-day) and long-term (30-day) moving averages.
    Returns value in range [-1, 1].
    """
    try:
        if len(prices) < 30:
            return 0.0

        # Calculate moving averages
        sma_7 = np.mean(prices[-7:])
        sma_30 = np.mean(prices[-30:])

        if sma_30 == 0:
            return 0.0

        # Momentum as percentage change
        momentum_pct = ((sma_7 - sma_30) / sma_30) * 100

        # Scale to [-1, 1]
        # >+5% = strong uptrend (1.0)
        # <-5% = strong downtrend (-1.0)
        # ±5% = neutral (0.0)
        if momentum_pct >= 5:
            return 1.0
        elif momentum_pct <= -5:
            return -1.0
        else:
            return momentum_pct / 5.0

    except Exception as e:
        log.debug(f"Momentum signal calculation failed: {e}")
        return 0.0


def _get_volatility_signal(prices: np.ndarray) -> float:
    """
    Signal 3: Volatility-adjusted trend.

    If current volatility is high, reduce trend confidence.
    If current volatility is low and trend is clear, increase signal.
    Returns value in range [-1, 1].
    """
    try:
        if len(prices) < 30:
            return 0.0

        # Calculate volatility ratios
        recent_returns = np.diff(prices[-7:]) / prices[-8:-1]
        recent_vol = np.std(recent_returns)

        long_returns = np.diff(prices[-30:]) / prices[-31:-1]
        long_vol = np.std(long_returns)

        # Volatility ratio
        if long_vol > 0:
            vol_ratio = recent_vol / long_vol
        else:
            vol_ratio = 1.0

        # Base trend (simple MA-based)
        sma_7 = np.mean(prices[-7:])
        sma_30 = np.mean(prices[-30:])
        base_trend = 1.0 if sma_7 > sma_30 else -1.0

        # Adjust by volatility
        # High volatility → reduce confidence
        # Low volatility → maintain confidence
        if vol_ratio > 1.5:
            # Volatility spike → reduce trend strength
            adjusted_signal = base_trend * 0.5
        elif vol_ratio < 0.8:
            # Volatility drop (stability) → maintain trend
            adjusted_signal = base_trend * 1.0
        else:
            # Normal volatility → moderate trend
            adjusted_signal = base_trend * 0.8

        return float(np.clip(adjusted_signal, -1.0, 1.0))

    except Exception as e:
        log.debug(f"Volatility signal calculation failed: {e}")
        return 0.0


def _get_cyclical_signal(prices: np.ndarray) -> float:
    """
    Signal 4: Cyclical pattern detection.

    Uses autocorrelation at lag-7 to detect weekly cycles.
    Extrapolates cycle phase forward.
    Returns value in range [-1, 1].
    """
    try:
        if len(prices) < 14:
            return 0.0

        # Manual ACF calculation for lag-7
        prices_centered = prices - np.mean(prices)
        c0 = np.dot(prices_centered, prices_centered) / len(prices)

        if c0 == 0:
            return 0.0

        # Autocorrelation at lag-7 (weekly)
        if len(prices) > 7:
            c7 = np.dot(prices_centered[:-7], prices_centered[7:]) / len(prices)
            acf_lag7 = c7 / c0
        else:
            acf_lag7 = 0.0

        # If strong weekly cycle exists, use it
        if abs(acf_lag7) > 0.3:
            # Detect cycle phase
            cycle_phase = (len(prices) % 7) / 7.0  # 0-1
            
            # If in first half of cycle, trend is upward
            # If in second half, trend is downward
            if cycle_phase < 0.5:
                cyclical_signal = 0.5
            else:
                cyclical_signal = -0.5

            # Scale by correlation strength
            cyclical_signal *= abs(acf_lag7)
        else:
            # No strong cycle detected
            cyclical_signal = 0.0

        return float(np.clip(cyclical_signal, -1.0, 1.0))

    except Exception as e:
        log.debug(f"Cyclical signal calculation failed: {e}")
        return 0.0


# ============ HELPER FUNCTIONS ============


def _generate_reason(
    direction: TrendDirection,
    confidence: ConfidenceLevel,
    horizon_days: int,
    signal_labels: List[Tuple[str, float]]
) -> str:
    """
    Generate human-readable reasoning for trend prediction.

    Args:
        direction: Predicted trend direction
        confidence: Confidence level
        horizon_days: Forecast horizon (30 or 60)
        signal_labels: List of (signal_name, signal_value) tuples

    Returns:
        Reasoning string
    """

    # Strength descriptor
    strength_words = {
        "high": "strong",
        "medium": "moderate",
        "low": "weak"
    }
    strength = strength_words.get(confidence.value, "moderate")

    # Base reasoning with direction and horizon
    if direction == TrendDirection.UP:
        base = f"{strength.capitalize()} upward trend expected"
    elif direction == TrendDirection.DOWN:
        base = f"{strength.capitalize()} downward trend expected"
    else:
        base = "Market expected to remain stable"

    base += f" over the next {horizon_days} days"

    # Find dominant signal
    dominant_signal = max(signal_labels, key=lambda x: abs(x[1]))
    signal_name, signal_strength = dominant_signal

    # Add signal-based explanation
    if abs(signal_strength) > 0.3:
        if signal_name == "seasonal":
            base += " based on historical seasonality pattern"
        elif signal_name == "momentum":
            base += " based on moving average momentum"
        elif signal_name == "volatility":
            base += " adjusted for current market volatility"
        elif signal_name == "cyclical":
            base += " based on detected cyclical patterns"

    base += "."

    return base


def calculate_trend_indicators_batch(
    prices_dict: Dict[str, List[float]],
    horizon_days: int = 30
) -> Dict[str, Dict[str, Any]]:
    """
    Calculate trend indicators for multiple commodities/cities.

    Args:
        prices_dict: Dictionary mapping keys to price lists
        horizon_days: Forecast horizon

    Returns:
        Dictionary mapping same keys to trend indicator results
    """

    results = {}
    for key, prices in prices_dict.items():
        results[key] = calculate_trend_indicators(prices, horizon_days)

    return results
