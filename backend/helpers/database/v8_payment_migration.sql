-- FasalNet v8 — Payment + Delivery Migration
-- Run: psql -U postgres -d fasalnet -f backend/database/v8_payment_migration.sql

-- 1. Add 'paid' to booking_status enum
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add 'delivery_boy' to user_role enum (if not added by v7)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_boy';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create payment_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Create booking_payments table (tracks payments per booking)
CREATE TABLE IF NOT EXISTS booking_payments (
  id          SERIAL        PRIMARY KEY,
  booking_id  INTEGER       NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  farmer_id   INTEGER       NOT NULL REFERENCES users(id),
  amount      NUMERIC(12,2) NOT NULL,
  method      VARCHAR(50)   NOT NULL DEFAULT 'upi',
  txn_id      VARCHAR(100),
  status      payment_status NOT NULL DEFAULT 'paid',
  paid_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_farmer  ON booking_payments(farmer_id);

-- 5. Add delivery_address column to orders
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Ensure delivery_status enum exists
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('assigned','picked_up','in_transit','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Ensure deliveries table exists (from v7)
CREATE TABLE IF NOT EXISTS deliveries (
  id                SERIAL          PRIMARY KEY,
  order_id          INTEGER         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_boy_id   INTEGER         NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status            delivery_status NOT NULL DEFAULT 'assigned',
  assigned_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  picked_up_at      TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_order        ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_boy ON deliveries(delivery_boy_id, status);

-- 8. Add in_transit / delivered to booking_status
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_transit';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'delivered';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE booking_payments IS 'Tracks dummy payment transactions for farmer bookings';
COMMENT ON COLUMN bookings.status IS 'pending → confirmed → paid | rejected | cancelled | expired';
