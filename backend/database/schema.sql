-- FasalNet v4 — Complete Schema
-- Run: psql -U postgres -d fasalnet -f backend\database\schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe enum additions (idempotent)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer','operator','customer','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fpo';

DO $$ BEGIN
  CREATE TYPE storage_status AS ENUM ('available','full','maintenance','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending','confirmed','rejected','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('SAFE','RISKY','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cap_reason AS ENUM ('booking','manual','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  phone         VARCHAR(15)   UNIQUE NOT NULL,
  email         VARCHAR(180)  UNIQUE,
  password_hash TEXT          NOT NULL,
  role          user_role     NOT NULL DEFAULT 'farmer',
  language      VARCHAR(5)    NOT NULL DEFAULT 'en',
  district      VARCHAR(100),
  state         VARCHAR(100),
  last_active   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Crops
CREATE TABLE IF NOT EXISTS crops (
  id                   SERIAL       PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL UNIQUE,
  shelf_life_hrs       INTEGER      NOT NULL,
  max_safe_temp_c      FLOAT        NOT NULL,
  optimal_humidity_pct FLOAT,
  risk_coefficient     FLOAT        NOT NULL DEFAULT 1.0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Storages
CREATE TABLE IF NOT EXISTS storages (
  id                    SERIAL        PRIMARY KEY,
  operator_id           INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  name                  VARCHAR(200)  NOT NULL,
  address               TEXT,
  district              VARCHAR(100),
  state                 VARCHAR(100),
  lat                   NUMERIC(10,7) NOT NULL,
  lon                   NUMERIC(10,7) NOT NULL,
  total_capacity_kg     NUMERIC(12,2) NOT NULL,
  available_capacity_kg NUMERIC(12,2) NOT NULL,
  price_per_kg_per_day  NUMERIC(8,2)  NOT NULL DEFAULT 2.00,
  temp_min_celsius      NUMERIC(5,1)  DEFAULT 2.0,
  temp_max_celsius      NUMERIC(5,1)  DEFAULT 8.0,
  status                storage_status NOT NULL DEFAULT 'available',
  verified              BOOLEAN       NOT NULL DEFAULT false,
  contact_phone         VARCHAR(15),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Products (farmer uploads, stored in cold storage)
CREATE TABLE IF NOT EXISTS products (
  id              SERIAL        PRIMARY KEY,
  farmer_id       INTEGER       NOT NULL REFERENCES users(id),
  storage_id      INTEGER       REFERENCES storages(id),
  name            VARCHAR(200)  NOT NULL,
  category        VARCHAR(100),
  description     TEXT,
  price_per_kg    NUMERIC(10,2) NOT NULL,
  quantity_kg     NUMERIC(12,2) NOT NULL,
  available_kg    NUMERIC(12,2) NOT NULL,
  harvest_age_days INTEGER      DEFAULT 0,
  risk_level      risk_level    DEFAULT 'SAFE',
  image_emoji     VARCHAR(10)   DEFAULT '🌾',
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Bookings (farmer <-> storage)
CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL        PRIMARY KEY,
  farmer_id        INTEGER       NOT NULL REFERENCES users(id),
  storage_id       INTEGER       NOT NULL REFERENCES storages(id),
  crop_type        VARCHAR(100)  NOT NULL,
  quantity_kg      NUMERIC(12,2) NOT NULL,
  harvest_age_days INTEGER       NOT NULL,
  risk             risk_level    NOT NULL DEFAULT 'SAFE',
  pickup_date      DATE          NOT NULL,
  duration_days    INTEGER       NOT NULL DEFAULT 7,
  total_price      NUMERIC(12,2),
  status           booking_status NOT NULL DEFAULT 'pending',
  operator_notes   TEXT,
  farmer_lat       NUMERIC(10,7),
  farmer_lng       NUMERIC(10,7),
  expires_at       TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Customer Orders
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL        PRIMARY KEY,
  customer_id     INTEGER       NOT NULL REFERENCES users(id),
  product_id      INTEGER       REFERENCES products(id),
  storage_id      INTEGER       REFERENCES storages(id),
  product_name    VARCHAR(200)  NOT NULL,
  quantity_kg     NUMERIC(12,2) NOT NULL,
  price_per_kg    NUMERIC(10,2) NOT NULL,
  total_amount    NUMERIC(12,2) NOT NULL,
  delivery_date   DATE,
  status          booking_status NOT NULL DEFAULT 'pending',
  operator_notes  TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL        PRIMARY KEY,
  order_id        INTEGER       NOT NULL REFERENCES orders(id),
  customer_id     INTEGER       NOT NULL REFERENCES users(id),
  amount          NUMERIC(12,2) NOT NULL,
  method          VARCHAR(50)   NOT NULL DEFAULT 'upi',
  status          payment_status NOT NULL DEFAULT 'pending',
  txn_id          VARCHAR(100),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Capacity Log
CREATE TABLE IF NOT EXISTS capacity_log (
  id              SERIAL        PRIMARY KEY,
  storage_id      INTEGER       NOT NULL REFERENCES storages(id),
  changed_by      INTEGER       REFERENCES users(id),
  old_capacity_kg NUMERIC(12,2) NOT NULL,
  new_capacity_kg NUMERIC(12,2) NOT NULL,
  reason          cap_reason    NOT NULL DEFAULT 'manual',
  booking_id      INTEGER       REFERENCES bookings(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id),
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        VARCHAR(50)  DEFAULT 'info',
  is_read     BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storages_district  ON storages(district);
CREATE INDEX IF NOT EXISTS idx_storages_status    ON storages(status);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer    ON bookings(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_storage   ON bookings(storage_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer    ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_storage     ON orders(storage_id);
CREATE INDEX IF NOT EXISTS idx_payments_order     ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_products_farmer    ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Seed crops
INSERT INTO crops (name, shelf_life_hrs, max_safe_temp_c, optimal_humidity_pct, risk_coefficient) VALUES
  ('Tomato',72,15,90,1.5),('Onion',1440,25,70,0.8),('Potato',720,10,85,0.9),
  ('Mango',192,12,90,1.4),('Banana',144,13,85,1.3),('Grapes',336,0,90,1.2),
  ('Cauliflower',168,8,90,1.3),('Leafy Greens',72,4,95,2.0),
  ('Rice',2160,25,65,0.7),('Wheat',4320,20,60,0.6),('Maize',960,20,70,0.8)
ON CONFLICT (name) DO NOTHING;

-- Seed storages
INSERT INTO storages (name,address,district,state,lat,lon,total_capacity_kg,available_capacity_kg,price_per_kg_per_day,temp_min_celsius,temp_max_celsius,status,verified,contact_phone) VALUES
  ('GreenGrain Cold Store','Kagal Road, Kolhapur','Kolhapur','Maharashtra',16.705,74.243,50000,22000,1.80,2,8,'available',true,'9800000001'),
  ('AgroKool Facility','Hatkanangle, Kolhapur','Kolhapur','Maharashtra',16.695,74.265,80000,45000,2.10,3,10,'available',true,'9800000002'),
  ('Sahyadri Cold Hub','Jaysingpur, Kolhapur','Kolhapur','Maharashtra',16.720,74.220,30000,5000,1.50,2,8,'available',false,'9800000003'),
  ('FreshChain Storage','Ichalkaranji, Kolhapur','Kolhapur','Maharashtra',16.680,74.290,60000,38000,2.50,1,6,'available',true,'9800000004'),
  ('Vaibhav Cold Warehouse','Karveer, Kolhapur','Kolhapur','Maharashtra',16.740,74.200,40000,15000,1.90,2,8,'available',false,'9800000005')
ON CONFLICT DO NOTHING;
