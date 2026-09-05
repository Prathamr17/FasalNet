# FasalNet v9 — ML Model Setup

## Overview
Three ML models are used:
| Model file | Purpose | Output |
|---|---|---|
| `crop_price_model.pkl` | Price Prediction | ₹ per Quintal (regression) |
| `crop_price_classification.pkl` | Price Category | Low / Medium / High |
| `market_recommendation.pkl` | Market Finder | Best market by predicted price |

---

## Option A — Load from Google Drive (recommended for production)

1. Train models using the `.py` scripts in this folder with your `merged_output.csv` data.
2. Upload the 3 `.pkl` files to the Google Drive folder:
   `https://drive.google.com/drive/folders/18u0uOj2TzhVUsZO9a0GxRRKaNnYxTXA8`
3. Get each file's Drive ID from the share URL:
   `https://drive.google.com/file/d/FILE_ID_HERE/view`
4. Set in `backend/.env`:
   ```
   GDRIVE_PRICE_MODEL_ID=<id of crop_price_model.pkl>
   GDRIVE_CLASSIFY_MODEL_ID=<id of crop_price_classification.pkl>
   GDRIVE_MARKET_MODEL_ID=<id of market_recommendation.pkl>
   ```
5. Make sure the files are publicly readable ("Anyone with the link can view").
6. On first API call, models auto-download to `backend/ml/model_cache/` and load into memory.

---

## Option B — Local files (development)

Place the `.pkl` files directly in `backend/ml/model_cache/`:
```
backend/ml/model_cache/
  crop_price_model.pkl
  crop_price_classification.pkl
  market_recommendation.pkl
```
The backend will use them without downloading anything.

---

## Training the Models

```bash
cd backend/ml
pip install pandas numpy scikit-learn xgboost joblib
# Place merged_output.csv in this folder, then:
python Price_Prediction_Model.py
python Crop_Price_Classification.py
python Market_Recommendation.py
# .pkl files appear in backend/ml/models/
# Copy them to model_cache/ or upload to Drive
cp models/*.pkl model_cache/
```

---

## API Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| GET | `/api/predict/metadata` | Public | Dropdown values |
| POST | `/api/predict/price` | JWT | Price regression |
| POST | `/api/predict/price-class` | JWT | Price classification |
| POST | `/api/predict/market` | JWT | Market recommendation |
