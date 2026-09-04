"""
USAGE:
    pip install pandas numpy scikit-learn xgboost joblib
    python Price_Prediction_Model.py
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

from sklearn.model_selection import train_test_split
from sklearn.preprocessing   import LabelEncoder, StandardScaler
from sklearn.metrics         import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model    import LinearRegression
from sklearn.ensemble        import RandomForestRegressor
from xgboost                 import XGBRegressor


# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
DATA_PATH   = "merged_output.csv"
MODEL_DIR   = "models"
RESULTS_DIR = "results"
RANDOM_SEED = 42

COL_MODAL = "Modal Price (Rs./Quintal)"
COL_MIN   = "Min Price (Rs./Quintal)"
COL_MAX   = "Max Price (Rs./Quintal)"

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

df = df.sort_values("Price Date")

df["Year"]      = df["Price Date"].dt.year
df["Month"]     = df["Price Date"].dt.month
df["Day"]       = df["Price Date"].dt.day
df["DayOfWeek"] = df["Price Date"].dt.dayofweek

before = len(df)
df.dropna(subset=[COL_MODAL, COL_MIN, COL_MAX], inplace=True)
df.dropna(inplace=True)
print(f"  After dropna : {len(df):,} rows  (dropped {before - len(df):,})")

if df.empty:
    raise ValueError("Dataset is empty after preprocessing. Check date format.")


# ─────────────────────────────────────────────────────────────
# STEP 3 — FEATURE ENGINEERING  (leakage-free)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 3 — Feature Engineering")
print("="*62)

# Min/Max Price correlate with Modal Price at r ≈ 0.97–0.99 → leakage
print(f"  Dropping leakage columns : {LEAKAGE_COLS}")
df.drop(columns=LEAKAGE_COLS, inplace=True)

df["Commodity_Freq"] = df["Commodity"].map(df["Commodity"].value_counts())
df["Market_Freq"]    = df["Market Name"].map(df["Market Name"].value_counts())
df["District_Freq"]  = df["District Name"].map(df["District Name"].value_counts())
print("  Added safe frequency features: Commodity_Freq, Market_Freq, District_Freq")


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

if X.empty:
    raise ValueError("Feature set is empty.")


# ─────────────────────────────────────────────────────────────
# STEP 6 — TRAIN / TEST SPLIT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 6 — Train / Test Split")
print("="*62)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_SEED, shuffle=True
)
print(f"  Train : {len(X_train):,}  |  Test : {len(X_test):,}")


# ─────────────────────────────────────────────────────────────
# STEP 7 — SCALING  (only for Linear Regression)
# ─────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)


# ─────────────────────────────────────────────────────────────
# STEP 8 — MODEL TRAINING & EVALUATION
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 8 — Model Training & Evaluation")
print("="*62)

# (name, model, uses_scaling)
model_list = [
    ("Linear Regression", LinearRegression(),                                              True),
    ("Random Forest",     RandomForestRegressor(n_estimators=100, random_state=RANDOM_SEED,
                                                 n_jobs=-1),                               False),
    ("XGBoost",           XGBRegressor(n_estimators=200, learning_rate=0.1, max_depth=6,
                                        random_state=RANDOM_SEED, n_jobs=-1),              False),
]

all_results = {}
trained     = {}   # name → (fitted_model, uses_scaling)

for name, model, use_scaled in model_list:
    print(f"\n  ── {name} ──")

    Xtr = X_train_scaled if use_scaled else X_train
    Xte = X_test_scaled  if use_scaled else X_test

    model.fit(Xtr, y_train)
    preds = model.predict(Xte)

    mae  = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2   = r2_score(y_test, preds)

    mask = y_test != 0
    mape = np.mean(np.abs((y_test[mask] - preds[mask]) / y_test[mask])) * 100

    print(f"  MAE   : ₹{mae:>12,.2f}")
    print(f"  RMSE  : ₹{rmse:>12,.2f}")
    print(f"  R²    :   {r2:>10.6f}")
    print(f"  MAPE  :   {mape:>10.2f}%")

    all_results[name] = {"MAE": mae, "RMSE": rmse, "R2": r2, "MAPE": mape}
    trained[name]     = (model, use_scaled)


# ─────────────────────────────────────────────────────────────
# STEP 9 — SELECT BEST MODEL
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 9 — Selecting Best Model")
print("="*62)

print(f"\n  {'Model':<22} {'R²':>10} {'RMSE':>14} {'MAPE':>10}")
print("  " + "-"*58)
for name, metrics in all_results.items():
    print(f"  {name:<22} {metrics['R2']:>10.4f} ₹{metrics['RMSE']:>12,.2f} {metrics['MAPE']:>9.2f}%")

best_name = max(all_results, key=lambda n: (all_results[n]["R2"], -all_results[n]["RMSE"]))
best_model, best_uses_scaling = trained[best_name]
best_metrics = all_results[best_name]

print(f"\n  ✓ Winner : {best_name}")
print(f"    R²     : {best_metrics['R2']:.4f}")
print(f"    RMSE   : ₹{best_metrics['RMSE']:,.2f}")
print(f"    MAPE   : {best_metrics['MAPE']:.2f}%")


# ─────────────────────────────────────────────────────────────
# STEP 10 — FEATURE IMPORTANCE  (tree-based models only)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print(f"  STEP 10 — Feature Importance  ({best_name})")
print("="*62)

if hasattr(best_model, "feature_importances_"):
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
else:
    print("  (Feature importances not available for Linear Regression)")


# ─────────────────────────────────────────────────────────────
# STEP 11 — SAVE BEST MODEL ONLY  (single .pkl)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*62)
print("  STEP 11 — Saving Best Model  (crop_price_model.pkl)")
print("="*62)

best_bundle = {
    "model":           best_model,
    "model_name":      best_name,
    "uses_scaling":    best_uses_scaling,
    "scaler":          scaler,
    "encoders":        encoders,
    "feature_columns": feature_columns,
    "metrics":         best_metrics,
}

bundle_path = os.path.join(MODEL_DIR, "crop_price_model.pkl")
joblib.dump(best_bundle, bundle_path)
print(f"  ✓ Saved → {bundle_path}")

all_results["best_model"] = best_name
results_path = os.path.join(RESULTS_DIR, "price_prediction_results.json")
with open(results_path, "w") as f:
    json.dump(all_results, f, indent=2, default=str)
print(f"  ✓ Results → {results_path}")


# ─────────────────────────────────────────────────────────────
# HOW TO LOAD AT INFERENCE TIME
# ─────────────────────────────────────────────────────────────
"""
import joblib, pandas as pd

bundle          = joblib.load("models/crop_price_model.pkl")
model           = bundle["model"]
scaler          = bundle["scaler"]
encoders        = bundle["encoders"]
feature_columns = bundle["feature_columns"]
uses_scaling    = bundle["uses_scaling"]

row = {
    "State": "Maharashtra", "District Name": "Pune",
    "Market Name": "Pune", "Commodity": "Onion",
    "Variety": "Local", "Grade": "FAQ",
    "Year": 2025, "Month": 6, "Day": 15, "DayOfWeek": 6,
    "Commodity_Freq": 50000, "Market_Freq": 20000, "District_Freq": 15000,
}

input_df = pd.DataFrame([row])
for col in ["State", "District Name", "Market Name", "Commodity", "Variety", "Grade"]:
    enc = encoders[col]
    input_df[col] = enc.transform([row[col]])[0] if row[col] in enc.classes_ else 0

input_df = input_df[feature_columns]
if uses_scaling:
    input_df = scaler.transform(input_df)

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