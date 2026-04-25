"""
USAGE:
    pip install pandas numpy scikit-learn xgboost joblib
    python Crop_Price_Classification.py
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
from sklearn.metrics          import (
    classification_report, confusion_matrix, accuracy_score
)
from sklearn.linear_model     import LogisticRegression
from sklearn.tree             import DecisionTreeClassifier
from sklearn.ensemble         import RandomForestClassifier
from xgboost                  import XGBClassifier


# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
DATA_PATH   = "merged_output.csv"
MODEL_DIR   = "models"
RESULTS_DIR = "results"
RANDOM_SEED = 42

LEAKAGE_COLUMNS = [
    "Min Price (Rs./Quintal)",
    "Max Price (Rs./Quintal)",
]
TARGET_COL = "Modal Price (Rs./Quintal)"

CATEGORICAL_COLS = [
    "State", "District Name", "Market Name",
    "Commodity", "Variety", "Grade",
]

os.makedirs(MODEL_DIR,   exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# STEP 1 — LOAD DATA
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 1 — Loading Data")
print("="*60)

df = pd.read_csv(DATA_PATH)
print(f"  Loaded  : {len(df):,} rows × {df.shape[1]} columns")
print(f"  Columns : {df.columns.tolist()}")


# ─────────────────────────────────────────────────────────────
# STEP 2 — PREPROCESSING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 2 — Preprocessing")
print("="*60)

df.drop(columns=["Sl no."], errors="ignore", inplace=True)

df["Price Date"] = pd.to_datetime(
    df["Price Date"],
    format="%A, %d %B, %Y",
    errors="coerce",
)
nat_count = df["Price Date"].isna().sum()
print(f"  Date parse: {len(df) - nat_count:,} valid | {nat_count:,} NaT")

df["Year"]      = df["Price Date"].dt.year
df["Month"]     = df["Price Date"].dt.month
df["Day"]       = df["Price Date"].dt.day
df["DayOfWeek"] = df["Price Date"].dt.dayofweek

before = len(df)
df.dropna(inplace=True)
print(f"  Dropped {before - len(df):,} rows with NaN → {len(df):,} rows remain")

if len(df) == 0:
    raise RuntimeError(
        "DataFrame is empty after preprocessing. "
        "Check the date format and source CSV."
    )


# ─────────────────────────────────────────────────────────────
# STEP 3 — TARGET CREATION
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 3 — Target Creation")
print("="*60)

df["Price_Class"], bins = pd.qcut(
    df[TARGET_COL],
    q=3,
    labels=["Low", "Medium", "High"],
    retbins=True,
)
print(f"  Quantile boundaries : ₹{bins[0]:,.0f} | ₹{bins[1]:,.0f} | ₹{bins[2]:,.0f} | ₹{bins[3]:,.0f}")
print(f"  Class distribution  :\n{df['Price_Class'].value_counts().to_string()}")


# ─────────────────────────────────────────────────────────────
# STEP 4 — FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 4 — Feature Engineering")
print("="*60)

print(f"  Dropping leakage columns : {LEAKAGE_COLUMNS}")
df.drop(columns=LEAKAGE_COLUMNS, inplace=True)

df["Commodity_Freq"] = df["Commodity"].map(df["Commodity"].value_counts())
df["Market_Freq"]    = df["Market Name"].map(df["Market Name"].value_counts())


# ─────────────────────────────────────────────────────────────
# STEP 5 — ENCODING
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 5 — Encoding Categorical Features")
print("="*60)

encoders = {}
for col in CATEGORICAL_COLS:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le
    print(f"  Encoded {col:<20} → {le.classes_.shape[0]} classes")

target_encoder = LabelEncoder()
df["Price_Class"] = target_encoder.fit_transform(df["Price_Class"])
print(f"\n  Target classes: {list(target_encoder.classes_)}")


# ─────────────────────────────────────────────────────────────
# STEP 6 — FEATURES & TARGET SPLIT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 6 — Feature / Target Split")
print("="*60)

DROP_COLS = [TARGET_COL, "Price Date", "Price_Class"]
feature_columns = [c for c in df.columns if c not in DROP_COLS]

X = df[feature_columns]
y = df["Price_Class"]

print(f"  Feature count : {len(feature_columns)}")
print(f"  Features      : {feature_columns}")
print(f"  Target dist   : {dict(pd.Series(y).value_counts())}")


# ─────────────────────────────────────────────────────────────
# STEP 7 — TRAIN / TEST SPLIT
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 7 — Train / Test Split")
print("="*60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=RANDOM_SEED,
    stratify=y,
)
print(f"  Train : {len(X_train):,}  |  Test : {len(X_test):,}")


# ─────────────────────────────────────────────────────────────
# STEP 8 — SCALING  (only for Logistic Regression)
# ─────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)


# ─────────────────────────────────────────────────────────────
# STEP 9 — MODEL TRAINING & EVALUATION
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 9 — Model Training & Evaluation")
print("="*60)

models = [
    ("Logistic Regression", LogisticRegression(max_iter=1000, random_state=RANDOM_SEED),  True),
    ("Decision Tree",       DecisionTreeClassifier(random_state=RANDOM_SEED),              False),
    ("Random Forest",       RandomForestClassifier(n_estimators=200, n_jobs=-1,
                                                    random_state=RANDOM_SEED),             False),
    ("XGBoost",             XGBClassifier(n_estimators=200, eval_metric="mlogloss",
                                           random_state=RANDOM_SEED, n_jobs=-1),           False),
]

all_results = {}
trained     = {}   # name → (fitted_model, uses_scaling)

for name, model, use_scaled in models:
    print(f"\n  ── {name} ──")

    Xtr = X_train_scaled if use_scaled else X_train
    Xte = X_test_scaled  if use_scaled else X_test

    model.fit(Xtr, y_train)
    preds = model.predict(Xte)

    acc    = accuracy_score(y_test, preds)
    report = classification_report(
        y_test, preds,
        target_names=target_encoder.classes_,
        output_dict=True,
    )
    print(f"  Accuracy : {acc:.4f}")
    print(classification_report(y_test, preds, target_names=target_encoder.classes_))

    all_results[name] = {"accuracy": acc, "classification_report": report}
    trained[name]     = (model, use_scaled)


# ─────────────────────────────────────────────────────────────
# STEP 10 — SELECT BEST MODEL
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 10 — Selecting Best Model")
print("="*60)

print(f"\n  {'Model':<22} {'Accuracy':>10}")
print("  " + "-"*34)
for name, res in all_results.items():
    print(f"  {name:<22} {res['accuracy']:>10.4f}")

best_name = max(all_results, key=lambda n: all_results[n]["accuracy"])
best_model, best_uses_scaling = trained[best_name]
best_acc = all_results[best_name]["accuracy"]

print(f"\n  ✓ Winner  : {best_name}")
print(f"    Accuracy: {best_acc:.4f}  ({best_acc*100:.2f}%)")


# ─────────────────────────────────────────────────────────────
# STEP 11 — CONFUSION MATRIX  (best model)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  STEP 11 — Confusion Matrix  ({best_name})")
print("="*60)

Xte_best   = X_test_scaled if best_uses_scaling else X_test
best_preds = best_model.predict(Xte_best)

cm = confusion_matrix(y_test, best_preds)
cm_df = pd.DataFrame(
    cm,
    index=[f"True_{c}"  for c in target_encoder.classes_],
    columns=[f"Pred_{c}" for c in target_encoder.classes_],
)
print(cm_df.to_string())


# ─────────────────────────────────────────────────────────────
# STEP 12 — FEATURE IMPORTANCE  (tree-based models only)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  STEP 12 — Feature Importance  ({best_name})")
print("="*60)

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
    print("  (Feature importances not available for this model type)")


# ─────────────────────────────────────────────────────────────
# STEP 13 — SAVE BEST MODEL ONLY  (single .pkl)
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  STEP 13 — Saving Best Model")
print("="*60)

best_bundle = {
    "model":           best_model,
    "model_name":      best_name,
    "uses_scaling":    best_uses_scaling,
    "scaler":          scaler,
    "encoders":        encoders,
    "target_encoder":  target_encoder,
    "feature_columns": feature_columns,
    "accuracy":        best_acc,
}

bundle_path = os.path.join(MODEL_DIR, "crop_price_classification.pkl")
joblib.dump(best_bundle, bundle_path)
print(f"  ✓ Saved → {bundle_path}")

all_results["best_model"] = best_name
results_path = os.path.join(RESULTS_DIR, "model_results.json")
with open(results_path, "w") as f:
    json.dump(all_results, f, indent=2, default=str)
print(f"  ✓ Results      → {results_path}")

cm_df.to_csv(os.path.join(RESULTS_DIR, "confusion_matrix.csv"))
print(f"  ✓ Conf. matrix → {RESULTS_DIR}/confusion_matrix.csv")


# ─────────────────────────────────────────────────────────────
# HOW TO LOAD AT INFERENCE TIME
# ─────────────────────────────────────────────────────────────
"""
import joblib, pandas as pd

bundle          = joblib.load("models/crop_price_classification.pkl")
model           = bundle["model"]
scaler          = bundle["scaler"]
encoders        = bundle["encoders"]
target_encoder  = bundle["target_encoder"]
feature_columns = bundle["feature_columns"]
uses_scaling    = bundle["uses_scaling"]

X_new = pd.DataFrame([...], columns=feature_columns)
if uses_scaling:
    X_new = scaler.transform(X_new)

pred_label = target_encoder.inverse_transform(model.predict(X_new))
print(pred_label)   # → ['Low'] / ['Medium'] / ['High']
"""


# ─────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  ✅  PIPELINE COMPLETE")
print("="*60)
print(f"  Best Model    : {best_name}")
print(f"  Test Accuracy : {best_acc:.4f}  ({best_acc*100:.2f}%)")
print(f"  Saved to      : {bundle_path}")
print("="*60 + "\n")