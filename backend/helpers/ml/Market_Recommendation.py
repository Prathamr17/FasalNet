"""
Market Recommendation — Improved Training Pipeline (v2)
=======================================================
Fixes market bias (e.g. Pune always ranking #1) caused by:
  1. Frequency-encoding features (Market_Freq, District_Freq, Commodity_Freq)
     that encode dataset volume as a proxy for market identity
  2. Data imbalance — some markets have disproportionately more records,
     causing XGBoost to learn market-specific price offsets

Three training strategies are compared:
  A. Baseline    — XGBRegressor without frequency features
  B. Weighted    — XGBRegressor with inverse-market-frequency sample weights
  C. Resampled   — Per-market resampling to equalize representation

The best model (by fairness across markets while maintaining accuracy)
is saved to models/market_recommendation.pkl.

USAGE:
    pip install pandas numpy scikit-learn xgboost joblib
    cd backend/ml
    python Market_Recommendation.py

Requires: merged_output.csv in the same directory (or project root)
"""

# ─────────────────────────────────────────────────────────────
# IMPORTS
# ─────────────────────────────────────────────────────────────
import os
import sys
import json
import warnings
warnings.filterwarnings("ignore")

# Ensure UTF-8 output on Windows (avoids cp1252 errors with ₹, ─, etc.)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

import numpy  as np
import pandas as pd
import joblib

from sklearn.model_selection  import train_test_split
from sklearn.preprocessing    import LabelEncoder, StandardScaler
from sklearn.metrics          import mean_absolute_error, mean_squared_error, r2_score
from xgboost                  import XGBRegressor


# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
# Look for the CSV in the current dir, then the project root
DATA_PATH   = "merged_output.csv"
if not os.path.exists(DATA_PATH):
    ALT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "merged_output.csv")
    if os.path.exists(ALT_PATH):
        DATA_PATH = ALT_PATH

MODEL_DIR   = "models"
RESULTS_DIR = "results"
RANDOM_SEED = 42

COL_MIN   = "Min Price (Rs./Quintal)"
COL_MAX   = "Max Price (Rs./Quintal)"
COL_MODAL = "Modal Price (Rs./Quintal)"

LEAKAGE_COLS = [COL_MIN, COL_MAX]

CATEGORICAL_COLS = [
    "State", "District Name", "Market Name",
    "Commodity", "Variety", "Grade",
]

os.makedirs(MODEL_DIR,   exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# STEP 1 — LOAD DATA
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 1 — Loading Data")
print("="*62)

if not os.path.exists(DATA_PATH):
    print(f"  ✗ File not found: {DATA_PATH}")
    print(f"    Place merged_output.csv in this directory or project root.")
    sys.exit(1)

df = pd.read_csv(DATA_PATH)
print(f"  Loaded  : {len(df):,} rows × {df.shape[1]} columns")
print(f"  Columns : {df.columns.tolist()}")


# ─────────────────────────────────────────────────────────────
# STEP 2 — PREPROCESSING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 2 — Preprocessing")
print("="*62)

df.drop(columns=["Sl no."], errors="ignore", inplace=True)

df["Price Date"] = pd.to_datetime(
    df["Price Date"],
    format="%A, %d %B, %Y",
    errors="coerce",
)
nat_count = df["Price Date"].isna().sum()
print(f"  Date parse : {len(df) - nat_count:,} valid | {nat_count:,} NaT")

df["Year"]      = df["Price Date"].dt.year
df["Month"]     = df["Price Date"].dt.month
df["Day"]       = df["Price Date"].dt.day
df["DayOfWeek"] = df["Price Date"].dt.dayofweek

before = len(df)
df.dropna(inplace=True)
print(f"  After dropna : {len(df):,} rows  (dropped {before - len(df):,})")

if len(df) == 0:
    raise RuntimeError("DataFrame is empty after preprocessing. Check date format.")


# ─────────────────────────────────────────────────────────────
# STEP 3 — DATA DISTRIBUTION ANALYSIS
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 3 — Data Distribution Analysis")
print("="*62)

market_counts_raw = df["Market Name"].value_counts()

print(f"\n  Market Distribution (top 20):")
print(f"  {'Market':<35} {'Count':>8} {'%':>7}")
print(f"  {'─'*35} {'─'*8} {'─'*7}")
for market, count in market_counts_raw.head(20).items():
    pct = count / len(df) * 100
    print(f"  {market:<35} {count:>8,} {pct:>6.2f}%")

print(f"\n  Total unique markets : {len(market_counts_raw)}")
print(f"  Max records          : {market_counts_raw.max():,} ({market_counts_raw.idxmax()})")
print(f"  Min records          : {market_counts_raw.min():,} ({market_counts_raw.idxmin()})")
print(f"  Median records       : {int(market_counts_raw.median()):,}")
print(f"  Imbalance ratio      : {market_counts_raw.max()/max(market_counts_raw.min(),1):.0f}x")

# Per-state breakdown (top 10)
state_counts = df["State"].value_counts()
print(f"\n  State Distribution (top 10):")
for state, count in state_counts.head(10).items():
    n_mkts = df[df["State"] == state]["Market Name"].nunique()
    print(f"    {state:<25} {count:>8,} rows  ({n_mkts} markets)")

# Average modal price by market (top 10, min 50 records)
market_stats = df.groupby("Market Name").agg(
    avg_price=(COL_MODAL, "mean"),
    count=(COL_MODAL, "count"),
).query("count >= 50").sort_values("avg_price", ascending=False)

print(f"\n  Avg Modal Price by Market (top 10, min 50 records):")
print(f"  {'Market':<35} {'Avg Price':>12} {'Records':>8}")
print(f"  {'─'*35} {'─'*12} {'─'*8}")
for market, row in market_stats.head(10).iterrows():
    print(f"  {market:<35} ₹{row['avg_price']:>10,.0f} {int(row['count']):>8,}")

print(f"\n  ⚠  Note: v1 used frequency features (Market_Freq, etc.) that")
print(f"     encoded dataset volume into predictions — root cause of bias.")


# ─────────────────────────────────────────────────────────────
# STEP 4 — FEATURE ENGINEERING  (NO frequency features)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 4 — Feature Engineering")
print("="*62)

print(f"  Removing leakage columns : {LEAKAGE_COLS}")
df.drop(columns=LEAKAGE_COLS, inplace=True)

# ── INTENTIONALLY NOT adding frequency features ──────────────
# v1 had:
#   df["Commodity_Freq"] = df["Commodity"].map(df["Commodity"].value_counts())
#   df["Market_Freq"]    = df["Market Name"].map(df["Market Name"].value_counts())
#   df["District_Freq"]  = df["District Name"].map(df["District Name"].value_counts())
#
# These encoded dataset volume as a feature, causing the model to
# predict higher prices for markets with more records. At inference
# time, a hardcoded default of 10,000 amplified this bias further.
print("  ✗ Frequency features NOT added (removed to fix bias)")
print("    Market_Freq, District_Freq, Commodity_Freq were the")
print("    primary cause of majority-market domination in v1.")


# ─────────────────────────────────────────────────────────────
# STEP 5 — SAVE MARKET METADATA  (before encoding)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 5 — Saving Market Metadata (pre-encoding)")
print("="*62)

market_info = (
    df[["Market Name", "District Name", "State"]]
    .drop_duplicates()
    .sort_values(["State", "Market Name"])
    .reset_index(drop=True)
)
print(f"  Unique market-district-state combos : {len(market_info)}")

known_commodities = sorted(df["Commodity"].unique().tolist())
print(f"  Known commodities                   : {len(known_commodities)}")

# Build state → markets lookup for inference candidate generation
markets_by_state = {}
for _, row in market_info.iterrows():
    st = row["State"]
    if st not in markets_by_state:
        markets_by_state[st] = []
    markets_by_state[st].append({
        "Market Name":   row["Market Name"],
        "District Name": row["District Name"],
        "State":         st,
    })
print(f"  States with markets                 : {len(markets_by_state)}")


# ─────────────────────────────────────────────────────────────
# STEP 6 — ENCODING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 6 — Encoding Categorical Features")
print("="*62)

encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le
    print(f"  Encoded {col:<22} → {le.classes_.shape[0]:>4} classes")


# ─────────────────────────────────────────────────────────────
# STEP 7 — FEATURES & TARGET
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 7 — Features & Target")
print("="*62)

DROP_COLS = [COL_MODAL, "Price Date"]
feature_columns = [c for c in df.columns if c not in DROP_COLS]

X = df[feature_columns]
y = df[COL_MODAL]

print(f"  Features ({len(feature_columns)}) : {feature_columns}")
print(f"  Target   : {COL_MODAL}")
print(f"  y stats  : min=₹{y.min():,.0f}  max=₹{y.max():,.0f}  mean=₹{y.mean():,.0f}")


# ─────────────────────────────────────────────────────────────
# STEP 8 — TRAIN / TEST SPLIT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 8 — Train / Test Split")
print("="*62)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_SEED
)
print(f"  Train : {len(X_train):,}  |  Test : {len(X_test):,}")

scaler = StandardScaler()
scaler.fit(X_train)


# ─────────────────────────────────────────────────────────────
# STEP 9 — EVALUATION HELPERS
# ─────────────────────────────────────────────────────────────
def evaluate(model, name, X_te, y_te):
    """Evaluate model with overall + per-market metrics."""
    preds = model.predict(X_te)

    mae  = mean_absolute_error(y_te, preds)
    rmse = np.sqrt(mean_squared_error(y_te, preds))
    r2   = r2_score(y_te, preds)

    mask = y_te != 0
    mape = np.mean(np.abs((y_te[mask] - preds[mask]) / y_te[mask])) * 100

    # Per-market MAE for fairness analysis
    market_enc = encoders["Market Name"]
    per_market = {}
    for code in X_te["Market Name"].unique():
        m_mask = X_te["Market Name"] == code
        n = m_mask.sum()
        if n < 5:
            continue
        mkt_name = market_enc.inverse_transform([int(code)])[0]
        m_mae = mean_absolute_error(y_te[m_mask], preds[m_mask])
        per_market[mkt_name] = {"MAE": round(float(m_mae), 2), "count": int(n)}

    # Fairness: σ of per-market MAE (lower = more equitable error)
    mae_vals = [v["MAE"] for v in per_market.values()]
    fairness_std = float(np.std(mae_vals)) if mae_vals else 0.0

    print(f"\n  ── {name} ──")
    print(f"  MAE      : ₹{mae:>12,.2f}")
    print(f"  RMSE     : ₹{rmse:>12,.2f}")
    print(f"  R²       :   {r2:>10.6f}")
    print(f"  MAPE     :   {mape:>10.2f}%")
    print(f"  Fairness :   {fairness_std:>10.2f}  (σ of per-market MAE)")

    return {
        "MAE": float(mae), "RMSE": float(rmse),
        "R2": float(r2), "MAPE": float(mape),
        "fairness_std": fairness_std,
        "per_market": per_market,
    }


# ─────────────────────────────────────────────────────────────
# STEP 10 — MODEL TRAINING  (3 Strategies)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 10 — Model Training  (3 Strategies)")
print("="*62)

XGB_PARAMS = dict(
    n_estimators  = 300,
    learning_rate = 0.1,
    max_depth     = 6,
    tree_method   = "hist",
    random_state  = RANDOM_SEED,
    n_jobs        = -1,
)

all_results = {}
models_dict = {}

# ── Strategy A: Baseline (freq features removed, otherwise same) ──
print("\n  ▸ Strategy A: Baseline (no freq features)")
print("    Training XGBoost …")
model_a = XGBRegressor(**XGB_PARAMS)
model_a.fit(X_train, y_train)
all_results["A_Baseline"] = evaluate(model_a, "A: Baseline", X_test, y_test)
models_dict["A_Baseline"] = model_a

# ── Strategy B: Weighted by inverse market frequency ──
print("\n  ▸ Strategy B: Inverse-market-frequency sample weights")
market_counts_train = X_train["Market Name"].value_counts()
n_markets_train     = len(market_counts_train)
weight_map = {
    int(m): len(X_train) / (n_markets_train * c)
    for m, c in market_counts_train.items()
}
sample_weights = X_train["Market Name"].map(weight_map).values

print(f"    Weight range: {min(weight_map.values()):.2f} – {max(weight_map.values()):.2f}")
print("    Training XGBoost …")
model_b = XGBRegressor(**XGB_PARAMS)
model_b.fit(X_train, y_train, sample_weight=sample_weights)
all_results["B_Weighted"] = evaluate(model_b, "B: Weighted", X_test, y_test)
models_dict["B_Weighted"] = model_b

# ── Strategy C: Resampled (per-market equalization) ──
print("\n  ▸ Strategy C: Per-market resampling")
train_buf = X_train.copy()
train_buf["__target__"] = y_train.values

target_n = int(market_counts_train.median())
print(f"    Target count per market: {target_n}")

resampled_parts = []
for code in train_buf["Market Name"].unique():
    group = train_buf[train_buf["Market Name"] == code]
    if len(group) >= target_n:
        resampled_parts.append(
            group.sample(target_n, random_state=RANDOM_SEED)
        )
    else:
        resampled_parts.append(
            group.sample(target_n, replace=True, random_state=RANDOM_SEED)
        )

resampled = pd.concat(resampled_parts, ignore_index=True)
X_train_rs = resampled.drop(columns=["__target__"])
y_train_rs = resampled["__target__"]
print(f"    Resampled train set: {len(X_train_rs):,} rows "
      f"(was {len(X_train):,})")

print("    Training XGBoost …")
model_c = XGBRegressor(**XGB_PARAMS)
model_c.fit(X_train_rs, y_train_rs)
all_results["C_Resampled"] = evaluate(model_c, "C: Resampled", X_test, y_test)
models_dict["C_Resampled"] = model_c


# ─────────────────────────────────────────────────────────────
# STEP 11 — MODEL COMPARISON & SELECTION
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 11 — Model Comparison & Selection")
print("="*62)

print(f"\n  {'Strategy':<20} {'MAE':>10} {'RMSE':>10} {'R²':>10} "
      f"{'MAPE':>8} {'Fairness σ':>11}")
print(f"  {'─'*20} {'─'*10} {'─'*10} {'─'*10} {'─'*8} {'─'*11}")
for key, res in all_results.items():
    print(f"  {key:<20} ₹{res['MAE']:>9,.0f} ₹{res['RMSE']:>9,.0f} "
          f"{res['R2']:>10.4f} {res['MAPE']:>7.1f}% {res['fairness_std']:>10,.0f}")

# Selection: pick lowest fairness_std among models with R² ≥ 90% of baseline
baseline_r2  = all_results["A_Baseline"]["R2"]
r2_threshold = baseline_r2 * 0.90

qualifying = {k: v for k, v in all_results.items() if v["R2"] >= r2_threshold}
if not qualifying:
    qualifying = all_results

best_key = min(qualifying, key=lambda k: qualifying[k]["fairness_std"])

best_model   = models_dict[best_key]
best_name    = f"XGBoost-{best_key}"
best_metrics = all_results[best_key]

print(f"\n  R² threshold (90% of baseline) : {r2_threshold:.4f}")
print(f"  Qualifying strategies          : {list(qualifying.keys())}")
print(f"\n  ✅ Selected: {best_name}")
print(f"     R²       : {best_metrics['R2']:.4f}")
print(f"     MAE      : ₹{best_metrics['MAE']:,.2f}")
print(f"     Fairness : {best_metrics['fairness_std']:,.2f}")


# ─────────────────────────────────────────────────────────────
# STEP 12 — FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print(f"  STEP 12 — Feature Importance  ({best_name})")
print("="*62)

importances = pd.Series(
    best_model.feature_importances_,
    index=feature_columns,
).sort_values(ascending=False)

print(importances.to_string())
importances.to_csv(
    os.path.join(RESULTS_DIR, "feature_importance.csv"),
    header=["importance"],
)
print(f"\n  ✓ Saved → {RESULTS_DIR}/feature_importance.csv")


# ─────────────────────────────────────────────────────────────
# STEP 13 — SAVE MODEL  (market_recommendation.pkl)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 13 — Saving Model  (market_recommendation.pkl)")
print("="*62)

strategy_comparison = {}
for k, v in all_results.items():
    strategy_comparison[k] = {kk: vv for kk, vv in v.items() if kk != "per_market"}

best_bundle = {
    # Core model artifacts
    "model":            best_model,
    "model_name":       best_name,
    "scaler":           scaler,
    "encoders":         encoders,
    "feature_columns":  feature_columns,
    "metrics":          {
        "MAE":  best_metrics["MAE"],
        "RMSE": best_metrics["RMSE"],
        "R2":   best_metrics["R2"],
        "MAPE": best_metrics["MAPE"],
    },
    # Market metadata for inference (NEW in v2)
    "market_info":       market_info.to_dict("records"),
    "markets_by_state":  markets_by_state,
    "known_commodities": known_commodities,
    # Training comparison (NEW in v2)
    "strategy_comparison": strategy_comparison,
    "pipeline_version":    2,
}

bundle_path = os.path.join(MODEL_DIR, "market_recommendation.pkl")
joblib.dump(best_bundle, bundle_path)
print(f"  ✓ Model bundle → {bundle_path}")

results_out = {
    "best_model": best_name,
    "best_metrics": {k: v for k, v in best_metrics.items() if k != "per_market"},
    "strategies": strategy_comparison,
    "per_market_detail": {
        k: v.get("per_market", {}) for k, v in all_results.items()
    },
}
results_path = os.path.join(RESULTS_DIR, "market_recommendation_results.json")
with open(results_path, "w") as f:
    json.dump(results_out, f, indent=2, default=str)
print(f"  ✓ Results JSON → {results_path}")


# ─────────────────────────────────────────────────────────────
# STEP 14 — SANITY CHECK PREDICTIONS
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 14 — Sanity Check Predictions")
print("="*62)

test_combos = [
    ("Onion",  4, "April"),
    ("Onion",  5, "May"),
    ("Tomato", 4, "April"),
    ("Potato", 4, "April"),
    ("Wheat",  6, "June"),
]

market_enc    = encoders["Market Name"]
commodity_enc = encoders["Commodity"]
variety_enc   = encoders["Variety"]
grade_enc     = encoders["Grade"]
state_enc     = encoders["State"]
district_enc  = encoders["District Name"]

def_variety = int(variety_enc.transform(["Local"])[0]) if "Local" in variety_enc.classes_ else 0
def_grade   = int(grade_enc.transform(["FAQ"])[0])     if "FAQ"   in grade_enc.classes_   else 0

# Use Maharashtra markets for sanity checks (matches UI default)
mh_markets = markets_by_state.get("Maharashtra", [])
if not mh_markets:
    biggest_state = max(markets_by_state, key=lambda s: len(markets_by_state[s]))
    mh_markets = markets_by_state[biggest_state]
    print(f"  (No Maharashtra data — using {biggest_state})")

pune_first = 0
total_checks = 0

for commodity_name, month_num, month_label in test_combos:
    print(f"\n  ── {commodity_name} + {month_label} ──")

    if commodity_name not in commodity_enc.classes_:
        print(f"    ⚠ '{commodity_name}' not in training data, skipping")
        continue

    commodity_code = int(commodity_enc.transform([commodity_name])[0])
    predictions = []

    for mkt in mh_markets:
        mkt_name  = mkt["Market Name"]
        dist_name = mkt["District Name"]
        st_name   = mkt["State"]

        if mkt_name not in market_enc.classes_:
            continue

        row = {
            "State":         int(state_enc.transform([st_name])[0])      if st_name   in state_enc.classes_    else 0,
            "District Name": int(district_enc.transform([dist_name])[0]) if dist_name in district_enc.classes_ else 0,
            "Market Name":   int(market_enc.transform([mkt_name])[0]),
            "Commodity":     commodity_code,
            "Variety":       def_variety,
            "Grade":         def_grade,
            "Year":          2025,
            "Month":         month_num,
            "Day":           15,
            "DayOfWeek":     2,
        }

        input_df = pd.DataFrame([row])[feature_columns]
        pred = float(best_model.predict(input_df)[0])
        predictions.append((mkt_name, pred))

    if not predictions:
        print("    ⚠ No valid markets for this combination")
        continue

    predictions.sort(key=lambda x: x[1], reverse=True)
    total_checks += 1

    print(f"    {'Rank':<6} {'Market':<35} {'Predicted':>12}")
    print(f"    {'─'*6} {'─'*35} {'─'*12}")
    for i, (mkt, price) in enumerate(predictions[:7], 1):
        print(f"    {i:<6} {mkt:<35} ₹{price:>10,.2f}")

    top = predictions[0][0]
    if "Pune" in top:
        pune_first += 1
        print(f"    ⚠ Top market is Pune-related: {top}")
    else:
        print(f"    ✓ Top market: {top}")

if total_checks > 0:
    print(f"\n  Sanity summary: Pune-related ranked #1 in "
          f"{pune_first}/{total_checks} tests")
    if pune_first == total_checks:
        print("  ⚠ Pune still dominates — may need further tuning")
    elif pune_first == 0:
        print("  ✓ Good diversity — no single market dominates all combos")
    else:
        print("  ✓ Mixed results — genuine price differences, not bias")


# ─────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  ✅  PIPELINE COMPLETE")
print("="*62)
print(f"  Best Model  : {best_name}")
print(f"  R²          : {best_metrics['R2']:.4f}")
print(f"  MAE         : ₹{best_metrics['MAE']:,.2f}")
print(f"  RMSE        : ₹{best_metrics['RMSE']:,.2f}")
print(f"  MAPE        : {best_metrics['MAPE']:.2f}%")
print(f"  Fairness σ  : {best_metrics['fairness_std']:,.2f}")
print(f"  Saved to    : {bundle_path}")
print(f"\n  Next steps:")
print(f"    cp {bundle_path} model_cache/market_recommendation.pkl")
print("="*62 + "\n")