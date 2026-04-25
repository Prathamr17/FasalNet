"""
train_spoilage_model.py
========================
Run this script once to train and save the XGBoost spoilage model bundle.

Usage:
    python backend/ml/train_spoilage_model.py

Expects spoilage_risk_synthetic_2000.csv in the same directory or pass --csv path.
Saves spoilage_xgb_bundle.joblib to backend/ml/model_cache/
"""

import argparse
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
import xgboost as xgb

OUTPUT_PATH = Path(__file__).parent / "model_cache" / "spoilage_xgb_bundle.joblib"
DEFAULT_CSV = Path(__file__).parent / "spoilage_risk_synthetic_2000.csv"


def make_preprocessor(num_col, cat_col):
    """Create a fresh ColumnTransformer — called separately per pipeline."""
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="mean")),
        ("scaler",  StandardScaler()),
    ])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        # sparse_output=False → dense array, easier to debug
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", numeric_pipeline, num_col),
        ("cat", categorical_pipeline, cat_col),
    ])


def train(csv_path: Path):
    print(f"Loading data from {csv_path} …")
    data = pd.read_csv(csv_path)
    print(f"  Shape: {data.shape}")

    # ── Feature columns (must match CSV headers exactly) ──────────────────
    num_col = [
        "harvest_age_hrs", "distance_km", "ambient_temp_c",
        "humidity_pct",    "rainfall_48h_mm", "travel_time_hrs", "season_month",
    ]
    # FIX: crop_type added — it was present in CSV but missing from notebook's cat_col
    cat_col = ["crop_type", "region", "farmer_experience", "bin_quality", "vehicle_type"]
    feature_cols = num_col + cat_col

    # ── Label encoding (BEFORE split to fit on full vocab) ────────────────
    # FIX: store encoder so we can decode predictions in the API
    label_encoder = LabelEncoder()
    data["risk_label_enc"] = label_encoder.fit_transform(data["risk_label"])
    print(f"  Label mapping: {list(enumerate(label_encoder.classes_))}")
    # e.g. [(0, 'CRITICAL'), (1, 'RISKY'), (2, 'SAFE')]

    X   = data[feature_cols]
    y_reg = data["risk_score"]
    y_cls = data["risk_label_enc"]

    # ── Split ──────────────────────────────────────────────────────────────
    x_train, x_test, yr_train, yr_test = train_test_split(
        X, y_reg, test_size=0.2, random_state=42
    )
    _, _, yc_train, yc_test = train_test_split(
        X, y_cls, test_size=0.2, random_state=42
    )

    # ── Regression Pipeline ───────────────────────────────────────────────
    # FIX: make_preprocessor() called separately → each pipeline gets its own
    # ColumnTransformer instance so they don't share fitted state
    reg_pipeline = Pipeline([
        ("preprocessor", make_preprocessor(num_col, cat_col)),
        ("model", xgb.XGBRegressor(
            n_estimators=200, learning_rate=0.05,
            max_depth=6, random_state=42,
        )),
    ])
    reg_pipeline.fit(x_train, yr_train)
    yr_pred = reg_pipeline.predict(x_test)
    print(f"\nRegression MAE: {mean_absolute_error(yr_test, yr_pred):.3f}")

    # ── Classification Pipeline ───────────────────────────────────────────
    cls_pipeline = Pipeline([
        ("preprocessor", make_preprocessor(num_col, cat_col)),
        ("model", xgb.XGBClassifier(
            n_estimators=200, learning_rate=0.05,
            max_depth=6, random_state=42, eval_metric="mlogloss",
        )),
    ])
    cls_pipeline.fit(x_train, yc_train)
    yc_pred = cls_pipeline.predict(x_test)
    print("\nClassification Report:")
    # FIX: target_names so report shows CRITICAL/RISKY/SAFE instead of 0/1/2
    print(classification_report(yc_test, yc_pred, target_names=label_encoder.classes_))

    # ── Collect valid categorical values from training data ───────────────
    cat_values = {col: sorted(data[col].dropna().unique().tolist()) for col in cat_col}

    # ── Save bundle ───────────────────────────────────────────────────────
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "reg_pipeline":   reg_pipeline,
        "cls_pipeline":   cls_pipeline,
        "label_encoder":  label_encoder,
        "label_classes":  list(label_encoder.classes_),
        "feature_cols":   feature_cols,
        "num_col":        num_col,
        "cat_col":        cat_col,
        "cat_values":     cat_values,
    }
    joblib.dump(bundle, OUTPUT_PATH)
    print(f"\nModel bundle saved → {OUTPUT_PATH}")
    return bundle


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"ERROR: CSV not found at {args.csv}", file=sys.stderr)
        sys.exit(1)

    train(args.csv)