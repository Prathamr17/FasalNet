-- FasalNet v7 — Delivery Boy Module Migration
-- Run: psql -U postgres -d fasalnet -f backend/database/v7_delivery_migration.sql

-- Add delivery_boy role to user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_boy';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create delivery status enum
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('assigned','picked_up','in_transit','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id                SERIAL        PRIMARY KEY,
  order_id          INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_boy_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status            delivery_status NOT NULL DEFAULT 'assigned',
  assigned_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  picked_up_at      TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Add indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_boy ON deliveries(delivery_boy_id, status);

-- Add 'delivered' and 'in_transit' to booking_status enum (used by orders table)
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_transit';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'delivered';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure products table has all necessary columns (idempotent)
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS district VARCHAR(100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update products with district from storage if missing
UPDATE products p
SET district = s.district
FROM storages s
WHERE p.storage_id = s.id
  AND p.district IS NULL;

COMMENT ON TABLE deliveries IS 'Delivery assignments linking orders to delivery personnel';
COMMENT ON COLUMN deliveries.status IS 'Current status: assigned, picked_up, in_transit, delivered, failed';
