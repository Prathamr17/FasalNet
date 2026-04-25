"""
USAGE:
    pip install pandas numpy scikit-learn xgboost joblib
    python Market_Recommendation.py
"""

# ─────────────────────────────────────────────────────────────
# IMPORTS
# ─────────────────────────────────────────────────────────────
import os
import json
import warnings
warnings.filterwarnings("ignore")

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
DATA_PATH   = "merged_output.csv"
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
# STEP 3 — FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 3 — Feature Engineering")
print("="*62)

print(f"  Removing leakage columns : {LEAKAGE_COLS}")
df.drop(columns=LEAKAGE_COLS, inplace=True)

df["Commodity_Freq"] = df["Commodity"].map(df["Commodity"].value_counts())
df["Market_Freq"]    = df["Market Name"].map(df["Market Name"].value_counts())
df["District_Freq"]  = df["District Name"].map(df["District Name"].value_counts())
print("  Added frequency features : Commodity_Freq, Market_Freq, District_Freq")


# ─────────────────────────────────────────────────────────────
# STEP 4 — ENCODING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 4 — Encoding Categorical Features")
print("="*62)

encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le
    print(f"  Encoded {col:<22} → {le.classes_.shape[0]:>4} classes")


# ─────────────────────────────────────────────────────────────
# STEP 5 — FEATURES & TARGET
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 5 — Features & Target")
print("="*62)

DROP_COLS = [COL_MODAL, "Price Date"]
feature_columns = [c for c in df.columns if c not in DROP_COLS]

X = df[feature_columns]
y = df[COL_MODAL]

print(f"  Features ({len(feature_columns)}) : {feature_columns}")
print(f"  Target   : {COL_MODAL}")
print(f"  y stats  : min=₹{y.min():,.0f}  max=₹{y.max():,.0f}  mean=₹{y.mean():,.0f}")


# ─────────────────────────────────────────────────────────────
# STEP 6 — TRAIN / TEST SPLIT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 6 — Train / Test Split")
print("="*62)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_SEED
)
print(f"  Train : {len(X_train):,}  |  Test : {len(X_test):,}")

scaler = StandardScaler()
scaler.fit(X_train)


# ─────────────────────────────────────────────────────────────
# STEP 7 — EVALUATION HELPER
# ─────────────────────────────────────────────────────────────
def evaluate(model, name: str, X_te) -> dict:
    preds = model.predict(X_te)

    mae  = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2   = r2_score(y_test, preds)

    mask = y_test != 0
    mape = np.mean(np.abs((y_test[mask] - preds[mask]) / y_test[mask])) * 100

    print(f"\n  ── {name} ──")
    print(f"  MAE   : ₹{mae:>12,.2f}")
    print(f"  RMSE  : ₹{rmse:>12,.2f}")
    print(f"  R²    :   {r2:>10.6f}")
    print(f"  MAPE  :   {mape:>10.2f}%")

    return {"MAE": mae, "RMSE": rmse, "R2": r2, "MAPE": mape}


# ─────────────────────────────────────────────────────────────
# STEP 8 — MODEL TRAINING & EVALUATION  (XGBoost only)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 8 — Model Training & Evaluation  (XGBoost)")
print("="*62)

xgb = XGBRegressor(
    n_estimators  = 300,
    learning_rate = 0.1,
    max_depth     = 6,
    tree_method   = "hist",   # histogram-based: memory-efficient & fast
    random_state  = RANDOM_SEED,
    n_jobs        = -1,
)

print("\n  Training XGBoost …")
xgb.fit(X_train, y_train)

all_results = {}
all_results["XGBoost"] = evaluate(xgb, "XGBoost", X_test)


# ─────────────────────────────────────────────────────────────
# STEP 9 — BEST MODEL  (XGBoost is the only model)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 9 — Best Model")
print("="*62)

best_name    = "XGBoost"
best_model   = xgb
best_metrics = all_results["XGBoost"]

print(f"\n  Model  : {best_name}")
print(f"  R²     : {best_metrics['R2']:.4f}")
print(f"  RMSE   : ₹{best_metrics['RMSE']:,.2f}")
print(f"  MAPE   : {best_metrics['MAPE']:.2f}%")


# ─────────────────────────────────────────────────────────────
# STEP 10 — FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print(f"  STEP 10 — Feature Importance  ({best_name})")
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
print(f"  ✓ Saved → {RESULTS_DIR}/feature_importance.csv")


# ─────────────────────────────────────────────────────────────
# STEP 11 — SAVE MODEL  (market_recommendation.pkl)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 11 — Saving Model  (market_recommendation.pkl)")
print("="*62)

best_bundle = {
    "model"          : best_model,
    "model_name"     : best_name,
    "scaler"         : scaler,
    "encoders"       : encoders,
    "feature_columns": feature_columns,
    "metrics"        : best_metrics,
}

bundle_path = os.path.join(MODEL_DIR, "market_recommendation.pkl")
joblib.dump(best_bundle, bundle_path)
print(f"  ✓ Saved → {bundle_path}")

all_results["best_model"] = best_name
results_path = os.path.join(RESULTS_DIR, "regression_results.json")
with open(results_path, "w") as f:
    json.dump(all_results, f, indent=2, default=str)
print(f"  ✓ Results → {results_path}")


# ─────────────────────────────────────────────────────────────
# HOW TO LOAD AT INFERENCE TIME
# ─────────────────────────────────────────────────────────────
"""
import joblib, pandas as pd

bundle          = joblib.load("models/market_recommendation.pkl")
model           = bundle["model"]
encoders        = bundle["encoders"]
feature_columns = bundle["feature_columns"]

row = {
    "State": "Uttar Pradesh", "District Name": "Auraiya",
    "Market Name": "Auraiya", "Commodity": "Wheat",
    "Variety": "Dara", "Grade": "FAQ",
    "Year": 2025, "Month": 6, "Day": 15, "DayOfWeek": 6,
    "Commodity_Freq": 50000, "Market_Freq": 20000, "District_Freq": 15000,
}

input_df = pd.DataFrame([row])
for col in ["State", "District Name", "Market Name", "Commodity", "Variety", "Grade"]:
    enc = encoders[col]
    input_df[col] = enc.transform([row[col]])[0] if row[col] in enc.classes_ else 0

input_df = input_df[feature_columns]
pred = model.predict(input_df)[0]
print(f"Predicted Modal Price: ₹{pred:,.2f} per Quintal")
"""


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
print(f"  Saved to    : {bundle_path}")
print("="*62 + "\n")