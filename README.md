

```
                                    ███████╗ █████╗ ███████╗ █████╗ ██╗     ███╗   ██╗███████╗████████╗
                                    ██╔════╝██╔══██╗██╔════╝██╔══██╗██║     ████╗  ██║██╔════╝╚══██╔══╝
                                    █████╗  ███████║███████╗███████║██║     ██╔██╗ ██║█████╗     ██║   
                                    ██╔══╝  ██╔══██║╚════██║██╔══██║██║     ██║╚██╗██║██╔══╝     ██║   
                                    ██║     ██║  ██║███████║██║  ██║███████╗██║ ╚████║███████╗   ██║   
                                    ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝   ╚═╝
```

<div align="center">

**Cold Storage Booking Platform for Rural India**

[![Status](https://img.shields.io/badge/Status-MVP%20v1.0-brightgreen)]()
[![Backend](https://img.shields.io/badge/Backend-Flask%20v3.0-blue)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2018-61DAFB)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Neon-336791)]()
[![ML](https://img.shields.io/badge/ML-XGBoost%20%7C%20scikit--learn-orange)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

*Connecting smallholder farmers to cold storage infrastructure — reducing post-harvest losses across Maharashtra and rural India.*

</div>

---

## Table of Contents

- [Problem Statement](#-problem-statement)
- [What FasalNet Does](#-what-fasalnet-does)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Core User Flows](#-core-user-flows)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [ML Models](#-ml-models)
- [Authentication Strategy](#-authentication-strategy)
- [Race Condition Prevention](#-race-condition-prevention)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Local Setup](#-local-setup)
- [Feature Roadmap](#-feature-roadmap)
- [Success Metrics](#-success-metrics)

---

## 🌾 Problem Statement

Smallholder farmers in rural India lose **20–40% of produce** post-harvest due to lack of refrigeration access. Without cold storage:

- Farmers are forced to sell immediately at low prices — no storage means no bargaining power
- Perishable crops (tomato, mango, grapes) spoil before they can reach better markets
- Cold storage operators struggle with low fill rates and manual, inefficient booking processes
- There is zero transparency on storage availability, capacity, or pricing

**FasalNet solves this** by acting as a marketplace that connects farmers to nearby cold storage facilities — with map-based discovery, AI-driven spoilage risk assessment, booking management, and payment tracking.

---

## ✅ What FasalNet Does

| Role | Capability |
|---|---|
| **Farmer** | Discover nearby cold storages on a map, assess spoilage risk via ML, book storage, pay, and track bookings |
| **Operator** | Manage facility details, approve/reject incoming bookings, monitor capacity and payment status |
| **Admin** | Platform-wide management (future milestone) |
| **Customer** | Browse fresh produce stored at verified facilities (future marketplace) |

---

## 🏗 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Mobile                          │
│              React 18 SPA  (Vercel CDN)                     │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│    │ Discover │ │Bookings  │ │Operator  │ │ Market   │    │
│    │+ Map     │ │ Page     │ │Dashboard │ │ Intel    │    │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / JWT
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Flask API  (Render / Railway)                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  auth    │  │ booking  │  │ operator │  │  farmer   │  │
│  │  otp     │  │ payment  │  │ settings │  │  market   │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  ml.py   │  │ delivery │  │ customer │                 │
│  │ (XGBoost)│  │  routes  │  │  routes  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│         APScheduler — daily sync @ 07:00 IST               │
└────────────────────────┬────────────────────────────────────┘
                         │ psycopg2 / SQL
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          PostgreSQL (Neon — Serverless)                      │
│   users · storages · bookings · payments · crops            │
│   products · orders · notifications · otp_tokens            │
│   Row-level locks on booking inserts (no race conditions)   │
└─────────────────────────────────────────────────────────────┘

External Services:
  ├─ SMTP / Gmail   → Email OTP + Notifications
  ├─ Leaflet.js     → OpenStreetMap (no API key needed)
  └─ (Future) Razorpay → Real payment gateway
```

### Blueprint Module Map

```
app.py
  ├── auth_bp        → /api/auth/*           (login, signup, password reset)
  ├── otp_bp         → /api/otp/*            (send OTP, verify OTP)
  ├── farmer_bp      → /api/storages, /predict-risk
  ├── booking_bp     → /api/book, /my-bookings, /pay, /cancel
  ├── operator_bp    → /api/operator/*       (dashboard, approve, reject)
  ├── customer_bp    → /api/customer/*       (marketplace, orders)
  ├── delivery_bp    → /api/delivery/*       (delivery management)
  ├── settings_bp    → /api/settings/*       (user profile)
  ├── ml_bp          → /api/predict/*        (price, market rec, spoilage)
  └── market_bp      → /api/market/*         (ARIMA market intelligence - v10)
```

---

## 🛠 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 18.3.1 | SPA UI framework |
| **Frontend** | React Router | 6.23.1 | Client-side routing |
| **Frontend** | Leaflet / react-leaflet | 1.9.4 / 4.2.1 | Map rendering (OSM, no API key) |
| **Frontend** | Axios | 1.7.2 | HTTP client with retry logic |
| **Frontend** | i18next / react-i18next | 23.11.5 / 14.1.2 | i18n — English, Marathi, Hindi |
| **Frontend** | TailwindCSS | 3.4.4 | Utility-first styling |
| **Frontend** | leaflet-routing-machine | 3.2.12 | Route planning on map |
| **Backend** | Flask | 3.0.3 | Python web framework |
| **Backend** | flask-jwt-extended | 4.6.0 | JWT auth (access + refresh tokens) |
| **Backend** | flask-cors | 4.0.1 | Cross-origin request handling |
| **Backend** | psycopg2-binary | 2.9.9 | PostgreSQL driver (SQL injection-safe) |
| **Backend** | APScheduler | latest | Daily market data sync at 07:00 IST |
| **Backend** | gunicorn | 22.0.0 | Production WSGI server |
| **ML** | XGBoost | 2.0+ | Spoilage risk prediction |
| **ML** | scikit-learn | 1.3+ | Crop price & market recommendation |
| **ML** | statsmodels | latest | ARIMA-based market intelligence |
| **ML** | joblib | 1.3+ | Model serialization / loading |
| **Database** | PostgreSQL (Neon) | Serverless | ACID-compliant, auto-scaling |
| **Email** | SMTP / Gmail | — | OTP delivery + booking notifications |
| **Deployment** | Vercel | — | Frontend CDN + edge |
| **Deployment** | Render / Railway | — | Backend with auto-restart |

---

## 📁 Project Structure

```
FasalNet/
│
├── backend/                        # Flask API (v10)
│   ├── app.py                      # Application factory, blueprint registration
│   ├── settings.py                 # Central config (reads from .env)
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Container definition
│   ├── runtime.txt                 # Python version pin
│   ├── seed_demo.py                # Demo data seeder
│   │
│   ├── routes/                     # Blueprint route handlers
│   │   ├── auth.py                 # Login, signup, password reset
│   │   ├── otp.py                  # OTP send / verify
│   │   ├── farmer.py               # Storage discovery, spoilage risk
│   │   ├── booking.py              # Create, pay, cancel bookings
│   │   ├── operator.py             # Approve/reject, capacity dashboard
│   │   ├── customer.py             # Marketplace, product orders
│   │   ├── delivery.py             # Delivery management
│   │   ├── settings.py             # User profile management
│   │   ├── ml.py                   # ML prediction endpoints
│   │   └── market_data.py          # ARIMA market intelligence (v10)
│   │
│   ├── utils/
│   │   ├── db.py                   # PostgreSQL connection pool
│   │   ├── auth_helpers.py         # JWT validation helpers
│   │   ├── otp_utils.py            # OTP generation + email sending
│   │   ├── risk_engine.py          # Spoilage risk rule engine
│   │   └── recommendation.py      # Market recommendation utils
│   │
│   ├── ml/
│   │   ├── spoilage_predictor.py   # XGBoost spoilage risk predictor
│   │   ├── train_spoilage_model.py # Model training script
│   │   ├── Price_Prediction_Model.py
│   │   ├── Crop_Price_Classification.py
│   │   ├── Market_Recommendation.py
│   │   ├── spoilage_risk_synthetic_2000.csv  # Training data
│   │   ├── README_ML_SETUP.md
│   │   └── model_cache/            # Serialized model files (.pkl, .joblib)
│   │       ├── crop_price_model.pkl
│   │       ├── market_recommendation.pkl
│   │       └── spoilage_xgb_bundle.joblib
│   │
│   ├── models/
│   │   └── otp_model.py            # OTP database model
│   │
│   ├── helpers/
│   │   └── password_reset_helper.py
│   │
│   ├── config/
│   │   └── email_config.py         # SMTP configuration
│   │
│   └── database/
│       ├── schema.sql              # Full PostgreSQL schema (v4)
│       ├── seed_storages_extended.sql  # Demo cold storage seed data
│       ├── alter_existing.sql      # Schema patches
│       ├── migration_otp.sql       # OTP table migration
│       ├── v7_delivery_migration.sql
│       └── v8_payment_migration.sql
│
└── frontend/                       # React SPA (v8 / v10 routes)
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js                  # Route definitions + PrivateRoute guard
        ├── index.js
        ├── index.css               # Global styles + CSS variables
        │
        ├── pages/
        │   ├── HomePage.js
        │   ├── LoginPage.js
        │   ├── SignupPage.js
        │   ├── ForgotPasswordPage.js
        │   ├── DiscoverPage.js         # Storage map + spoilage risk entry
        │   ├── BookingsPage.js         # Farmer's active bookings
        │   ├── OperatorPage.js         # Operator approval dashboard
        │   ├── farmer/
        │   │   ├── FarmerMarketIntelligencePage.jsx  # ARIMA + live market data (v10)
        │   │   ├── MLPredictionsPage.js              # Price + Market recommendation
        │   │   └── FarmerOrders.js
        │   ├── customer/
        │   │   ├── MarketplacePage.js
        │   │   ├── CustomerOrders.js
        │   │   ├── CustomerMapPage.js
        │   │   └── ProductDetail.js
        │   ├── delivery/
        │   │   └── DeliveryBoyPage.js
        │   └── settings/
        │       └── SettingsPage.js
        │
        ├── components/
        │   ├── common/
        │   │   ├── Navbar.js
        │   │   └── UI.js
        │   ├── booking/
        │   │   └── BookingModal.js
        │   ├── farmer/
        │   │   ├── FarmerNav.jsx
        │   │   └── RiskAssessor.js
        │   ├── map/
        │   │   ├── StorageMap.js       # Leaflet map with markers
        │   │   └── StorageList.js
        │   └── operator/
        │       ├── BookingCard.js
        │       └── StorageUpdateForm.js
        │
        ├── context/
        │   ├── AuthContext.js          # user, token, login(), logout()
        │   └── ThemeContext.js         # isDark, toggleTheme()
        │
        ├── services/
        │   └── api.js                  # Axios instance + all API calls
        │
        └── i18n/
            ├── index.js
            ├── en.json                 # English translations
            ├── mr.json                 # Marathi translations
            └── hi.json                 # Hindi translations
```

---

## 🔄 Core User Flows

### Farmer Flow: Discover → Book → Pay → Track

```
[Farmer opens app]
        │
        ▼
  [Login / Signup]
  Phone + Email OTP → JWT issued
        │
        ▼
  [/discover — DiscoverPage]
  Leaflet map loads nearby cold storages
  Filter by district / temp range / availability
        │
        ▼
  [Select a storage]
  Enter: crop type, quantity (kg), harvest age, pickup date, duration
  → POST /api/predict/spoilage → SAFE / RISKY / CRITICAL banner shown
        │
        ▼
  [Confirm Booking]
  POST /api/book
  ├── Has operator? → status = 'pending' → operator notified
  └── Unmanaged?   → status = 'confirmed' → auto-proceed to payment
        │
        ▼
  [Payment]
  POST /api/bookings/{id}/pay
  UPI simulation (MVP) / Razorpay (v1.1)
  → status = 'paid'  → farmer + operator notified via email
        │
        ▼
  [/bookings — BookingsPage]
  Track status, expiry, days remaining, operator contact
  Cancel option with refund policy display
```

### Operator Flow: Dashboard → Approve / Manage

```
[Operator logs in]
        │
        ▼
  [/operator — OperatorPage]
  GET /api/operator/dashboard
  View: pending bookings, capacity gauge, payment status
        │
        ├── [Approve Booking]
        │   POST /api/bookings/{id}/approve
        │   → Capacity deducted, farmer notified
        │
        └── [Reject Booking]
            POST /api/bookings/{id}/reject  (with reason)
            → Capacity released, farmer notified
```

### Market Intelligence Flow (v10)

```
[Farmer opens /market]
        │
        ▼
  FarmerMarketIntelligencePage
  GET /api/market/*  (ARIMA time-series data from Neon DB)
        │
        ▼
  View price trends, forecasts, best market recommendations
  APScheduler auto-syncs fresh data daily @ 07:00 IST
  Manual refresh: POST /api/market/refresh
```

---

## 🗃 Database Schema

PostgreSQL schema (defined in `backend/database/schema.sql`):

### Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | id, name, phone, email, role (farmer/operator/customer/admin/fpo), district, state | All platform users |
| `storages` | id, operator_id, name, lat, lon, total_capacity_kg, available_capacity_kg, price_per_kg_per_day, temp_min/max, status, verified | Cold storage facilities |
| `crops` | id, name, shelf_life_hrs, max_safe_temp_c, optimal_humidity_pct, risk_coefficient | Crop metadata for risk engine |
| `bookings` | id, farmer_id, storage_id, crop_type, quantity_kg, harvest_age_days, risk, pickup_date, duration_days, total_price, status, operator_notes | Farmer ↔ storage reservations |
| `products` | id, farmer_id, storage_id, name, price_per_kg, quantity_kg, available_kg, risk_level | Produce listings (marketplace) |
| `orders` | id, customer_id, product_id, storage_id, quantity_kg, total_amount, status | Customer purchase orders |
| `payments` | id, order_id, customer_id, amount, method, status, txn_id, paid_at | Payment records |
| `notifications` | id, user_id, title, message, type, is_read | In-app notifications |

### ENUMs

```sql
user_role:      farmer | operator | customer | admin | fpo
storage_status: available | full | maintenance | inactive
booking_status: pending | confirmed | rejected | expired | cancelled
risk_level:     SAFE | RISKY | CRITICAL
payment_status: pending | paid | failed | refunded
```

### Indexing Strategy

```sql
CREATE INDEX idx_storages_district         ON storages(district);
CREATE INDEX idx_bookings_farmer           ON bookings(farmer_id, status);
CREATE INDEX idx_bookings_storage          ON bookings(storage_id, status);
CREATE INDEX idx_orders_customer           ON orders(customer_id, status);
CREATE INDEX idx_payments_order            ON payments(order_id);
CREATE INDEX idx_notifications_user        ON notifications(user_id, is_read);
```

---

## 📡 API Reference

**Base URL:** `https://api.fasalnet.io/api`

All endpoints (except auth) require `Authorization: Bearer <JWT_TOKEN>`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/otp/send` | Send 6-digit OTP to email |
| POST | `/api/otp/verify` | Verify OTP → issue `access_token` + `refresh_token` |
| POST | `/api/auth/signup` | Register new user (role: farmer / operator) |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/forgot-password` | Initiate password reset |

### Farmer

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/storages` | List storages filtered by `district`, `availability`, `temp_range` |
| POST | `/api/book` | Create booking. Body: `{storage_id, crop_type, quantity_kg, harvest_age_days, pickup_date, duration_days}` |
| GET | `/api/my-bookings` | Farmer's paginated booking list |
| POST | `/api/bookings/{id}/pay` | Mark booking paid (UPI simulation) |
| DELETE | `/api/bookings/{id}/cancel` | Cancel booking + release capacity |

### Operator

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/operator/dashboard` | Pending bookings, capacity status, payments |
| POST | `/api/bookings/{id}/approve` | Approve booking (deducts capacity) |
| POST | `/api/bookings/{id}/reject` | Reject with notes (returns capacity) |

### ML Predictions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict/spoilage` | Input: `{crop_type, harvest_age_days}` → `SAFE / RISKY / CRITICAL` |
| POST | `/api/predict/price` | Crop price regression → ₹ per Quintal |
| POST | `/api/predict/price-class` | Price classification → Low / Medium / High |
| POST | `/api/predict/market` | Best market recommendation by predicted price |
| GET  | `/api/predict/metadata` | Available crops + market dropdown values |

### Market Intelligence (v10)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/market/*` | ARIMA time-series price data from Neon DB |
| POST | `/api/market/refresh` | Manually trigger market data sync |

### Error Response Format

```json
{
  "error": "Storage capacity insufficient",
  "code": "CAPACITY_FULL",
  "status": 400,
  "timestamp": "2026-05-01T10:30:00Z"
}
```

### Pagination

```
GET /api/storages?page=1&limit=20
→ { "data": [...], "page": 1, "limit": 20, "total": 150, "pages": 8 }
```

---

## 🤖 ML Models

Three models power FasalNet's intelligence layer:

### 1. Spoilage Risk Engine (`utils/risk_engine.py` + `ml/spoilage_predictor.py`)

Rule-based engine backed by an XGBoost model (`spoilage_xgb_bundle.joblib`). Calculates risk from crop type, harvest age, weather temperature, and travel delay.

**Supported crops and thresholds (days from harvest):**

| Crop | RISKY after | CRITICAL after | Temp Sensitive |
|---|---|---|---|
| Tomato | 3 days | 5 days | ✅ |
| Leafy Greens / Spinach | 2 days | 3 days | ✅ |
| Mango | 5 days | 8 days | ✅ |
| Banana | 4 days | 6 days | ✅ |
| Grapes | 7 days | 14 days | ✅ |
| Cauliflower | 4 days | 7 days | ✅ |
| Onion | 30 days | 60 days | ❌ |
| Potato | 20 days | 45 days | ❌ |
| Rice | 30 days | 60 days | ❌ |
| Wheat | 45 days | 90 days | ❌ |
| Maize | 20 days | 40 days | ❌ |

**Output:**
```json
{
  "risk_level": "RISKY",
  "risk_score": 62,
  "days_until_risky": 0,
  "days_until_critical": 2,
  "temp_sensitive": true,
  "recommendations": ["Book cold storage within 2 days..."]
}
```

### 2. Crop Price Prediction (`ml/Price_Prediction_Model.py`)
- **Model:** Regression (`crop_price_model.pkl`)
- **Output:** Predicted price in ₹ per Quintal

### 3. Market Recommendation (`ml/Market_Recommendation.py`)
- **Model:** Classification (`market_recommendation.pkl`)
- **Output:** Best market to sell based on crop + season

### Training Models Locally

```bash
cd backend/ml
pip install pandas numpy scikit-learn xgboost joblib statsmodels

# Place merged_output.csv in this folder, then:
python Price_Prediction_Model.py
python Crop_Price_Classification.py
python Market_Recommendation.py
python train_spoilage_model.py

# Copy trained models to cache
cp models/*.pkl model_cache/
```

### Model Loading (Google Drive — Production)

Set in `.env`:
```
GDRIVE_PRICE_MODEL_ID=<drive file id>
GDRIVE_CLASSIFY_MODEL_ID=<drive file id>
GDRIVE_MARKET_MODEL_ID=<drive file id>
```

Models auto-download to `ml/model_cache/` on first API call.

---

## 🔐 Authentication Strategy

FasalNet uses a **passwordless OTP flow** — no passwords are stored.

```
Step 1: POST /api/otp/send  { email }
        → 6-digit OTP generated, valid for 5 min
        → Sent via SMTP (Gmail / SendGrid)

Step 2: POST /api/otp/verify  { email, otp }
        → OTP validated, user created/updated
        → Returns: { access_token, refresh_token, user }

Step 3: Client stores:
        → access_token  in memory (15 min expiry — configurable via JWT_ACCESS_TOKEN_EXPIRES)
        → refresh_token in httpOnly cookie (7 days)

Step 4: All API calls:
        Authorization: Bearer <access_token>
```

### Token Details

| Token | Expiry | Storage |
|---|---|---|
| Access Token (JWT) | 24 hours (MVP) | In-memory / Authorization header |
| Refresh Token (JWT) | 7 days | httpOnly cookie |
| OTP | 5 minutes | Database (cleared after verify) |

### Rate Limiting

- Max 5 OTP requests per email per hour
- OTP resend cooldown: 60 seconds
- Max OTP verification attempts: 5

### CORS Allowlist (configured in `app.py`)

```python
origins = [
  re.compile(r"https://.*\.vercel\.app"),
  "https://fasal-net.vercel.app",
  "http://localhost:3000",
]
```

---

## ⚡ Race Condition Prevention

Concurrent bookings to the same storage are handled with **PostgreSQL row-level locking**:

```sql
BEGIN TRANSACTION;

SELECT available_capacity_kg
FROM storages
WHERE id = :storage_id
FOR UPDATE;               -- 🔒 Lock this row

IF capacity >= booking_qty THEN
  UPDATE storages
    SET available_capacity_kg = available_capacity_kg - :booking_qty;
  INSERT INTO bookings (...);
  COMMIT;
ELSE
  ROLLBACK;
  RAISE ERROR 'CAPACITY_FULL';
END IF;
```

First writer wins. All concurrent losers get a `400 CAPACITY_FULL` response and are shown nearby alternatives.

---

## 🚀 Deployment

| Layer | Platform | Notes |
|---|---|---|
| **Frontend** | Vercel | Auto-deploy from `main`. CDN edge. Zero config. |
| **Backend** | Render / Railway | Auto-restart on crash. Set env vars in dashboard. |
| **Database** | Neon (PostgreSQL) | Serverless, auto-backup, connection pooling built-in. |
| **Email** | Gmail SMTP / SendGrid | OTP + booking notifications. |

### Pre-Production Checklist

```
[ ] Run database/schema.sql on Neon — verify all tables and indexes
[ ] Set all environment variables in Render/Railway dashboard
[ ] Deploy backend → test GET /health endpoint
[ ] Deploy frontend → verify API_BASE_URL points to production backend
[ ] Test OTP send → verify → login end-to-end
[ ] Test discover → book → pay complete flow
[ ] Confirm CORS: Vercel domain can call backend (no errors in console)
[ ] Enable HTTPS on both services (automatic on Vercel/Render)
[ ] Run Lighthouse audit — target score > 85
[ ] Set up error alerts in Render/Vercel dashboards
```

---

## ⚙️ Environment Variables

Create `backend/.env`:

```env
# App
SECRET_KEY=your-secret-key-here
FLASK_DEBUG=0

# Database (Neon)
DATABASE_URL=postgresql://user:pass@neon-host/fasalnet?sslmode=require

# JWT
JWT_SECRET_KEY=your-jwt-secret-here

# CORS
CORS_ORIGINS=https://fasal-net.vercel.app,http://localhost:3000

# Email (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=True
SENDER_EMAIL=noreply@fasalnet.io
SENDER_NAME=FasalNet

# OTP
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
MAX_OTP_ATTEMPTS=5
RESEND_COOLDOWN_SECONDS=60

# Redis (optional — for caching / rate limiting)
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=300

# ML Models (Google Drive IDs — optional)
GDRIVE_PRICE_MODEL_ID=
GDRIVE_CLASSIFY_MODEL_ID=
GDRIVE_MARKET_MODEL_ID=
```

---

## 💻 Local Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL (or a free [Neon](https://neon.tech) account)

### Backend

```bash
# Clone and navigate
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env           # Edit with your values

# Initialize database
psql $DATABASE_URL -f database/schema.sql
python seed_demo.py            # Load demo storages + crops

# Run development server
python app.py
# → API live at http://localhost:5000
# → Health check: GET http://localhost:5000/health
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# Start development server
npm start
# → App live at http://localhost:3000
```

### Running with Docker (Not in run yet, just for next stage)

```bash
cd backend
docker build -t fasalnet-api .
docker run -p 5000:5000 --env-file .env fasalnet-api
```

---

## 🗺 Feature Roadmap

### MVP v1.0 — Shipped ✅

- [x] Phone + Email OTP authentication (passwordless)
- [x] Cold storage discovery (map + list, Leaflet.js)
- [x] Spoilage risk assessment (rule engine + XGBoost)
- [x] Booking creation with capacity management
- [x] Race-condition-safe booking inserts (row-level locks)
- [x] Operator dashboard (approve / reject / capacity view)
- [x] Dummy UPI payment processor
- [x] Email notifications (booking status, OTP)
- [x] My Bookings tracking for farmers
- [x] Multi-language support (English, Marathi, Hindi)
- [x] ML price prediction + market recommendation
- [x] ARIMA-based market intelligence (v10)
- [x] APScheduler daily market data sync

### v1.1 — Planned

- [ ] Real payment gateway (Razorpay / PayU)
- [ ] SMS OTP via AWS SNS
- [ ] Customer marketplace (buy from cold storage)
- [ ] Farmer product listings
- [ ] Redis caching layer for high-traffic queries
- [ ] WebSocket notifications (real-time booking updates)

### v2.0 — Future

- [ ] Farmer-to-Farmer cooperation (FPO groups)
- [ ] Delivery management system with live tracking
- [ ] Advanced analytics dashboard (operator + admin)
- [ ] Mobile app (React Native)
- [ ] Offline-first support (PWA)
- [ ] AI-powered price forecasting per district
- [ ] Multi-state expansion beyond Maharashtra

---

## 📊 Success Metrics

| Category | Metric | MVP Target |
|---|---|---|
| User Adoption | Active farmers in closed beta | 50+ (Month 1) |
| User Adoption | Cold storages registered | 5–10 (Month 1) |
| Conversion | Booking completion rate | > 50% |
| Conversion | Payment completion rate | > 70% |
| Engagement | Avg. booking duration | ≥ 7 days |
| Engagement | Repeat booking rate | > 30% (Month 2+) |
| Quality | Spoilage risk accuracy | > 80% |
| Ops | Platform uptime | 99.5% |
| Ops | Booking approval time | < 2 hours |

**Validation Gate:** If payment completion > 70% and repeat booking > 20% by end of Month 2 → proceed to v1.1 (Razorpay + customer marketplace). If < 50% → iterate on UX.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

<div align="center">
Built with ❤️ for Indian farmers — reducing post-harvest losses, one booking at a time.
</div>



























🚀 Proud to share that our team was selected among the Top 30 teams out of 381 teams across India in a national-level innovation competition.

During the 24-hour *HACKOUTSAV* hackathon hosted by DYPSEM, Kolhapur, we built *FasalNet* — an AI-powered agritech and market intelligence platform focused on reducing post-harvest losses and enabling smarter decision-making for farmers through predictive analytics and real-time market insights.

The goal was to address real agricultural challenges that continue to impact rural supply chains:
• 20–40% post-harvest losses
• Limited cold storage accessibility
• Low market transparency
• Lack of reliable forecasting tools for crop pricing

Rather than building a conventional CRUD application, we focused on creating a scalable, data-driven decision-support system with practical real-world impact.

Key platform features:
🔹 Cold storage discovery and booking
🔹 Spoilage risk prediction using ML
🔹 Smart storage recommendations
🔹 Live APMC market price tracking
🔹 ARIMA-based price forecasting
🔹 Interactive dashboards and predictive analytics

One of the core highlights was the *Market Intelligence & Forecasting Module*, which contributed nearly 40% of the platform’s analytical capabilities through commodity trend analysis, forecast visualization, and predictive insights.

Built using:
React • Flask • PostgreSQL • Machine Learning • ARIMA Forecasting • Geolocation APIs • Data Visualization

What made this experience valuable was the opportunity to combine engineering, product thinking, and rapid execution under strict time constraints while building something beyond a demo project.

Big thanks to my teammates — Rohan ,  Shivtej , and  Vinay — for the collaboration and execution throughout the hackathon.

🔗 Deployment Preview:
fasal-net.vercel.app

Grateful to the mentors and organizers of HACKOUTSAV for creating a strong environment for innovation and problem-solving. Looking forward to improving and deploying FasalNet further. 🌱

#Hackathon #HACKOUTSAV #FasalNet #AgriTech #MachineLearning #ARIMA #AI #DataScience #ReactJS #Flask #PostgreSQL #PredictiveAnalytics #SoftwareEngineering #TechForGood #Innovation
