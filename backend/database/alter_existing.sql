-- Run this ONLY if you already ran the v3 schema and just need the customer role added
-- psql -U postgres -d fasalnet -f backend\database\alter_existing.sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fpo';
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY, order_id INTEGER, customer_id INTEGER,
  amount NUMERIC(12,2), method VARCHAR(50) DEFAULT 'upi',
  status VARCHAR(20) DEFAULT 'pending', txn_id VARCHAR(100),
  paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL,
  product_id INTEGER, storage_id INTEGER,
  product_name VARCHAR(200) NOT NULL, quantity_kg NUMERIC(12,2),
  price_per_kg NUMERIC(10,2), total_amount NUMERIC(12,2),
  delivery_date DATE, status VARCHAR(30) DEFAULT 'pending',
  operator_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- v6 additions: delivery_address for customer orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT '';

-- Ensure notifications table has correct structure
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id),
  title       VARCHAR(200) NOT NULL,
  message     TEXT,
  type        VARCHAR(50)  DEFAULT 'info',
  is_read     BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
